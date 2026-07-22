jest.mock('../../../src/db/queries/aiGradingJobs.queries', () => ({
  lookupJobByIdempotency: jest.fn(),
  findRetryChild: jest.fn(),
  insertRetryChild: jest.fn(),
}));

const jobQueries = require('../../../src/db/queries/aiGradingJobs.queries');
const { SpeakingGradingRetryService } = require('../../../src/services/speakingGradingRetry.service');

const GROUP_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const ROOT_ID = '33333333-3333-4333-8333-333333333333';
const CHILD_ID = '44444444-4444-4444-8444-444444444444';
const IDEMPOTENCY_KEY = 'retry-request-key-0001';

const createDb = (root = {
  id: ROOT_ID,
  group_id: GROUP_ID,
  user_id: USER_ID,
  status: 'failed',
  attempt_count: 2,
  max_attempts: 2,
  last_error_retryable: true,
}, resetRows = [{ id: 'part-1' }, { id: 'part-2' }, { id: 'part-3' }]) => {
  const client = {
    query: jest.fn(async (sql) => {
      if (String(sql).includes('SELECT * FROM ai_grading_jobs')) return { rows: root ? [root] : [] };
      if (String(sql).includes('UPDATE speaking_submissions')) return { rows: resetRows };
      return { rows: [] };
    }),
    release: jest.fn(),
  };
  return { pool: { connect: jest.fn(async () => client) }, client };
};

const serviceFor = (pool) => new SpeakingGradingRetryService({
  pool,
  config: { enabled: true, idempotencyTtlSeconds: 86400 },
  now: () => Date.parse('2026-07-22T00:00:00Z'),
});

describe('Speaking manual retry state machine', () => {
  beforeEach(() => jest.clearAllMocks());

  test('creates the only manual child after an exhausted retryable root', async () => {
    const { pool, client } = createDb();
    jobQueries.lookupJobByIdempotency.mockResolvedValue(null);
    jobQueries.findRetryChild.mockResolvedValue(null);
    jobQueries.insertRetryChild.mockResolvedValue({
      id: CHILD_ID,
      group_id: GROUP_ID,
      status: 'queued',
      stage: 'queued',
      created_at: '2026-07-22T00:00:00Z',
    });

    await expect(serviceFor(pool).retry({
      groupId: GROUP_ID,
      userId: USER_ID,
      idempotencyKey: IDEMPOTENCY_KEY,
    })).resolves.toMatchObject({ job_id: CHILD_ID, status: 'queued', replayed: false });
    expect(jobQueries.insertRetryChild).toHaveBeenCalledWith(client, expect.objectContaining({ rootJobId: ROOT_ID }));
    expect(client.query).toHaveBeenCalledWith(expect.stringMatching(/status = 'pending'.*grader = 'ai'/s), [GROUP_ID, USER_ID]);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  test('rolls back the child if all three failed parts cannot be reset atomically', async () => {
    const { pool, client } = createDb(undefined, [{ id: 'part-1' }]);
    jobQueries.lookupJobByIdempotency.mockResolvedValue(null);
    jobQueries.findRetryChild.mockResolvedValue(null);
    jobQueries.insertRetryChild.mockResolvedValue({ id: CHILD_ID, group_id: GROUP_ID, status: 'queued' });

    await expect(serviceFor(pool).retry({
      groupId: GROUP_ID,
      userId: USER_ID,
      idempotencyKey: IDEMPOTENCY_KEY,
    })).rejects.toMatchObject({ statusCode: 409, errorCode: 'GRADING_NOT_RETRYABLE' });
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('replays the same unexpired child without spending another run', async () => {
    const { pool } = createDb();
    jobQueries.lookupJobByIdempotency.mockResolvedValue({
      id: CHILD_ID,
      group_id: GROUP_ID,
      retry_of_job_id: ROOT_ID,
      status: 'completed',
      stage: 'finalizing',
      idempotency_expires_at: '2026-07-23T00:00:00Z',
      created_at: '2026-07-22T00:00:00Z',
    });

    await expect(serviceFor(pool).retry({
      groupId: GROUP_ID,
      userId: USER_ID,
      idempotencyKey: IDEMPOTENCY_KEY,
    })).resolves.toMatchObject({ job_id: CHILD_ID, status: 'queued', stage: 'queued', replayed: true });
    expect(jobQueries.insertRetryChild).not.toHaveBeenCalled();
  });

  test('does not reveal or retry a group not owned by the requester', async () => {
    const { pool, client } = createDb(null);
    await expect(serviceFor(pool).retry({
      groupId: GROUP_ID,
      userId: USER_ID,
      idempotencyKey: IDEMPOTENCY_KEY,
    })).rejects.toMatchObject({ statusCode: 404, errorCode: 'GRADING_JOB_NOT_FOUND' });
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(jobQueries.insertRetryChild).not.toHaveBeenCalled();
  });
});
