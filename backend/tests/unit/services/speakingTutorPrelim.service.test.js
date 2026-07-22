const crypto = require('node:crypto');
const {
  SpeakingTutorPrelimService,
} = require('../../../src/services/speakingTutorPrelim.service');

describe('SpeakingTutorPrelimService', () => {
  test('returns an editable AI draft without changing submission ownership or status', async () => {
    const audio = Buffer.from('audio');
    const hash = crypto.createHash('sha256').update(audio).digest('hex');
    const parts = [1, 2, 3].map((part_number) => ({
      id: `part-${part_number}`,
      part_number,
      user_id: 'student-1',
      speaking_group_id: 'group-1',
      prompt_text: `Prompt ${part_number}`,
      audio_storage_key: `audio-${part_number}`,
      declared_audio_sha256: hash,
    }));
    const pool = { query: jest.fn().mockResolvedValue({ rows: parts }) };
    const scorer = { score: jest.fn().mockResolvedValue({
      result: { overall_band: 6.5, criteria: {}, part_feedback: [] },
      provider: { modelName: 'gemini-3.6-flash' },
    }) };
    const service = new SpeakingTutorPrelimService({
      pool,
      storage: { downloadObject: jest.fn().mockResolvedValue(audio) },
      normalizer: { normalize: jest.fn().mockResolvedValue({
        buffer: audio,
        contentType: 'audio/wav',
        quality: { warnings: [] },
      }) },
      transcriber: { transcribe: jest.fn().mockResolvedValue({
        asrTranscript: 'Transcript',
        displayTranscript: 'Transcript',
      }) },
      speechEvidence: { analyze: jest.fn().mockResolvedValue({
        status: 'sufficient',
        fluencyMetrics: { delivery_summary: 'Ổn.' },
        pronunciationEvidence: { evidence_summary: 'Rõ.' },
      }) },
      scorer,
    });

    await expect(service.run('group-1', {
      userId: 'tutor-1',
      requesterRole: 'tutor',
    })).resolves.toMatchObject({ result: { overall_band: 6.5 } });
    expect(scorer.score).toHaveBeenCalledWith(expect.objectContaining({
      artifacts: expect.arrayContaining([
        expect.objectContaining({ status: 'complete', asr_transcript: 'Transcript' }),
      ]),
    }));
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(String(pool.query.mock.calls[0][0])).not.toMatch(/UPDATE|INSERT/i);
  });
});
