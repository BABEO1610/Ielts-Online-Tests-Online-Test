jest.mock('../../../src/db/queries/aiGradingJobs.queries', () => ({
  claimNextJob: jest.fn(),
  heartbeatJob: jest.fn(),
  scheduleRetry: jest.fn(),
}));

const jobQueries = require('../../../src/db/queries/aiGradingJobs.queries');
const { AiGradingWorker, isRetryable } = require('../../../src/jobs/aiGrading.worker');

const job = {
  id: 'job-1', group_id: 'group-1', user_id: 'user-1',
  stage: 'queued', attempt_count: 1, max_attempts: 2, lease_generation: 7,
  pipeline_version: 'speaking-v1',
};
const config = {
  enabled: true,
  workerLeaseSeconds: 120,
  retryBaseSeconds: 10,
  storage: { provider: 'fake' },
};

const worker = () => new AiGradingWorker({
  pool: { query: jest.fn() },
  config,
  storage: {},
  evidenceService: {},
  gradingService: {
    finalizeReview: jest.fn(),
    finalizeFailed: jest.fn(),
    finalizeCompleted: jest.fn(),
  },
  workerId: 'worker-1',
  now: () => Date.parse('2026-07-22T00:00:00Z'),
  random: () => 0,
});

describe('AI grading worker fencing and retry', () => {
  beforeEach(() => jest.clearAllMocks());

  test('does not claim jobs when the Speaking async feature flag is disabled', async () => {
    const instance = worker();
    instance.config = { ...instance.config, enabled: false };

    await expect(instance.runOnce()).resolves.toEqual({ status: 'disabled' });
    expect(jobQueries.claimNextJob).not.toHaveBeenCalled();
  });

  test('claims only a Speaking job and passes the persisted generation', async () => {
    jobQueries.claimNextJob.mockResolvedValue({ ...job });
    const instance = worker();
    instance.processJob = jest.fn().mockResolvedValue({});
    await expect(instance.runOnce()).resolves.toEqual({ status: 'terminal', jobId: 'job-1' });
    expect(jobQueries.claimNextJob).toHaveBeenCalledWith(instance.pool, expect.objectContaining({ submissionType: 'speaking' }));
    expect(instance.processJob).toHaveBeenCalledWith(expect.objectContaining({ lease_generation: 7 }));
  });

  test('does not mutate state when an old generation loses its lease', async () => {
    jobQueries.claimNextJob.mockResolvedValue({ ...job });
    const instance = worker();
    instance.processJob = jest.fn().mockRejectedValue(Object.assign(new Error('stale'), { errorCode: 'STALE_WORKER_LEASE' }));
    await expect(instance.runOnce()).resolves.toEqual({ status: 'stale' });
    expect(jobQueries.scheduleRetry).not.toHaveBeenCalled();
    expect(instance.grading.finalizeFailed).not.toHaveBeenCalled();
  });

  test('schedules bounded automatic retry for a temporary provider failure', async () => {
    jobQueries.claimNextJob.mockResolvedValue({ ...job });
    jobQueries.scheduleRetry.mockResolvedValue({ id: job.id });
    const instance = worker();
    instance.processJob = jest.fn().mockRejectedValue(Object.assign(
      new Error('audio=https://signed.example/file?token=secret'),
      { statusCode: 429 }
    ));
    await expect(instance.runOnce()).resolves.toEqual({ status: 'retry_wait' });
    expect(jobQueries.scheduleRetry).toHaveBeenCalledWith(instance.pool, expect.objectContaining({
      generation: 7,
      runAfter: '2026-07-22T00:00:10.000Z',
      errorMessage: expect.not.stringContaining('signed.example'),
    }));
  });

  test('checksum failure is never retried', () => {
    expect(isRetryable(Object.assign(new Error('bad checksum'), { errorCode: 'AUDIO_SHA256_MISMATCH' }))).toBe(false);
    expect(isRetryable(Object.assign(new Error('bad bundle'), { errorCode: 'CALIBRATION_SIGNATURE_INVALID' }))).toBe(false);
    expect(isRetryable(Object.assign(new Error('invalid score'), { errorCode: 'SPEAKING_EVIDENCE_INVALID' }))).toBe(false);
  });

  test('honors provider Retry-After for a retryable 5xx failure', async () => {
    jobQueries.claimNextJob.mockResolvedValue({ ...job });
    jobQueries.scheduleRetry.mockResolvedValue({ id: job.id });
    const instance = worker();
    instance.processJob = jest.fn().mockRejectedValue(Object.assign(
      new Error('provider unavailable'),
      { statusCode: 500, providerStatus: 503, retryable: true, retryAfterSeconds: 30 }
    ));

    await expect(instance.runOnce()).resolves.toEqual({ status: 'retry_wait' });
    expect(jobQueries.scheduleRetry).toHaveBeenCalledWith(instance.pool, expect.objectContaining({
      runAfter: '2026-07-22T00:00:30.000Z',
    }));
  });

  test('fails terminally after the provider retry budget is exhausted', async () => {
    jobQueries.claimNextJob.mockResolvedValue({ ...job, attempt_count: 2, max_attempts: 2 });
    const instance = worker();
    instance.processJob = jest.fn().mockRejectedValue(Object.assign(
      new Error('provider unavailable'),
      { statusCode: 500, retryable: true }
    ));
    instance.grading.finalizeFailed.mockResolvedValue({ status: 'failed' });

    await expect(instance.runOnce()).resolves.toEqual({ status: 'failed' });
    expect(jobQueries.scheduleRetry).not.toHaveBeenCalled();
    expect(instance.grading.finalizeFailed).toHaveBeenCalledWith(expect.objectContaining({
      provider: expect.objectContaining({ retryable: true }),
    }));
  });

  test('retries a provider timeout while attempt budget remains', async () => {
    jobQueries.claimNextJob.mockResolvedValue({ ...job });
    jobQueries.scheduleRetry.mockResolvedValue({ id: job.id });
    const instance = worker();
    instance.processJob = jest.fn().mockRejectedValue(Object.assign(
      new Error('provider timed out'),
      { errorCode: 'AI_PROVIDER_TIMEOUT', retryable: true }
    ));

    await expect(instance.runOnce()).resolves.toEqual({ status: 'retry_wait' });
    expect(jobQueries.scheduleRetry).toHaveBeenCalledTimes(1);
  });

  test('downloads and analyzes all three Speaking Parts before scoring', async () => {
    jobQueries.heartbeatJob.mockResolvedValue({ id: job.id });
    const instance = worker();
    instance.evidence = {
      processPart: jest.fn(async ({ submission }) => ({
        id: `artifact-${submission.part_number}`,
        status: 'complete',
        display_transcript: `Transcript ${submission.part_number}`,
      })),
    };
    const parts = [1, 2, 3].map((partNumber) => ({
      id: `part-${partNumber}`,
      part_number: partNumber,
      prompt_text: `Prompt ${partNumber}`,
      audio_storage_key: `private/part-${partNumber}.m4a`,
    }));

    await expect(instance.analyzeParts(job, parts)).resolves.toEqual([
      expect.objectContaining({ id: 'artifact-1', part_number: 1, status: 'complete' }),
      expect.objectContaining({ id: 'artifact-2', part_number: 2, status: 'complete' }),
      expect.objectContaining({ id: 'artifact-3', part_number: 3, status: 'complete' }),
    ]);
    expect(instance.evidence.processPart).toHaveBeenCalledTimes(3);
  });

  test('publishes an estimated full-audio result without requiring a calibration bundle', async () => {
    jobQueries.heartbeatJob.mockResolvedValue({ id: job.id });
    const instance = worker();
    instance.config = { ...instance.config, provider: { model: 'gemini-pinned' } };
    instance.scorer = { score: jest.fn().mockResolvedValue({
      result: { calibration_version: 'provider-value' },
      provider: { modelName: 'provider-value' },
    }) };
    instance.grading.finalizeCompleted.mockResolvedValue({ status: 'completed' });

    await instance.tryFullAudio(
      job,
      [],
      [{ status: 'complete' }, { status: 'complete' }, { status: 'complete' }],
      null,
      { allowed: true }
    );
    expect(instance.grading.finalizeCompleted).toHaveBeenCalledWith(expect.objectContaining({
      result: expect.objectContaining({ calibration_version: 'ai-estimated-v1' }),
      provider: expect.objectContaining({ modelName: 'gemini-pinned' }),
    }));
  });

  test('fails an AI-selected submission instead of handing it to tutor when evidence is incomplete', async () => {
    jobQueries.claimNextJob.mockResolvedValue({ ...job });
    jobQueries.heartbeatJob.mockResolvedValue({ id: job.id });
    const instance = worker();
    instance.getParts = jest.fn().mockResolvedValue([1, 2, 3]);
    instance.analyzeParts = jest.fn().mockResolvedValue([
      { status: 'complete' }, { status: 'partial' }, { status: 'complete' },
    ]);
    instance.grading.finalizeFailed.mockResolvedValue({ status: 'failed' });

    await expect(instance.runOnce()).resolves.toEqual({ status: 'failed' });
    expect(instance.grading.finalizeFailed).toHaveBeenCalled();
    expect(instance.grading.finalizeReview).not.toHaveBeenCalled();
  });

  test('does not expose the legacy transcript-review handoff path', () => {
    const instance = worker();
    expect(instance.finalizeReview).toBeUndefined();
    expect(instance.textFeedback).toBeUndefined();
  });
});
