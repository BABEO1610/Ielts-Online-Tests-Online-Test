/**
 * @file backend/tests/unit/db/queries/sessions.queries.test.js
 * @description Unit tests for session queries
 *
 * Traceability Matrix:
 * | Test Case | Function | Requirement (EARS / SPEC) |
 * | --- | --- | --- |
 * | TC-SES-Q-01 | createSession | WHEN User submits valid credentials... SHALL create new record |
 * | TC-SES-Q-02 | findActiveSession | WHILE request passes Authenticated Middleware... SHALL match session_token |
 * | TC-SES-Q-03 | revokeSession | WHEN User calls Logout API... SHALL update revoked_at |
 * | TC-SES-Q-04 | countActiveSessions | Helper for >= 3 active sessions |
 * | TC-SES-Q-05 | revokeOldestSession | WHERE User has >= 3 active sessions... SHALL revoke oldest |
 * | TC-SES-Q-06 | (Error cases) | Check DB errors and null inputs |
 */

const { pool } = require('../../../../src/db/pool');
const sessionsQueries = require('../../../../src/db/queries/sessions.queries');

jest.mock('../../../../src/db/pool', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Session Queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('TC-SES-Q-01a: Should create a new session successfully', async () => {
      const mockResult = { rows: [{ id: 'session-id', user_id: 'user-id' }] };
      pool.query.mockResolvedValue(mockResult);

      const result = await sessionsQueries.createSession('user-id', 'token-123', '127.0.0.1', 'Mozilla', '2030-01-01');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_sessions'),
        ['user-id', 'token-123', '127.0.0.1', 'Mozilla', '2030-01-01']
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('TC-SES-Q-06a: Should throw error if database query fails during create', async () => {
      pool.query.mockRejectedValue(new Error('DB Error'));
      await expect(
        sessionsQueries.createSession('user-id', 'token-123', '127.0.0.1', 'Mozilla', '2030-01-01')
      ).rejects.toThrow('DB Error');
    });
  });

  describe('findActiveSession', () => {
    it('TC-SES-Q-02a: Should find an active session by token', async () => {
      const mockResult = { rows: [{ id: 'session-id', session_token: 'token-123' }] };
      pool.query.mockResolvedValue(mockResult);

      const result = await sessionsQueries.findActiveSession('token-123');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM v_active_sessions'),
        ['token-123']
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('TC-SES-Q-02b: Should return null if session not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });
      const result = await sessionsQueries.findActiveSession('token-123');
      expect(result).toBeNull();
    });
  });

  describe('revokeSession', () => {
    it('TC-SES-Q-03a: Should revoke a session successfully', async () => {
      const mockResult = { rows: [{ id: 'session-id', revoked_at: '2026-06-01T00:00:00Z' }] };
      pool.query.mockResolvedValue(mockResult);

      const result = await sessionsQueries.revokeSession('token-123');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_sessions'),
        ['token-123']
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('TC-SES-Q-03b: Should return null if session to revoke does not exist', async () => {
      pool.query.mockResolvedValue({ rows: [] });
      const result = await sessionsQueries.revokeSession('token-123');
      expect(result).toBeNull();
    });
  });

  describe('countActiveSessions', () => {
    it('TC-SES-Q-04a: Should return the count of active sessions for a user', async () => {
      const mockResult = { rows: [{ count: 2 }] };
      pool.query.mockResolvedValue(mockResult);

      const result = await sessionsQueries.countActiveSessions('user-id');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*)::int AS count'),
        ['user-id']
      );
      expect(result).toBe(2);
    });
  });

  describe('revokeOldestSession', () => {
    it('TC-SES-Q-05a: Should revoke the oldest active session for a user', async () => {
      const mockResult = { rows: [{ id: 'oldest-session', revoked_at: '2026-06-01T00:00:00Z' }] };
      pool.query.mockResolvedValue(mockResult);

      const result = await sessionsQueries.revokeOldestSession('user-id');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY updated_at ASC'),
        ['user-id']
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('TC-SES-Q-05b: Should return null if no active sessions exist to revoke', async () => {
      pool.query.mockResolvedValue({ rows: [] });
      const result = await sessionsQueries.revokeOldestSession('user-id');
      expect(result).toBeNull();
    });
  });
});
