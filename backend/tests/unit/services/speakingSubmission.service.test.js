const { FakeObjectStorageAdapter } = require('../../../src/storage/objectStorage.adapter');
const { createAudioUploadToken } = require('../../../src/security/audioUploadToken');
const {
  SpeakingSubmissionService,
  normalizeParts,
  normalizeUploadInput,
  buildFingerprint,
} = require('../../../src/services/speakingSubmission.service');
const { resolvePrompts } = require('../../../src/services/speakingSubmission.persistence');

const USER_ID = '11111111-1111-4111-8111-111111111111';
const TEST_ID = '22222222-2222-4222-8222-222222222222';
const PROMPT_IDS = [
  '33333333-3333-4333-8333-333333333331',
  '33333333-3333-4333-8333-333333333332',
  '33333333-3333-4333-8333-333333333333',
];
const NOW = Date.parse('2026-07-22T10:00:00.000Z');
const KEY = Buffer.alloc(32, 7).toString('base64');

const config = {
  enabled: true,
  pipelineVersion: 'speaking-v1',
  scoringConfigSha256: 'b'.repeat(64),
  calibrationBundleSha256: null,
  idempotencyTtlSeconds: 86400,
  manualRetryLimit: 2,
  dailyQuota: 10,
  storage: { provider: 'fake', signedUploadTtlSeconds: 300 },
  uploadToken: { activeKid: 'k1', keyring: { k1: KEY }, ttlSeconds: 300 },
};

const tokenFor = (partNumber, objectKey) => createAudioUploadToken({
  user_id: USER_ID,
  object_key: objectKey,
  part_number: partNumber,
  content_type: 'audio/mpeg',
  size_bytes: 3,
  sha256: String(partNumber).repeat(64),
  duration_ms: 1000 * partNumber,
}, { ...config.uploadToken, now: NOW }).token;

const createPool = ({ existingJob = null, replayParts = [] } = {}) => {
  const prompts = PROMPT_IDS.map((id, index) => ({
    id, passage_number: index + 1, title: `Part ${index + 1}`, instruction: 'Speak', content: 'Prompt',
  }));
  const job = {
    id: '44444444-4444-4444-8444-444444444444',
    group_id: '55555555-5555-4555-8555-555555555555',
    status: 'queued', stage: 'queued', created_at: new Date(NOW).toISOString(),
  };
  const dispatch = async (sql) => {
    if (/FROM mock_tests test/i.test(sql)) return { rows: prompts };
    if (/SELECT \* FROM ai_grading_jobs[\s\S]*idempotency_key/i.test(sql)) {
      return { rows: existingJob ? [existingJob] : [] };
    }
    if (/COUNT\(\*\).*FROM ai_grading_jobs/is.test(sql)) return { rows: [{ count: 0 }] };
    if (/INSERT INTO ai_grading_jobs/i.test(sql)) return { rows: [job] };
    return { rows: [] };
  };
  const client = { query: jest.fn(dispatch), release: jest.fn() };
  return {
    query: jest.fn(async (sql) => {
      if (/SELECT \* FROM ai_grading_jobs[\s\S]*idempotency_key/i.test(sql)) {
        return { rows: existingJob ? [existingJob] : [] };
      }
      if (/source_prompt_id[\s\S]*FROM speaking_submissions/i.test(sql)) return { rows: replayParts };
      return { rows: [] };
    }),
    connect: jest.fn().mockResolvedValue(client),
    client,
    job,
  };
};

describe('SpeakingSubmissionService', () => {
  test('validates the exact Part set and supported MIME aliases', () => {
    expect(() => normalizeParts([
      { part_number: 1, prompt_id: PROMPT_IDS[0], upload_token: 'x' },
      { part_number: 1, prompt_id: PROMPT_IDS[1], upload_token: 'y' },
      { part_number: 3, prompt_id: PROMPT_IDS[2], upload_token: 'z' },
    ])).toThrow('1, 2, 3');
    expect(normalizeUploadInput({
      part_number: 1, content_type: 'audio/mp3', size_bytes: 10,
      sha256: 'a'.repeat(64), duration_ms: 500,
    }).contentType).toBe('audio/mpeg');
  });

  test('fingerprint is stable for prompt object key order', () => {
    const uploads = [1, 2, 3].map((part) => ({
      object_key: `quarantine/${part}.mp3`,
      sha256: String(part).repeat(64), size_bytes: 3, duration_ms: part * 1000,
    }));
    const prompts = PROMPT_IDS.map((prompt_id, index) => ({
      prompt_id, part_number: index + 1, title: 't', instruction: 'i', content: 'c',
    }));
    const reordered = prompts.map((p) => ({ content: p.content, title: p.title, part_number: p.part_number, prompt_id: p.prompt_id, instruction: p.instruction }));
    expect(buildFingerprint({ testId: TEST_ID, prompts, uploads }))
      .toBe(buildFingerprint({ testId: TEST_ID, prompts: reordered, uploads }));
    const differentObject = uploads.map((upload) => ({ ...upload }));
    differentObject[0].object_key = 'quarantine/new-object.mp3';
    expect(buildFingerprint({ testId: TEST_ID, prompts, uploads }))
      .not.toBe(buildFingerprint({ testId: TEST_ID, prompts, uploads: differentObject }));
  });

  test('resolves only approved Speaking prompts whose publication time has arrived', async () => {
    const db = { query: jest.fn().mockResolvedValue({
      rows: PROMPT_IDS.map((id, index) => ({
        id, passage_number: index + 1, title: 'Part', instruction: 'Speak', content: 'Prompt',
      })),
    }) };
    await resolvePrompts(db, TEST_ID, PROMPT_IDS.map((promptId, index) => ({
      promptId, partNumber: index + 1,
    })));
    const [sql] = db.query.mock.calls[0];
    expect(sql).toMatch(/test\.is_published IS TRUE/i);
    expect(sql).toMatch(/test\.publish_at IS NULL OR test\.publish_at <= NOW\(\)/i);
    expect(sql).toMatch(/test\.review_status = 'approved'/i);
    expect(sql).toMatch(/FOR SHARE OF test, passage/i);
  });

  test('issues an opaque application token and a signed upload', async () => {
    const storage = new FakeObjectStorageAdapter({ now: () => NOW });
    const service = new SpeakingSubmissionService({
      pool: createPool(), config, storage, now: () => NOW,
      randomUUID: () => '66666666-6666-4666-8666-666666666666',
    });
    const result = await service.createAudioUpload(USER_ID, {
      part_number: 2, content_type: 'audio/mpeg', size_bytes: 3,
      sha256: 'a'.repeat(64), duration_ms: 1200,
    });
    expect(result.upload_url).toMatch(/^https:\/\/storage\.invalid\/upload\//);
    expect(result.upload_token).toMatch(/^v1\.k1\./);
    expect(result).not.toHaveProperty('object_key');
    expect(result.required_headers).toEqual({ 'content-type': 'audio/mpeg' });
  });

  test('stats objects before transaction and commits three submissions plus one job', async () => {
    const storage = new FakeObjectStorageAdapter({ now: () => NOW });
    const parts = [1, 2, 3].map((part) => {
      const objectKey = `quarantine/speaking/${USER_ID}/part-${part}.mp3`;
      storage.putObject(objectKey, Buffer.from('abc'), { contentType: 'audio/mpeg' });
      return { part_number: part, prompt_id: PROMPT_IDS[part - 1], upload_token: tokenFor(part, objectKey) };
    });
    const pool = createPool();
    const service = new SpeakingSubmissionService({
      pool, config, storage, now: () => NOW,
      randomUUID: () => pool.job.group_id,
    });
    const result = await service.submitFullSpeaking({
      userId: USER_ID, testId: TEST_ID, grader: 'ai', parts,
      idempotencyKey: 'submission-key-0001',
    });
    expect(result).toMatchObject({ job_id: pool.job.id, status: 'queued', replayed: false });
    expect(pool.client.query.mock.calls.filter(([sql]) => /INSERT INTO speaking_submissions/i.test(sql))).toHaveLength(3);
    expect(pool.client.query).toHaveBeenCalledWith('COMMIT');
    expect(pool.client.release).toHaveBeenCalled();
  });

  test('fails before opening a transaction when uploaded size differs', async () => {
    const storage = new FakeObjectStorageAdapter({ now: () => NOW });
    const parts = [1, 2, 3].map((part) => {
      const objectKey = `quarantine/speaking/${USER_ID}/bad-${part}.mp3`;
      storage.putObject(objectKey, Buffer.from(part === 2 ? 'wrong' : 'abc'), { contentType: 'audio/mpeg' });
      return { part_number: part, prompt_id: PROMPT_IDS[part - 1], upload_token: tokenFor(part, objectKey) };
    });
    const pool = createPool();
    const service = new SpeakingSubmissionService({ pool, config, storage, now: () => NOW });
    await expect(service.submitFullSpeaking({
      userId: USER_ID, testId: TEST_ID, grader: 'ai', parts,
      idempotencyKey: 'submission-key-0002',
    })).rejects.toMatchObject({ errorCode: 'AUDIO_SIZE_MISMATCH' });
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('replays the original accepted representation even when the live job is completed', async () => {
    const storage = new FakeObjectStorageAdapter({ now: () => NOW });
    const uploads = [1, 2, 3].map((part) => ({
      object_key: `quarantine/speaking/${USER_ID}/replay-${part}.mp3`,
      part_number: part,
      content_type: 'audio/mpeg',
      size_bytes: 3,
      sha256: String(part).repeat(64),
      duration_ms: 1000 * part,
    }));
    const prompts = PROMPT_IDS.map((prompt_id, index) => ({
      prompt_id,
      part_number: index + 1,
      title: `Part ${index + 1}`,
      instruction: 'Speak',
      content: 'Prompt',
    }));
    const existingJob = {
      id: '44444444-4444-4444-8444-444444444444',
      group_id: '55555555-5555-4555-8555-555555555555',
      status: 'completed',
      stage: 'finalizing',
      created_at: new Date(NOW).toISOString(),
      idempotency_expires_at: new Date(NOW + 60000).toISOString(),
      input_fingerprint: buildFingerprint({ testId: TEST_ID, prompts, uploads }),
    };
    const replayParts = uploads.map((upload, index) => ({
      test_id: TEST_ID,
      part_number: upload.part_number,
      source_prompt_id: PROMPT_IDS[index],
      audio_storage_key: upload.object_key,
      declared_audio_sha256: upload.sha256,
      audio_size_bytes: upload.size_bytes,
      declared_duration_ms: upload.duration_ms,
    }));
    const pool = createPool({ existingJob, replayParts });
    const service = new SpeakingSubmissionService({ pool, config, storage, now: () => NOW });
    const parts = uploads.map((upload, index) => ({
      part_number: upload.part_number,
      prompt_id: PROMPT_IDS[index],
      upload_token: tokenFor(upload.part_number, upload.object_key),
    }));

    await expect(service.submitFullSpeaking({
      userId: USER_ID,
      testId: TEST_ID,
      grader: 'ai',
      parts,
      idempotencyKey: 'submission-key-replay',
    })).resolves.toMatchObject({ status: 'queued', stage: 'queued', replayed: true });
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('offers the second recovery retry only after a failed first retry', async () => {
    const pool = {
      query: jest.fn(async (sql) => {
        if (/MIN\(user_id::text\)/i.test(sql)) return { rows: [{ owner_id: USER_ID, assigned_to_tutor: false }] };
        if (/WITH RECURSIVE retry_chain/i.test(sql)) {
          return { rows: [{
            root_job_id: 'root-job', canonical_job_id: 'retry-job-1', retry_job_id: 'retry-job-1',
            canonical_status: 'failed', canonical_stage: 'analyzing', attempt_count: 1,
            max_attempts: 1, manual_retry_count: 1, canonical_updated_at: '2026-07-22T00:00:00Z',
          }] };
        }
        return { rows: [] };
      }),
    };
    const service = new SpeakingSubmissionService({ pool, config });
    await expect(service.getStatus('55555555-5555-4555-8555-555555555555', {
      id: USER_ID, role: 'student',
    })).resolves.toMatchObject({
      status: 'failed', can_retry: true, manual_retry_count: 1, manual_retry_limit: 2,
    });
  });

  test('never offers retry after a successful first attempt', async () => {
    const pool = {
      query: jest.fn(async (sql) => {
        if (/MIN\(user_id::text\)/i.test(sql)) return { rows: [{ owner_id: USER_ID, assigned_to_tutor: false }] };
        if (/WITH RECURSIVE retry_chain/i.test(sql)) {
          return { rows: [{
            root_job_id: 'root-job', canonical_job_id: 'root-job', retry_job_id: null,
            canonical_status: 'completed', canonical_stage: 'finalizing', attempt_count: 1,
            max_attempts: 2, manual_retry_count: 0, canonical_updated_at: '2026-07-22T00:00:00Z',
          }] };
        }
        if (/FROM ai_grading_reports/i.test(sql)) return { rows: [] };
        return { rows: [] };
      }),
    };
    const service = new SpeakingSubmissionService({ pool, config });
    await expect(service.getStatus('55555555-5555-4555-8555-555555555555', {
      id: USER_ID, role: 'student',
    })).resolves.toMatchObject({ status: 'completed', can_retry: false, manual_retry_count: 0 });
  });
});
