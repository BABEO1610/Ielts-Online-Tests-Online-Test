import { describe, it, expect } from 'vitest';
import { roundToNearestHalf, formatIeltsBandScore, calculatePreviewBand } from '../../src/utils/ieltsScoring';

describe('ieltsScoring utility', () => {
  describe('roundToNearestHalf', () => {
    it('rounds numbers according to IELTS half-band standards', () => {
      expect(roundToNearestHalf(6.333333)).toBe(6.5);
      expect(roundToNearestHalf(6.125)).toBe(6.0);
      expect(roundToNearestHalf(6.25)).toBe(6.5);
      expect(roundToNearestHalf(6.75)).toBe(7.0);
      expect(roundToNearestHalf(6.875)).toBe(7.0);
      expect(roundToNearestHalf(6.0)).toBe(6.0);
    });

    it('handles invalid inputs gracefully', () => {
      expect(roundToNearestHalf(null)).toBe(null);
      expect(roundToNearestHalf(undefined)).toBe(null);
      expect(roundToNearestHalf('invalid')).toBe(null);
    });
  });

  describe('formatIeltsBandScore', () => {
    it('formats numbers into IELTS band score strings with 1 decimal place', () => {
      expect(formatIeltsBandScore(6.333333)).toBe('6.5');
      expect(formatIeltsBandScore(6.125)).toBe('6.0');
      expect(formatIeltsBandScore(6.75)).toBe('7.0');
      expect(formatIeltsBandScore(7)).toBe('7.0');
    });

    it('returns dash for invalid or null inputs', () => {
      expect(formatIeltsBandScore(null)).toBe('—');
      expect(formatIeltsBandScore(undefined)).toBe('—');
    });
  });

  describe('calculatePreviewBand', () => {
    it('calculates average preview band with half-band rounding', () => {
      expect(calculatePreviewBand([6, 6, 6, 7])).toBe(6.5);
      expect(calculatePreviewBand([6, 7, 7, 7])).toBe(7.0);
      expect(calculatePreviewBand([])).toBe(0);
    });
  });
});
