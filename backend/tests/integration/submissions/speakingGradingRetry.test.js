jest.mock('../../../src/db/queries/aiGradingJobs.queries', () => ({
  lookupJobByIdempotency: jest.fn(),
  getRetryChain: jest.fn(),
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
  config: { enabled: true, idempotencyTtlSeconds: 86400, manualRetryLimit: 2 },
  now: () => Date.parse('2026-07-22T00:00:00Z'),
});

describe('Speaking manual retry state machine', () => {
  beforeEach(() => jest.clearAllMocks());

  test('creates the first manual child after any failed root', async () => {
    const { pool, client } = createDb();
    jobQueries.lookupJobByIdempotency.mockResolvedValue(null);
    jobQueries.getRetryChain.mockResolvedValue([]);
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
    expect(jobQueries.insertRetryChild).toHaveBeenCalledWith(client, expect.objectContaining({ parentJobId: ROOT_ID }));
    expect(client.query).toHaveBeenCalledWith(expect.stringMatching(/status = 'pending'.*grader = 'ai'/s), [GROUP_ID, USER_ID]);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  test('rolls back the child if all three failed parts cannot be reset atomically', async () => {
    const { pool, client } = createDb(undefined, [{ id: 'part-1' }]);
    jobQueries.lookupJobByIdempotency.mockResolvedValue(null);
    jobQueries.getRetryChain.mockResolvedValue([]);
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
      user_id: USER_ID,
      retry_of_job_id: ROOT_ID,
      status: 'completed',
      stage: 'finalizing',
      idempotency_expires_at: '2026-07-23T00:00:00Z',
      created_at: '2026-07-22T00:00:00Z',
    });
    jobQueries.getRetryChain.mockResolvedValue([{
      id: CHILD_ID, group_id: GROUP_ID, user_id: USER_ID, retry_of_job_id: ROOT_ID,
    }]);

    await expect(serviceFor(pool).retry({
      groupId: GROUP_ID,
      userId: USER_ID,
      idempotencyKey: IDEMPOTENCY_KEY,
    })).resolves.toMatchObject({ job_id: CHILD_ID, status: 'queued', stage: 'queued', replayed: true });
    expect(jobQueries.insertRetryChild).not.toHaveBeenCalled();
  });

  test('creates a second manual retry from the failed first retry', async () => {
    const { pool } = createDb();
    jobQueries.lookupJobByIdempotency.mockResolvedValue(null);
    jobQueries.getRetryChain.mockResolvedValue([{
      id: CHILD_ID, group_id: GROUP_ID, user_id: USER_ID, retry_of_job_id: ROOT_ID, status: 'failed',
    }]);
    jobQueries.insertRetryChild.mockResolvedValue({
      id: '55555555-5555-4555-8555-555555555555', group_id: GROUP_ID,
      status: 'queued', stage: 'queued', created_at: '2026-07-22T00:00:00Z',
    });

    await expect(serviceFor(pool).retry({
      groupId: GROUP_ID, userId: USER_ID, idempotencyKey: 'retry-request-key-0002',
    })).resolves.toMatchObject({ status: 'queued', replayed: false });
    expect(jobQueries.insertRetryChild).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      parentJobId: CHILD_ID,
    }));
  });

  test('stops after two manual retry jobs', async () => {
    const { pool } = createDb();
    jobQueries.lookupJobByIdempotency.mockResolvedValue(null);
    jobQueries.getRetryChain.mockResolvedValue([
      { id: CHILD_ID, group_id: GROUP_ID, user_id: USER_ID, retry_of_job_id: ROOT_ID, status: 'failed' },
      { id: '55555555-5555-4555-8555-555555555555', group_id: GROUP_ID, user_id: USER_ID, retry_of_job_id: CHILD_ID, status: 'failed' },
    ]);

    await expect(serviceFor(pool).retry({
      groupId: GROUP_ID, userId: USER_ID, idempotencyKey: 'retry-request-key-0003',
    })).rejects.toMatchObject({ statusCode: 409, errorCode: 'RETRY_LIMIT_REACHED' });
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

  test('serializes concurrent manual retries so only one canonical child is created', async () => {
    let lockTail = Promise.resolve();
    let retryChain = [];
    const pool = {
      connect: jest.fn(async () => {
        let unlock = null;
        return {
          query: jest.fn(async (sql) => {
            const text = String(sql);
            if (text.includes('SELECT * FROM ai_grading_jobs')) {
              const previous = lockTail;
              lockTail = new Promise((resolve) => { unlock = resolve; });
              await previous;
              return { rows: [{
                id: ROOT_ID,
                group_id: GROUP_ID,
                user_id: USER_ID,
                status: 'failed',
              }] };
            }
            if (text === 'COMMIT' || text === 'ROLLBACK') {
              unlock?.();
              return { rows: [] };
            }
            if (text.includes('UPDATE speaking_submissions')) {
              return { rows: [{ id: 'part-1' }, { id: 'part-2' }, { id: 'part-3' }] };
            }
            return { rows: [] };
          }),
          release: jest.fn(),
        };
      }),
    };
    jobQueries.lookupJobByIdempotency.mockResolvedValue(null);
    jobQueries.getRetryChain.mockImplementation(async () => [...retryChain]);
    jobQueries.insertRetryChild.mockImplementation(async (_client, input) => {
      const child = {
        id: CHILD_ID,
        group_id: GROUP_ID,
        user_id: USER_ID,
        retry_of_job_id: input.parentJobId,
        status: 'queued',
        stage: 'queued',
        created_at: '2026-07-22T00:00:00Z',
      };
      retryChain = [child];
      return child;
    });
    const service = serviceFor(pool);

    const outcomes = await Promise.allSettled([
      service.retry({ groupId: GROUP_ID, userId: USER_ID, idempotencyKey: 'concurrent-retry-key-0001' }),
      service.retry({ groupId: GROUP_ID, userId: USER_ID, idempotencyKey: 'concurrent-retry-key-0002' }),
    ]);

    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1);
    expect(outcomes.find((outcome) => outcome.status === 'rejected').reason)
      .toMatchObject({ errorCode: 'RETRY_ALREADY_CREATED' });
    expect(jobQueries.insertRetryChild).toHaveBeenCalledTimes(1);
  });
});
