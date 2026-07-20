jest.mock('../../../src/db/pool', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const { pool } = require('../../../src/db/pool');
const repository = require('../../../src/api/assistant/assistant.repository');

describe('Assistant repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    repository.clearColumnCacheForTests();
  });

  it('loads the latest chat history before returning it chronologically', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          { column_name: 'id' },
          { column_name: 'user_id' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { column_name: 'id' },
          { column_name: 'session_id' },
          { column_name: 'role' },
          { column_name: 'content' },
          { column_name: 'created_at' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'message-101',
            conversation_id: 'session-latest',
            role: 'user',
            content: 'Latest question',
            created_at: '2026-07-14T00:47:00.000Z',
          },
        ],
      });

    const rows = await repository.getHistory('user-1');
    const historySql = pool.query.mock.calls[2][0];

    expect(historySql).toContain('ORDER BY m."created_at" DESC, m.id DESC');
    expect(historySql).toContain('WITH target_session AS');
    expect(historySql).toContain('MAX(activity."created_at") DESC NULLS LAST');
    expect(historySql).toContain('LIMIT 100');
    expect(historySql).toContain('ORDER BY recent.created_at ASC, recent.id ASC');
    expect(pool.query.mock.calls[2][1]).toEqual(['user-1', null]);
    expect(rows).toEqual([
      {
        id: 'message-101',
        conversation_id: 'session-latest',
        role: 'user',
        content: 'Latest question',
        created_at: '2026-07-14T00:47:00.000Z',
      },
    ]);
  });

  it('ignores a foreign requested session and resumes the latest owned active session', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          { column_name: 'id' },
          { column_name: 'user_id' },
          { column_name: 'started_at' },
          { column_name: 'ended_at' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { column_name: 'id' },
          { column_name: 'session_id' },
          { column_name: 'created_at' },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'owned-session' }] });

    const sessionId = await repository.createOrGetSession('user-1', 'foreign-session');

    expect(sessionId).toBe('owned-session');
    expect(pool.query.mock.calls[2][0]).toContain('id = $1 AND "user_id" = $2');
    expect(pool.query.mock.calls[2][1]).toEqual(['foreign-session', 'user-1']);
    expect(pool.query.mock.calls[3][0]).toContain('session_row."ended_at" IS NULL');
    expect(pool.query.mock.calls[3][0]).toContain('MAX(activity."created_at")');
    expect(pool.query.mock.calls[3][0]).toContain('session_row."started_at" DESC');
  });

  it('enforces session ownership inside the message insert query', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          { column_name: 'id' },
          { column_name: 'session_id' },
          { column_name: 'role' },
          { column_name: 'content' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { column_name: 'id' },
          { column_name: 'user_id' },
          { column_name: 'ended_at' },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const saved = await repository.saveUserMessage(
      'foreign-session',
      'poisoned message',
      'user-1'
    );
    const insertSql = pool.query.mock.calls[2][0];

    expect(saved).toBeNull();
    expect(insertSql).toContain('INSERT INTO "chatbot_messages"');
    expect(insertSql).toContain('SELECT s.id, $3, $4');
    expect(insertSql).toContain('WHERE s.id = $1 AND s."user_id" = $2');
    expect(insertSql).toContain('s."ended_at" IS NULL');
    expect(pool.query.mock.calls[2][1]).toEqual([
      'foreign-session',
      'user-1',
      'poisoned message',
      'user',
    ]);
  });

  it('reads a structured preference only from an owned active session', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          { column_name: 'id' },
          { column_name: 'user_id' },
          { column_name: 'preferred_address' },
          { column_name: 'ended_at' },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ preferred_address: 'Siêu nhân Đạt' }] });

    await expect(repository.getSessionPreference('user-1', 'session-1')).resolves.toEqual({
      supported: true,
      preferredAddress: 'Siêu nhân Đạt',
    });
    expect(pool.query.mock.calls[1][0]).toContain('id = $1 AND "user_id" = $2');
    expect(pool.query.mock.calls[1][0]).toContain('"ended_at" IS NULL');
  });

  it('updates a structured preference with an ownership predicate', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          { column_name: 'id' },
          { column_name: 'user_id' },
          { column_name: 'preferred_address' },
          { column_name: 'ended_at' },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'session-1' }] });

    await expect(repository.setSessionPreference({
      userId: 'user-1',
      sessionId: 'session-1',
      preferredAddress: 'Siêu nhân Đạt',
    })).resolves.toBe(true);
    expect(pool.query.mock.calls[1][0]).toContain('SET "preferred_address" = $3');
    expect(pool.query.mock.calls[1][0]).toContain('id = $1 AND "user_id" = $2');
    expect(pool.query.mock.calls[1][1]).toEqual(['session-1', 'user-1', 'Siêu nhân Đạt']);
  });
});
