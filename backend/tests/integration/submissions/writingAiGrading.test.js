const mockPool = { query: jest.fn(), connect: jest.fn() };
const mockGradeWriting = jest.fn();

jest.mock('../../../src/db/pool', () => ({ pool: mockPool }));
jest.mock('../../../src/ai/grading.service', () => ({
  gradeWriting: mockGradeWriting,
  countWords: (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length,
}));
jest.mock('../../../src/config/supabase', () => ({ storage: { from: jest.fn() } }));
jest.mock('../../../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));
jest.mock('uuid', () => ({
  v4: () => '11111111-1111-4111-8111-111111111111',
}));

const SubmissionService = require('../../../src/services/submission.service');
const AiGradingController = require('../../../src/controllers/aiGrading.controller');

const USER_ID = '22222222-2222-4222-8222-222222222222';
const GROUP_ID = '11111111-1111-4111-8111-111111111111';
const TASK_1_ID = '33333333-3333-4333-8333-333333333331';
const TASK_2_ID = '33333333-3333-4333-8333-333333333332';
const words = (count) => Array.from({ length: count }, (_, index) => `word${index}`).join(' ');
const validTasks = [
  { task_number: 1, prompt_text: 'Task 1', response_text: words(50) },
  { task_number: 2, prompt_text: 'Task 2', response_text: words(100) },
];

describe('Writing AI production regression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects Task 1/2 below 50/100 before quota, insert or provider', async () => {
    await expect(SubmissionService.submitFullWriting(USER_ID, null, 'ai', [
      { ...validTasks[0], response_text: words(49) },
      validTasks[1],
    ], { idempotencyKey: 'writing-request-key-0001' }))
      .rejects.toMatchObject({ statusCode: 422, errorCode: 'AIGRADE_001' });
    expect(mockPool.query).not.toHaveBeenCalled();
    expect(mockPool.connect).not.toHaveBeenCalled();
    expect(mockGradeWriting).not.toHaveBeenCalled();
  });

  test('rejects invalid test_id instead of silently treating it as practice', async () => {
    await expect(SubmissionService.submitFullWriting(
      USER_ID, 'not-a-uuid', 'ai', validTasks, { idempotencyKey: 'writing-request-key-0009' }
    )).rejects.toMatchObject({ statusCode: 400, errorCode: 'INVALID_TEST_ID' });
    expect(mockPool.query).not.toHaveBeenCalled();
    expect(mockPool.connect).not.toHaveBeenCalled();
    expect(mockGradeWriting).not.toHaveBeenCalled();
  });

  test('enforces the shared daily quota before inserting a Writing group', async () => {
    mockPool.query.mockResolvedValue({ rows: [] }); // fast idempotency lookup
    const client = {
      release: jest.fn(),
      query: jest.fn(async (sql) => {
        if (String(sql).includes('COUNT(*)::integer AS count')) return { rows: [{ count: 10 }] };
        return { rows: [] };
      }),
    };
    mockPool.connect.mockResolvedValue(client);
    await expect(SubmissionService.submitFullWriting(
      USER_ID, null, 'ai', validTasks, { idempotencyKey: 'writing-request-key-0002' }
    )).rejects.toMatchObject({ statusCode: 429, errorCode: 'DAILY_GRADING_QUOTA_EXCEEDED' });
    expect(client.query.mock.calls.some(([sql]) => /INSERT INTO writing_submissions/i.test(String(sql)))).toBe(false);
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockGradeWriting).not.toHaveBeenCalled();
  });

  test('replays cached group data without calling the provider and preserves 33/67 band weighting', async () => {
    let fingerprint;
    mockPool.query.mockImplementation(async (sql) => {
      const text = String(sql);
      if (text.includes('idempotency_key')) {
        if (!fingerprint) return { rows: [] };
        return { rows: [{
          id: 'job-1', group_id: GROUP_ID, submission_type: 'writing',
          input_fingerprint: fingerprint, idempotency_expires_at: '2999-01-01T00:00:00Z',
        }] };
      }
      return { rows: [] };
    });

    // Capture the deterministic digest without exporting learner text by letting
    // the quota insert receive it, then abort before any submission insert.
    const captureClient = {
      release: jest.fn(),
      query: jest.fn(async (sql, params) => {
        const text = String(sql);
        if (text.includes('COUNT(*)::integer AS count')) return { rows: [{ count: 0 }] };
        if (text.includes('INSERT INTO ai_grading_jobs')) {
          fingerprint = params[5];
          throw Object.assign(new Error('capture'), { code: 'CAPTURE_ONLY' });
        }
        return { rows: [] };
      }),
    };
    mockPool.connect.mockResolvedValueOnce(captureClient);
    await expect(SubmissionService.submitFullWriting(
      USER_ID, null, 'ai', validTasks, { idempotencyKey: 'writing-request-key-0003' }
    )).rejects.toMatchObject({ errorCode: 'DB_ERROR' });
    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/);

    mockPool.query.mockImplementation(async (sql) => {
      const text = String(sql);
      if (text.includes('idempotency_key')) return { rows: [{
        id: 'job-1', group_id: GROUP_ID, submission_type: 'writing',
        input_fingerprint: fingerprint, idempotency_expires_at: '2999-01-01T00:00:00Z',
      }] };
      if (text.includes('FROM writing_submissions')) return { rows: [
        { id: TASK_1_ID, task_number: 1 }, { id: TASK_2_ID, task_number: 2 },
      ] };
      if (text.includes('FROM ai_grading_reports')) return { rows: [
        { submission_id: TASK_1_ID, task_number: 1, band_score: 6, status: 'completed' },
        { submission_id: TASK_2_ID, task_number: 2, band_score: 7, status: 'completed' },
      ] };
      return { rows: [] };
    });
    await expect(SubmissionService.submitFullWriting(
      USER_ID, null, 'ai', validTasks, { idempotencyKey: 'writing-request-key-0003' }
    )).resolves.toMatchObject({ replayed: true, overallAiBand: 6.5, aiStatus: 'completed' });
    expect(mockGradeWriting).not.toHaveBeenCalled();
  });

  test('returns the standardized Vietnamese error envelope for a short legacy grading request', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{
        id: TASK_1_ID, user_id: USER_ID, grader: 'ai', task_number: 1,
        status: 'pending', submitted_at: '2026-07-22T00:00:00Z', response_text: words(49),
      }] })
      .mockResolvedValueOnce({ rows: [] });
    const req = {
      params: { submissionId: TASK_1_ID },
      user: { id: USER_ID, role: 'student' },
      get: jest.fn(),
      app: { get: jest.fn() },
    };
    const res = { status: jest.fn(), json: jest.fn() };
    res.status.mockReturnValue(res);
    await AiGradingController.requestAiGrade(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      data: null,
      error: expect.objectContaining({ code: 'AIGRADE_001', details: { word_count: 49, required_words: 50 } }),
      meta: { request_id: expect.any(String) },
    }));
  });
});
