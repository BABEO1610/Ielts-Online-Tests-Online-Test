import { describe, expect, it } from 'vitest';
import {
  calculateOverallWritingBand,
  getScoreBadge,
  getWritingCriterionLabel,
} from '../../../src/components/grading/writingFeedback.helpers';

describe('writingFeedback.helpers', () => {
  it('maps the first writing criterion by task number', () => {
    expect(getWritingCriterionLabel(1, 'taskAchievementOrResponse')).toBe('Task Achievement');
    expect(getWritingCriterionLabel(2, 'taskAchievementOrResponse')).toBe('Task Response');
    expect(getWritingCriterionLabel(undefined, 'taskAchievementOrResponse')).toBe('Task Achievement / Response');
  });

  it('maps score badges by IELTS band thresholds', () => {
    expect(getScoreBadge(7.0)).toEqual({ label: 'Tốt', tone: 'good' });
    expect(getScoreBadge(6.5)).toEqual({ label: 'Trung bình', tone: 'average' });
    expect(getScoreBadge(5.5)).toEqual({ label: 'Cần cải thiện', tone: 'weak' });
  });

  it('calculates Academic Writing overall band with 33/67 weighting and one decimal', () => {
    expect(calculateOverallWritingBand(6.5, 7.5)).toBe(7.2);
    expect(calculateOverallWritingBand(6.5, null)).toBeNull();
  });
});
