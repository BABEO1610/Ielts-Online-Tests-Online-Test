const { reserveOriginalWithQuota } = require('../../../src/services/aiQuota.service');

const base = (overrides = {}) => ({
  client: { query: jest.fn().mockResolvedValue({ rows: [] }) },
  userId: 'user-1',
  idempotencyKey: 'idempotency-key-1',
  fingerprint: 'a'.repeat(64),
  lookupIdempotency: jest.fn().mockResolvedValue(null),
  lookupFingerprint: jest.fn().mockResolvedValue(null),
  countOriginalUsage: jest.fn().mockResolvedValue(0),
  reserveOriginal: jest.fn().mockResolvedValue({ id: 'job-1' }),
  date: '2026-07-22',
  ...overrides,
});

describe('aiQuota.service', () => {
  test('resolves replay before quota', async () => {
    const options = base({
      lookupIdempotency: jest.fn().mockResolvedValue({
        input_fingerprint: 'a'.repeat(64), idempotency_expires_at: '2099-01-01T00:00:00.000Z',
      }),
      countOriginalUsage: jest.fn().mockResolvedValue(10),
    });
    await expect(reserveOriginalWithQuota(options)).resolves.toMatchObject({ kind: 'replay' });
    expect(options.countOriginalUsage).not.toHaveBeenCalled();
  });

  test('resolves duplicate fingerprint before quota without aliasing the key', async () => {
    const options = base({ lookupFingerprint: jest.fn().mockResolvedValue({ id: 'canonical' }) });
    await expect(reserveOriginalWithQuota(options)).resolves.toEqual({ kind: 'duplicate', value: { id: 'canonical' } });
    expect(options.reserveOriginal).not.toHaveBeenCalled();
  });

  test('reserves only a genuinely new request', async () => {
    const options = base();
    await expect(reserveOriginalWithQuota(options)).resolves.toEqual({ kind: 'reserved', value: { id: 'job-1' } });
    expect(options.client.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      ['ai-grading:user-1:2026-07-22']
    );
  });

  test('blocks the eleventh original request', async () => {
    const options = base({ countOriginalUsage: jest.fn().mockResolvedValue(10) });
    await expect(reserveOriginalWithQuota(options)).rejects.toMatchObject({
      statusCode: 429, errorCode: 'DAILY_GRADING_QUOTA_EXCEEDED',
    });
  });
});
