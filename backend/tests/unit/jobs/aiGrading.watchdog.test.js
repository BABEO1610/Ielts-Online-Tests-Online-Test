const { AiGradingWatchdog } = require('../../../src/jobs/aiGrading.watchdog');

describe('AI grading watchdog', () => {
  test('locks one expired lease with SKIP LOCKED and releases the client', async () => {
    const client = {
      query: jest.fn(async (sql) => {
        if (/RETURNING job\.\*/i.test(sql)) return { rows: [{ id: 'job-1', status: 'queued' }] };
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    const watchdog = new AiGradingWatchdog({
      pool: { connect: jest.fn().mockResolvedValue(client) },
      retryDelaySeconds: 8,
      random: () => 0.8,
    });
    await expect(watchdog.recoverOne()).resolves.toMatchObject({ id: 'job-1', status: 'queued' });
    const sql = client.query.mock.calls.find(([value]) => /WITH expired/i.test(value))[0];
    expect(sql).toMatch(/FOR UPDATE SKIP LOCKED/i);
    expect(sql).toMatch(/lease_expires_at < NOW\(\)/i);
    expect(sql).toMatch(/POWER\(2/i);
    const recoveryCall = client.query.mock.calls.find(([value]) => /WITH expired/i.test(value));
    expect(recoveryCall[1]).toEqual([8, 0.2]);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });
});
