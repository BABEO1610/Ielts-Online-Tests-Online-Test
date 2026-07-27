const queries = require('../../../src/db/queries/aiGradingJobs.queries');

const dbWith = (rows = []) => ({ query: jest.fn().mockResolvedValue({ rows }) });

describe('aiGradingJobs queries', () => {
  test('claim is atomic, skip-locked and increments the fencing generation', async () => {
    const db = dbWith([{ id: 'job-1' }]);
    await queries.claimNextJob(db, { workerId: 'worker-1', leaseSeconds: 45 });
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/FOR UPDATE SKIP LOCKED/i);
    expect(sql).toMatch(/lease_generation = lease_generation \+ 1/i);
    expect(sql).toMatch(/attempt_count = attempt_count \+ 1/i);
    expect(params).toEqual(['worker-1', 45, 'speaking']);
  });

  test('heartbeat uses owner, generation, active lease CAS', async () => {
    const db = dbWith([]);
    await queries.heartbeatJob(db, {
      jobId: 'job-1', workerId: 'worker-1', generation: 3, stage: 'analyzing',
    });
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/lease_owner = \$2/i);
    expect(sql).toMatch(/lease_generation = \$3/i);
    expect(sql).toMatch(/lease_expires_at >= NOW\(\)/i);
    expect(params[2]).toBe(3);
  });

  test('rejects a non-terminal finish status before querying', async () => {
    const db = dbWith([]);
    expect(() => queries.finishJob(db, {
      jobId: 'job-1', workerId: 'worker-1', generation: 1, status: 'running',
    })).toThrow('Invalid terminal');
    expect(db.query).not.toHaveBeenCalled();
  });

  test('usage only counts original jobs in the UTC day', async () => {
    const db = dbWith([{ count: 4 }]);
    await expect(queries.countOriginalUsage(db, 'user-1', '2026-07-22')).resolves.toBe(4);
    const [sql] = db.query.mock.calls[0];
    expect(sql).toMatch(/retry_of_job_id IS NULL/i);
    expect(sql.match(/AT TIME ZONE 'UTC'/gi)).toHaveLength(2);
    expect(sql).toMatch(/\$2::date \+ 1/i);
  });

  test('allows exactly one manual child for every failed Speaking job', async () => {
    const db = dbWith([{ id: 'retry-1' }]);
    await queries.insertRetryChild(db, {
      rootJobId: 'root-1', idempotencyKey: 'manual-retry-key-0001', expiresAt: '2026-07-23T00:00:00Z',
    });
    const [sql] = db.query.mock.calls[0];
    expect(sql).toMatch(/status = 'failed'/i);
    expect(sql).not.toMatch(/attempt_count = max_attempts/i);
    expect(sql).not.toMatch(/last_error_retryable IS TRUE/i);
    expect(sql).toMatch(/ON CONFLICT \(retry_of_job_id\)/i);
  });
});
