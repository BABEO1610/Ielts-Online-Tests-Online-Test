const { roundToNearestHalf } = require('../../../src/utils/scoring');

describe('scoring utilities', () => {
  it('rounds Writing overall scores to the nearest IELTS half band', () => {
    expect(roundToNearestHalf(5.24)).toBe(5.0);
    expect(roundToNearestHalf(5.25)).toBe(5.5);
    expect(roundToNearestHalf((6.0 + 7.0 * 2) / 3)).toBe(6.5);
  });
});
