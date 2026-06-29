jest.mock('../../../src/db/pool', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const { pool } = require('../../../src/db/pool');
const { resolveUserDisplayName } = require('../../../src/api/assistant/assistant.user-resolver');

describe('Assistant user display name resolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockResolvedValue({ rows: [] });
  });

  it('uses profile full_name and shortens multi-word Vietnamese names', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'id' }, { column_name: 'full_name' }] })
      .mockResolvedValueOnce({ rows: [{ full_name: 'Nguyễn Tiến Đạt' }] });

    const result = await resolveUserDisplayName({ id: 'user-1', email: 'dat@example.com' });

    expect(result).toMatchObject({
      displayName: 'Đạt',
      fullName: 'Nguyễn Tiến Đạt',
      source: 'profiles.full_name',
      fallbackUsed: false,
    });
  });

  it('uses metadata.name when profile fields are empty', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ column_name: 'id' }, { column_name: 'full_name' }] })
      .mockResolvedValueOnce({ rows: [{ full_name: '' }] });

    const result = await resolveUserDisplayName({
      id: 'user-1',
      user_metadata: { name: 'IELTS Learner' },
    });

    expect(result.displayName).toBe('Learner');
    expect(result.source).toBe('auth.user_metadata.name');
    expect(result.fallbackUsed).toBe(false);
  });

  it('falls back to bạn when profile does not exist', async () => {
    const result = await resolveUserDisplayName({ id: 'user-1' });

    expect(result).toMatchObject({
      displayName: 'bạn',
      fallbackUsed: true,
      fallbackReason: 'no_valid_name',
    });
  });

  it('truncates very long names', async () => {
    const longName = 'A'.repeat(80);
    const result = await resolveUserDisplayName({
      id: 'user-1',
      user_metadata: { name: longName },
    });

    expect(result.displayName).toHaveLength(40);
    expect(result.fullName).toHaveLength(40);
  });

  it('does not use email as display name', async () => {
    const result = await resolveUserDisplayName({
      id: 'user-1',
      user_metadata: { name: 'student@example.com' },
    });

    expect(result.displayName).toBe('bạn');
    expect(result.fallbackUsed).toBe(true);
  });

  it('falls back with dbError when profile query fails', async () => {
    pool.query.mockRejectedValueOnce(Object.assign(new Error('RLS denied'), { code: '42501' }));

    const result = await resolveUserDisplayName({ id: 'user-1' });

    expect(result).toMatchObject({
      displayName: 'bạn',
      fallbackUsed: true,
      fallbackReason: 'db_error',
      dbError: { code: '42501', message: 'RLS denied' },
    });
  });
});
