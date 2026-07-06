const {
  roundToNearestHalf,
  isValidHalfBandScore,
  calcBandFromCriteria,
  calcWeightedWritingOverall,
} = require('../../../src/utils/scoring');

describe('scoring utilities', () => {
  it('rounds Writing overall scores to the nearest IELTS half band', () => {
    expect(roundToNearestHalf(5.24)).toBe(5.0);
    expect(roundToNearestHalf(5.25)).toBe(5.5);
    expect(roundToNearestHalf((6.0 + 7.0 * 2) / 3)).toBe(6.5);
  });

  it('validates IELTS score boundaries and 0.5 steps', () => {
    expect(isValidHalfBandScore(0)).toBe(true);
    expect(isValidHalfBandScore(5.5)).toBe(true);
    expect(isValidHalfBandScore(9)).toBe(true);
    expect(isValidHalfBandScore(5.25)).toBe(false);
    expect(isValidHalfBandScore(-0.5)).toBe(false);
    expect(isValidHalfBandScore(9.5)).toBe(false);
  });

  it('calculates criteria and weighted Writing bands', () => {
    expect(calcBandFromCriteria([6, 6.5, 6, 6.5])).toBe(6.5);
    expect(calcWeightedWritingOverall(6.5, 7.5)).toBe(7.0);
    expect(() => calcBandFromCriteria([6, 6.25, 6, 6])).toThrow('0.5 steps');
  });
});
