/**
 * @file backend/src/ai/grading.validator.js
 * Parses, validates, and normalizes AI grading responses.
 * No DB queries, no AI calls.
 */

const logger = require('../utils/logger');

/**
 * Round a number to the nearest 0.5 step.
 * Example: 5.2 → 5.0, 5.3 → 5.5, 6.25 → 6.5
 */
const roundToHalf = (value) => Math.round(value * 2) / 2;

/**
 * Parse a band value from various types to a number.
 * Returns null if unparseable.
 */
const parseBand = (raw) => {
  if (raw === null || raw === undefined) return null;
  const num = Number(raw);
  if (Number.isNaN(num)) return null;
  return num;
};

/**
 * Validate a band is within 0-9. Returns true if valid.
 */
const isBandInRange = (band) =>
  typeof band === 'number' && band >= 0 && band <= 9;

const arrayOrEmpty = (value) => (Array.isArray(value) ? value : []);

const stringOrEmpty = (value) =>
  typeof value === 'string' ? value : '';

/**
 * Normalize a single band score: parse → range check → round to 0.5.
 * Returns { value, wasRounded, error }.
 */
const normalizeBand = (raw, fieldName) => {
  const parsed = parseBand(raw);
  if (parsed === null) {
    return { value: null, wasRounded: false, error: `${fieldName}: unparseable` };
  }
  if (!isBandInRange(parsed)) {
    return { value: null, wasRounded: false, error: `${fieldName}: ${parsed} outside 0-9` };
  }
  const rounded = roundToHalf(parsed);
  const wasRounded = rounded !== parsed;
  if (wasRounded) {
    logger.warn(`Band normalized: ${fieldName} ${parsed} → ${rounded}`);
  }
  return { value: rounded, wasRounded, error: null };
};

/**
 * Compute overall band from 4 criteria averages, rounded to 0.5.
 */
const computeBandFromCriteria = (criteria) => {
  const { ta, cc, lr, gra } = criteria;
  const avg = (ta + cc + lr + gra) / 4;
  return roundToHalf(avg);
};

/**
 * Extract JSON from raw AI text. Tries direct parse first,
 * then looks for JSON object pattern in the text.
 */
const extractJson = (rawText) => {
  const trimmed = String(rawText || '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Try to find JSON object in text
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    return null;
  }
};

/**
 * Validate and normalize the full AI grading response.
 * Returns { success, data, errors }.
 */
const validateGradingResponse = (rawText) => {
  const parsed = extractJson(rawText);
  if (!parsed) {
    return { success: false, data: null, errors: ['Invalid JSON'] };
  }

  const errors = [];
  const c = parsed.criteria || {};
  if (
    parsed.taskNumber !== undefined
    && ![1, 2].includes(Number(parsed.taskNumber))
  ) {
    errors.push('taskNumber must be 1 or 2');
  }

  // Validate required criteria exist
  const requiredCriteria = [
    'taskAchievementOrResponse',
    'coherenceCohesion',
    'lexicalResource',
    'grammarRangeAccuracy',
  ];
  for (const key of requiredCriteria) {
    if (!c[key]) errors.push(`Missing criteria.${key}`);
  }
  if (errors.length > 0) {
    return { success: false, data: null, errors };
  }

  // Normalize all bands
  const bands = {
    overall: normalizeBand(parsed.overallBand, 'overallBand'),
    ta: normalizeBand(c.taskAchievementOrResponse?.band, 'TA/TR'),
    cc: normalizeBand(c.coherenceCohesion?.band, 'CC'),
    lr: normalizeBand(c.lexicalResource?.band, 'LR'),
    gra: normalizeBand(c.grammarRangeAccuracy?.band, 'GRA'),
  };

  // Check for fatal band errors (outside 0-9 or unparseable)
  for (const [key, result] of Object.entries(bands)) {
    if (result.error) errors.push(result.error);
  }
  if (errors.length > 0) {
    return { success: false, data: null, errors };
  }

  return buildNormalizedResult(parsed, bands);
};

const buildNormalizedResult = (parsed, bands) => {
  const computedBand = computeBandFromCriteria({
    ta: bands.ta.value,
    cc: bands.cc.value,
    lr: bands.lr.value,
    gra: bands.gra.value,
  });

  let bandWarning = null;
  const deviation = Math.abs(bands.overall.value - computedBand);
  if (deviation > 0.5) {
    bandWarning = `AI overallBand ${bands.overall.value} deviates `
      + `from computed ${computedBand} by ${deviation}`;
    logger.warn(bandWarning);
  }

  const c = parsed.criteria;
  return {
    success: true,
    errors: [],
    data: {
      overallBand: bands.overall.value,
      taskNumber: parsed.taskNumber ? Number(parsed.taskNumber) : null,
      computedBand,
      bandValidationWarning: bandWarning,
      criteria: {
        taskAchievementOrResponse: {
          band: bands.ta.value,
          feedback: stringOrEmpty(c.taskAchievementOrResponse?.feedback),
        },
        coherenceCohesion: {
          band: bands.cc.value,
          feedback: stringOrEmpty(c.coherenceCohesion?.feedback),
        },
        lexicalResource: {
          band: bands.lr.value,
          feedback: stringOrEmpty(c.lexicalResource?.feedback),
        },
        grammarRangeAccuracy: {
          band: bands.gra.value,
          feedback: stringOrEmpty(c.grammarRangeAccuracy?.feedback),
        },
      },
      summary: stringOrEmpty(parsed.summary),
      strengths: arrayOrEmpty(parsed.strengths),
      weaknesses: arrayOrEmpty(parsed.weaknesses),
      majorErrors: arrayOrEmpty(parsed.majorErrors).map(error => ({
        error: error.quote || error.error || error.original || error.text || '',
        explanation: error.problem || error.explanation || error.issue || '',
        correction: error.correction || error.corrected || error.suggestion || '',
      })),
      detailedFeedback: {
        taskAchievementOrResponse: stringOrEmpty(parsed.detailedFeedback?.taskAchievementOrResponse)
          || stringOrEmpty(c.taskAchievementOrResponse?.feedback),
        coherenceCohesion: stringOrEmpty(parsed.detailedFeedback?.coherenceCohesion)
          || stringOrEmpty(c.coherenceCohesion?.feedback),
        lexicalResource: stringOrEmpty(parsed.detailedFeedback?.lexicalResource)
          || stringOrEmpty(c.lexicalResource?.feedback),
        grammarRangeAccuracy: stringOrEmpty(parsed.detailedFeedback?.grammarRangeAccuracy)
          || stringOrEmpty(c.grammarRangeAccuracy?.feedback),
      },
      improvedVersion: stringOrEmpty(parsed.improvedVersion),
      vocabularySuggestions: arrayOrEmpty(parsed.vocabularySuggestions),
      grammarCorrections: arrayOrEmpty(parsed.grammarCorrections),
      actionPlan: arrayOrEmpty(parsed.actionPlan),
      nextStudyAdvice: stringOrEmpty(parsed.nextStudyAdvice),
      wordCountFeedback: parsed.wordCountFeedback || null,
      disclaimer: stringOrEmpty(parsed.disclaimer) || 'AI score is an estimated IELTS band.',
    },
  };
};

module.exports = {
  validateGradingResponse,
  roundToHalf,
  normalizeBand,
  computeBandFromCriteria,
  extractJson,
};
