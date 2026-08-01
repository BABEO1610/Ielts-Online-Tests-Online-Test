jest.mock('../../../src/db/queries/aiGradingJobs.queries', () => ({ finishJob: jest.fn() }));
jest.mock('../../../src/db/queries/speakingAnalysis.queries', () => ({ insertSpeakingReport: jest.fn() }));

const jobQueries = require('../../../src/db/queries/aiGradingJobs.queries');
const analysisQueries = require('../../../src/db/queries/speakingAnalysis.queries');
const {
  SpeakingGradingService,
  buildTranscriptReviewResult,
} = require('../../../src/services/speakingGrading.service');

const makeClient = () => ({
  query: jest.fn(async (sql) => {
    if (sql.includes('SELECT * FROM speaking_submissions')) {
      return { rows: [1, 2, 3].map((part_number) => ({ id: `part-${part_number}`, part_number })) };
    }
    return { rows: [] };
  }),
  release: jest.fn(),
});

const makeReviewResult = () => buildTranscriptReviewResult({
  pipelineVersion: 'v1',
  artifacts: [1, 2, 3].map((part) => ({
    part_number: part,
    display_transcript: `transcript ${part}`,
    audio_quality_json: {},
  })),
  feedback: { part_feedback: [] },
});

const makeFullAudioResult = () => ({
  assessment_type: 'estimated',
  evidence_mode: 'full_audio',
  is_partial_assessment: false,
  requires_human_review: false,
  criteria: Object.fromEntries([
    'fluency_coherence', 'lexical_resource',
    'grammatical_range_accuracy', 'pronunciation',
  ].map((key) => [key, { band: 6.5, evidence_status: 'sufficient', feedback: 'Đạt.' }])),
  part_feedback: [1, 2, 3].map((partNumber) => ({
    part_number: partNumber,
    display_transcript: `Transcript ${partNumber}`,
    feedback: `Feedback ${partNumber}`,
    audio_quality_warnings: [],
  })),
  text_based_feedback: null,
  disclaimer: 'Kết quả đã hiệu chuẩn.',
  pipeline_version: 'provider-controlled',
  calibration_version: 'cal-v1',
  generated_at: '2020-01-01T00:00:00.000Z',
  rawResponse: 'must-not-be-persisted',
});

beforeEach(() => {
  jest.clearAllMocks();
  analysisQueries.insertSpeakingReport.mockResolvedValue({ id: 'report-1' });
});

describe('speaking grading result projection', () => {
  test('transcript-only can never emit any criterion or Overall band', () => {
    const result = buildTranscriptReviewResult({
      pipelineVersion: 'v1',
      artifacts: [1, 2, 3].map((part) => ({
        part_number: part,
        display_transcript: `transcript ${part}`,
        audio_quality_json: {},
      })),
      feedback: {
        lexical_observations: ['Một gợi ý từ vựng.'],
        grammar_observations: ['Một mẫu cần kiểm tra với audio.'],
        coherence_observations: [],
        uncertainty_note: 'ASR có thể sai.',
        part_feedback: [],
      },
    });
    expect(result.evidence_mode).toBe('transcript_only');
    expect(result.overall_band).toBeNull();
    expect(Object.values(result.criteria).every((criterion) => criterion.band === null)).toBe(true);
    expect(result.criteria.pronunciation.feedback).toBeNull();
    expect(result.requires_human_review).toBe(true);
  });

});

describe('speaking grading successful finalization', () => {
  test('commits a review report and terminal job with the active lease', async () => {
    const client = makeClient();
    const pool = { connect: jest.fn().mockResolvedValue(client) };
    const service = new SpeakingGradingService({ pool });
    const job = { id: 'job-1', group_id: 'group-1', user_id: 'user-1', pipeline_version: 'v1' };
    jobQueries.finishJob.mockResolvedValueOnce({ id: 'job-1', status: 'needs_review' });

    const reviewResult = { ...makeReviewResult(), rawResponse: 'must-not-be-persisted' };
    await expect(service.finalizeReview({
      job,
      workerId: 'worker-1',
      generation: 2,
      result: reviewResult,
      provider: { modelName: 'mock-model', promptVersion: 'prompt-v1' },
    })).resolves.toMatchObject({ status: 'needs_review' });

    expect(analysisQueries.insertSpeakingReport).toHaveBeenCalledTimes(1);
    const reportInput = analysisQueries.insertSpeakingReport.mock.calls[0][1];
    expect(reportInput.pipelineVersion).toBe('v1');
    expect(JSON.stringify(reportInput)).not.toContain('must-not-be-persisted');
    expect(jobQueries.finishJob).toHaveBeenCalledWith(client, expect.objectContaining({
      generation: 2,
      jobId: 'job-1',
      status: 'needs_review',
      workerId: 'worker-1',
    }));
    const update = client.query.mock.calls.find(([sql]) => sql.includes('UPDATE speaking_submissions'));
    expect(update[0]).not.toMatch(/grader\s*=\s*'tutor'/i);
    expect(client.query.mock.calls.map(([sql]) => sql)).toEqual(expect.arrayContaining(['BEGIN', 'COMMIT']));
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test('rejects a completed band when estimated-band publication is disabled', () => {
    const service = new SpeakingGradingService({ pool: { connect: jest.fn() } });
    expect(() => service.finalizeCompleted({
      job: { id: 'job-1', pipeline_version: 'v1' },
      result: makeFullAudioResult(),
    })).toThrow(expect.objectContaining({ errorCode: 'SPEAKING_BAND_RELEASE_GATED' }));
  });

  test('persists a validated full-audio estimate without transferring the group to tutor', async () => {
    const client = makeClient();
    const service = new SpeakingGradingService({
      pool: { connect: jest.fn().mockResolvedValue(client) },
      allowBandPublication: true,
    });
    jobQueries.finishJob.mockResolvedValueOnce({ id: 'job-3', status: 'completed' });
    await service.finalizeCompleted({
      job: {
        id: 'job-3', group_id: 'group-3', pipeline_version: 'v1',
        user_id: 'user-1',
      },
      workerId: 'worker-1',
      generation: 3,
      result: makeFullAudioResult(),
      provider: { modelName: 'mock-model' },
    });
    const reportInput = analysisQueries.insertSpeakingReport.mock.calls[0][1];
    expect(reportInput.overallBand).toBe(6.5);
    expect(reportInput.pipelineVersion).toBe('v1');
    expect(JSON.stringify(reportInput)).not.toContain('must-not-be-persisted');
    const update = client.query.mock.calls.find(([sql]) => sql.includes('UPDATE speaking_submissions'));
    expect(update[0]).toMatch(/status = \$2/i);
    expect(update[0]).not.toMatch(/grader = 'tutor'/i);
    expect(update[1]).toEqual(['group-3', 'ai_graded', 'user-1']);
  });

});

describe('speaking grading stale-lease finalization', () => {
  test('rolls back when fencing rejects a stale worker lease', async () => {
    const client = makeClient();
    const service = new SpeakingGradingService({
      pool: { connect: jest.fn().mockResolvedValue(client) },
    });
    jobQueries.finishJob.mockResolvedValueOnce(null);

    await expect(service.finalizeFailed({
      job: { id: 'job-2', group_id: 'group-2', user_id: 'user-1', pipeline_version: 'v1' },
      workerId: 'stale-worker',
      generation: 1,
      provider: { errorCode: 'PROVIDER_TIMEOUT', retryable: true },
    })).rejects.toMatchObject({ errorCode: 'STALE_WORKER_LEASE' });

    expect(analysisQueries.insertSpeakingReport).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
