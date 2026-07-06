const {
  computeBandFromCriteria,
  extractJson,
  normalizeBand,
} = require('./grading.validator');

const arrayOrEmpty = (value) => (Array.isArray(value) ? value : []);
const stringOrEmpty = (value) => (typeof value === 'string' ? value : '');

const validateSpeakingGradingResponse = (rawText) => {
  const parsed = extractJson(rawText);
  if (!parsed) {
    return { success: false, data: null, errors: ['Invalid JSON'] };
  }

  const errors = [];
  if (
    parsed.partNumber !== null
    && parsed.partNumber !== undefined
    && ![1, 2, 3].includes(Number(parsed.partNumber))
  ) {
    errors.push('partNumber must be 1, 2, or 3');
  }

  const c = parsed.criteria || {};
  const requiredCriteria = [
    'fluencyCoherence',
    'lexicalResource',
    'grammaticalRangeAccuracy',
    'pronunciation',
  ];
  for (const key of requiredCriteria) {
    if (!c[key]) errors.push(`Missing criteria.${key}`);
  }
  if (errors.length > 0) {
    return { success: false, data: null, errors };
  }

  const bands = {
    overall: normalizeBand(parsed.overallBand, 'overallBand'),
    fc: normalizeBand(c.fluencyCoherence?.band, 'FC'),
    lr: normalizeBand(c.lexicalResource?.band, 'LR'),
    gra: normalizeBand(c.grammaticalRangeAccuracy?.band, 'GRA'),
    pr: normalizeBand(c.pronunciation?.band, 'Pronunciation'),
  };

  for (const result of Object.values(bands)) {
    if (result.error) errors.push(result.error);
  }
  if (errors.length > 0) {
    return { success: false, data: null, errors };
  }

  const computedBand = computeBandFromCriteria({
    ta: bands.fc.value,
    cc: bands.lr.value,
    lr: bands.gra.value,
    gra: bands.pr.value,
  });
  const deviation = Math.abs(bands.overall.value - computedBand);
  const bandWarning = deviation > 0.5
    ? `AI overallBand ${bands.overall.value} deviates from computed ${computedBand} by ${deviation}`
    : null;

  return {
    success: true,
    errors: [],
    data: {
      partNumber: parsed.partNumber === null || parsed.partNumber === undefined
        ? null
        : Number(parsed.partNumber),
      overallBand: computedBand,
      computedBand,
      bandValidationWarning: bandWarning
        ? `${bandWarning}; final band uses computed average of 4 Speaking criteria.`
        : null,
      criteria: {
        fluencyCoherence: {
          band: bands.fc.value,
          feedback: stringOrEmpty(c.fluencyCoherence?.feedback),
        },
        lexicalResource: {
          band: bands.lr.value,
          feedback: stringOrEmpty(c.lexicalResource?.feedback),
        },
        grammaticalRangeAccuracy: {
          band: bands.gra.value,
          feedback: stringOrEmpty(c.grammaticalRangeAccuracy?.feedback),
        },
        pronunciation: {
          band: bands.pr.value,
          feedback: stringOrEmpty(c.pronunciation?.feedback),
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
        fluencyCoherence: stringOrEmpty(parsed.detailedFeedback?.fluencyCoherence)
          || stringOrEmpty(c.fluencyCoherence?.feedback),
        lexicalResource: stringOrEmpty(parsed.detailedFeedback?.lexicalResource)
          || stringOrEmpty(c.lexicalResource?.feedback),
        grammaticalRangeAccuracy: stringOrEmpty(parsed.detailedFeedback?.grammaticalRangeAccuracy)
          || stringOrEmpty(c.grammaticalRangeAccuracy?.feedback),
        pronunciation: stringOrEmpty(parsed.detailedFeedback?.pronunciation)
          || stringOrEmpty(c.pronunciation?.feedback),
      },
      partFeedback: arrayOrEmpty(parsed.partFeedback).map(item => ({
        partNumber: Number(item.partNumber),
        summary: stringOrEmpty(item.summary),
        strengths: arrayOrEmpty(item.strengths),
        weaknesses: arrayOrEmpty(item.weaknesses),
      })).filter(item => [1, 2, 3].includes(item.partNumber)),
      actionPlan: arrayOrEmpty(parsed.actionPlan),
      nextStudyAdvice: stringOrEmpty(parsed.nextStudyAdvice),
      transcriptNotes: stringOrEmpty(parsed.transcriptNotes),
      disclaimer: stringOrEmpty(parsed.disclaimer)
        || 'AI Speaking score is transcript-based and should be verified by listening to the audio.',
    },
  };
};

module.exports = { validateSpeakingGradingResponse };
