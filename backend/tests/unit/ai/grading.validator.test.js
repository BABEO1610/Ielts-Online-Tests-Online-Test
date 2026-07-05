jest.mock('../../../src/utils/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
}));

const {
  normalizeBand,
  validateGradingResponse,
} = require('../../../src/ai/grading.validator');

const buildResponse = (overrides = {}) => JSON.stringify({
  overallBand: overrides.overallBand ?? 5.5,
  criteria: {
    taskAchievementOrResponse: { band: overrides.ta ?? 5.5, feedback: 'TA' },
    coherenceCohesion: { band: overrides.cc ?? 5.0, feedback: 'CC' },
    lexicalResource: { band: overrides.lr ?? 5.5, feedback: 'LR' },
    grammarRangeAccuracy: { band: overrides.gra ?? 5.0, feedback: 'GRA' },
  },
  strengths: ['clear structure'],
  weaknesses: ['limited support'],
  majorErrors: [],
  improvedVersion: 'Improved essay.',
  nextStudyAdvice: 'Practice planning.',
});

describe('grading.validator', () => {
  it('normalizes bands to IELTS half-band steps', () => {
    expect(normalizeBand(5.3, 'band').value).toBe(5.5);
    expect(normalizeBand(5.2, 'band').value).toBe(5.0);
    expect(normalizeBand('5.5', 'band').value).toBe(5.5);
    expect(normalizeBand(6.24, 'band').value).toBe(6.0);
    expect(normalizeBand(6.25, 'band').value).toBe(6.5);
  });

  it('rejects bands outside 0-9', () => {
    expect(normalizeBand(10, 'band').error).toContain('outside 0-9');
    expect(normalizeBand(-1, 'band').error).toContain('outside 0-9');
  });

  it('computes overall band from normalized criteria', () => {
    const result = validateGradingResponse(buildResponse({
      overallBand: 5.5,
      ta: 5.3,
      cc: 5.2,
      lr: 5.5,
      gra: 5.0,
    }));

    expect(result.success).toBe(true);
    expect(result.data.criteria.taskAchievementOrResponse.band).toBe(5.5);
    expect(result.data.criteria.coherenceCohesion.band).toBe(5.0);
    expect(result.data.computedBand).toBe(5.5);
  });

  it('warns but does not reject when overall differs from computed band', () => {
    const result = validateGradingResponse(buildResponse({
      overallBand: 7.0,
      ta: 5.0,
      cc: 5.0,
      lr: 5.0,
      gra: 5.0,
    }));

    expect(result.success).toBe(true);
    expect(result.data.computedBand).toBe(5.0);
    expect(result.data.bandValidationWarning).toContain('deviates');
  });

  it('preserves task metadata and expanded feedback sections', () => {
    const result = validateGradingResponse(JSON.stringify({
      taskNumber: 2,
      overallBand: 6.0,
      criteria: {
        taskAchievementOrResponse: { band: 6.0, feedback: 'TR feedback' },
        coherenceCohesion: { band: 6.0, feedback: 'CC feedback' },
        lexicalResource: { band: 6.0, feedback: 'LR feedback' },
        grammarRangeAccuracy: { band: 6.0, feedback: 'GRA feedback' },
      },
      summary: 'Summary',
      strengths: ['Clear position'],
      weaknesses: ['Needs more support'],
      majorErrors: [
        { original: 'bad phrase', issue: 'unclear', suggestion: 'clear phrase' },
      ],
      detailedFeedback: {
        taskAchievementOrResponse: 'Detailed TR',
        coherenceCohesion: 'Detailed CC',
        lexicalResource: 'Detailed LR',
        grammarRangeAccuracy: 'Detailed GRA',
      },
      improvedVersion: 'Improved essay.',
      vocabularySuggestions: [
        { original: 'good', better: 'beneficial', reason: 'More precise' },
      ],
      grammarCorrections: [
        { original: 'he go', corrected: 'he goes', explanation: 'Subject-verb agreement' },
      ],
      actionPlan: ['Plan before writing'],
      nextStudyAdvice: 'Practice outlines.',
    }));

    expect(result.success).toBe(true);
    expect(result.data.taskNumber).toBe(2);
    expect(result.data.majorErrors[0]).toEqual({
      error: 'bad phrase',
      explanation: 'unclear',
      correction: 'clear phrase',
    });
    expect(result.data.detailedFeedback.lexicalResource).toBe('Detailed LR');
    expect(result.data.vocabularySuggestions).toHaveLength(1);
    expect(result.data.grammarCorrections).toHaveLength(1);
    expect(result.data.actionPlan).toEqual(['Plan before writing']);
  });
});
