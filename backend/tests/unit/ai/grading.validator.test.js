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
});
