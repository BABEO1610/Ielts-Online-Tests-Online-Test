const {
  GeminiSpeakingRubricScorer,
} = require('../../../src/ai/speakingRubricScorer.adapter');

const gradingResult = {
  overallBand: 6.5,
  criteria: {
    fluencyCoherence: { band: 6.5, feedback: 'Nhịp nói khá ổn.' },
    lexicalResource: { band: 6.5, feedback: 'Từ vựng phù hợp.' },
    grammaticalRangeAccuracy: { band: 6, feedback: 'Còn lỗi câu phức.' },
    pronunciation: { band: 6.5, feedback: 'Phần lớn dễ hiểu.' },
  },
  partFeedback: [1, 2, 3].map((partNumber) => ({
    partNumber,
    summary: `Nhận xét Part ${partNumber}`,
    strengths: [],
    weaknesses: [],
  })),
  modelName: 'gemini-3.6-flash',
  promptVersion: 'speaking-audio-evidence-v1',
};

describe('GeminiSpeakingRubricScorer', () => {
  test('builds a full four-criterion estimated result from transcripts and audio evidence', async () => {
    const gradeFromEvidence = jest.fn().mockResolvedValue(gradingResult);
    const scorer = new GeminiSpeakingRubricScorer({ gradeFromEvidence });
    const artifacts = [1, 2, 3].map((partNumber) => ({
      id: `artifact-${partNumber}`,
      part_number: partNumber,
      status: 'complete',
      asr_transcript: `Transcript ${partNumber}`,
      display_transcript: `Transcript ${partNumber}`,
      audio_quality_json: { warnings: [] },
      fluency_metrics_json: { delivery_summary: 'Ổn định.' },
      pronunciation_evidence_json: { evidence_summary: 'Dễ hiểu.' },
    }));

    const candidate = await scorer.score({
      artifacts,
      parts: [1, 2, 3].map((part_number) => ({ part_number, prompt_text: `Prompt ${part_number}` })),
      job: { id: 'job-1', user_id: 'user-1', pipeline_version: 'speaking-v2' },
    });

    expect(gradeFromEvidence).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        part_number: 1,
        asr_transcript: 'Transcript 1',
        fluency_metrics: expect.any(Object),
        pronunciation_evidence: expect.any(Object),
      }),
    ]), expect.objectContaining({ usageContext: expect.objectContaining({ entityId: 'job-1' }) }));
    expect(candidate.result).toMatchObject({
      assessment_type: 'estimated',
      evidence_mode: 'full_audio',
      is_partial_assessment: false,
      requires_human_review: false,
      criteria: {
        fluency_coherence: { band: 6.5, evidence_status: 'sufficient' },
        lexical_resource: { band: 6.5, evidence_status: 'sufficient' },
        grammatical_range_accuracy: { band: 6, evidence_status: 'sufficient' },
        pronunciation: { band: 6.5, evidence_status: 'sufficient' },
      },
    });
    expect(candidate.result.part_feedback).toHaveLength(3);
    expect(candidate.provider).toMatchObject({
      modelName: 'gemini-3.6-flash',
      promptVersion: 'speaking-audio-evidence-v1',
    });
  });
});
