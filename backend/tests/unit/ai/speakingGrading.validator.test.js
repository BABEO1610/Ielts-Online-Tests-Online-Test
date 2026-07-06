const { validateSpeakingGradingResponse } = require('../../../src/ai/speakingGrading.validator');

describe('speaking grading validator', () => {
  it('normalizes Speaking criteria and computes the reference band', () => {
    const result = validateSpeakingGradingResponse(JSON.stringify({
      partNumber: null,
      overallBand: 6.25,
      criteria: {
        fluencyCoherence: { band: 6, feedback: 'Khá mạch lạc.' },
        lexicalResource: { band: 6.5, feedback: 'Từ vựng đủ dùng.' },
        grammaticalRangeAccuracy: { band: 6, feedback: 'Có lỗi ngữ pháp.' },
        pronunciation: { band: 6, feedback: 'Ước lượng từ transcript.' },
      },
      summary: 'Bài nói khá rõ nhưng còn lỗi.',
      strengths: ['Có phát triển ý.'],
      weaknesses: ['Còn lặp từ.'],
      majorErrors: [],
      detailedFeedback: {},
      actionPlan: ['Luyện nối ý.'],
      nextStudyAdvice: 'Nghe lại audio để xác minh pronunciation.',
      transcriptNotes: 'Pronunciation chỉ là ước lượng từ transcript.',
    }));

    expect(result.success).toBe(true);
    expect(result.data.overallBand).toBe(6);
    expect(result.data.computedBand).toBe(6);
    expect(result.data.criteria.pronunciation.band).toBe(6);
  });

  it('rejects responses missing required Speaking criteria', () => {
    const result = validateSpeakingGradingResponse(JSON.stringify({
      partNumber: 1,
      overallBand: 6,
      criteria: {
        fluencyCoherence: { band: 6 },
      },
    }));

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Missing criteria.pronunciation');
  });
});
