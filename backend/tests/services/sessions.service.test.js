/**
 * @file backend/tests/services/sessions.service.test.js
 * @description Unit tests cho sessions.service.js
 *
 * Traceability Matrix:
 * | Test Case                               | EARS Requirement                                           | Coverage         |
 * |-----------------------------------------|------------------------------------------------------------|------------------|
 * | getAllActiveSessions - happy path        | WHEN Admin requests sessions list, SHALL return all active | Happy path       |
 * | getAllActiveSessions - map device        | SHALL parse user_agent thành chuỗi device thân thiện       | Happy path       |
 * | getAllActiveSessions - DB error          | SHALL propagate lỗi nếu DB thất bại                       | Error case       |
 * | revokeSessionById - happy path          | WHEN Admin revokes session, SHALL set revoked_at + audit   | Happy path       |
 * | revokeSessionById - session not found   | WHERE session không tìm thấy, SHALL throw HTTP 404         | Error case       |
 * | revokeSessionById - audit log failure   | WHERE audit log fail, SHALL propagate error                | Error case       |
 * | parseDevice - known browsers/OS         | SHALL return browser · OS string                           | Happy path       |
 * | parseDevice - null input                | SHALL return 'Unknown' nếu userAgent null                  | Edge case        |
 */

const sessionsService = require('../../src/services/sessions.service');
const sessionsQueries = require('../../src/db/queries/sessions.queries');
const AuditLogService = require('../../src/services/audit.service');

// Mock dependencies — tuân thủ ARTICLE 5: không gọi DB thực trong unit test
jest.mock('../../src/db/queries/sessions.queries', () => ({
  listAllActiveSessions: jest.fn(),
  revokeSessionById: jest.fn(),
}));

jest.mock('../../src/services/audit.service', () => ({
  logAction: jest.fn(),
}));

const MOCK_DB_ROWS = [
  {
    id: 'uuid-sess-1',
    user_id: 'uuid-user-1',
    full_name: 'Le Tien Thanh',
    email: 'thanh@example.com',
    ip_address: '113.161.42.10',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit Chrome/124',
    is_oauth: false,
    oauth_provider: null,
    last_active_at: new Date('2026-06-17T10:00:00Z'),
    expires_at: new Date('2026-06-24T10:00:00Z'),
  },
  {
    id: 'uuid-sess-2',
    user_id: 'uuid-user-2',
    full_name: null,
    email: 'oauth@gmail.com',
    ip_address: '14.169.20.7',
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS) Safari/604',
    is_oauth: true,
    oauth_provider: 'google',
    last_active_at: new Date('2026-06-17T08:00:00Z'),
    expires_at: new Date('2026-06-24T08:00:00Z'),
  },
];

describe('sessionsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── parseDevice ───────────────────────────────────────────────────────────
  describe('parseDevice', () => {
    it('should return "Chrome · Windows" for Chrome on Windows user agent', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537 Chrome/124.0';
      expect(sessionsService.parseDevice(ua)).toBe('Chrome · Windows');
    });

    it('should return "Safari · iOS" for Safari on iPhone user agent', () => {
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17) AppleWebKit/605 Safari/604';
      expect(sessionsService.parseDevice(ua)).toBe('Safari · iOS');
    });

    it('should return "Firefox · Linux" for Firefox on Linux', () => {
      const ua = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64) Gecko/20100101 Firefox/124.0';
      expect(sessionsService.parseDevice(ua)).toBe('Firefox · Linux');
    });

    it('should return "Unknown" when userAgent is null', () => {
      expect(sessionsService.parseDevice(null)).toBe('Unknown');
    });

    it('should return "Unknown" when userAgent is empty string', () => {
      expect(sessionsService.parseDevice('')).toBe('Unknown');
    });
  });

  // ── getAllActiveSessions ──────────────────────────────────────────────────
  describe('getAllActiveSessions', () => {
    it('should return mapped sessions array (happy path)', async () => {
      sessionsQueries.listAllActiveSessions.mockResolvedValueOnce(MOCK_DB_ROWS);

      const result = await sessionsService.getAllActiveSessions();

      expect(sessionsQueries.listAllActiveSessions).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);

      // Verify mapping: first session
      expect(result[0]).toMatchObject({
        id: 'uuid-sess-1',
        user: 'Le Tien Thanh',
        email: 'thanh@example.com',
        device: 'Chrome · Windows',
        ip: '113.161.42.10',
        is_oauth: false,
        provider: null,
      });

      // Verify mapping: fallback to email khi full_name là null
      expect(result[1]).toMatchObject({
        id: 'uuid-sess-2',
        user: 'oauth@gmail.com',
        email: 'oauth@gmail.com',
        device: 'Safari · iOS',
        is_oauth: true,
        provider: 'google',
      });
    });

    it('should return empty array when no active sessions exist', async () => {
      sessionsQueries.listAllActiveSessions.mockResolvedValueOnce([]);

      const result = await sessionsService.getAllActiveSessions();

      expect(result).toEqual([]);
    });

    it('should propagate DB error (error case)', async () => {
      const dbError = new Error('DB Connection lost');
      sessionsQueries.listAllActiveSessions.mockRejectedValueOnce(dbError);

      await expect(sessionsService.getAllActiveSessions())
        .rejects.toThrow('DB Connection lost');
    });
  });

  // ── revokeSessionById ────────────────────────────────────────────────────
  describe('revokeSessionById', () => {
    const ACTOR_ID = 'uuid-admin-1';
    const SESSION_ID = 'uuid-sess-1';
    const IP = '192.168.1.1';

    it('should revoke session and log audit (happy path)', async () => {
      const mockRevoked = {
        id: SESSION_ID,
        user_id: 'uuid-user-1',
        session_token: 'tok_abc',
        expires_at: new Date(),
        revoked_at: new Date(),
      };
      sessionsQueries.revokeSessionById.mockResolvedValueOnce(mockRevoked);
      AuditLogService.logAction.mockResolvedValueOnce();

      const result = await sessionsService.revokeSessionById(SESSION_ID, ACTOR_ID, IP);

      expect(sessionsQueries.revokeSessionById).toHaveBeenCalledWith(SESSION_ID);
      expect(AuditLogService.logAction).toHaveBeenCalledWith(
        ACTOR_ID,
        'logout',
        'user_sessions',
        SESSION_ID,
        { revoked_at: null },
        { revoked_at: mockRevoked.revoked_at },
        IP
      );
      expect(result).toEqual({ id: SESSION_ID });
    });

    it('should throw 404 when session not found or already revoked (error case)', async () => {
      sessionsQueries.revokeSessionById.mockResolvedValueOnce(null);

      await expect(sessionsService.revokeSessionById(SESSION_ID, ACTOR_ID, IP))
        .rejects.toMatchObject({
          statusCode: 404,
          errorCode: 'SES_ADM_001',
          message: 'Session not found or already revoked',
        });

      // Audit log không được gọi khi session không tìm thấy
      expect(AuditLogService.logAction).not.toHaveBeenCalled();
    });

    it('should propagate error when audit log fails (error case)', async () => {
      const mockRevoked = {
        id: SESSION_ID,
        user_id: 'uuid-user-1',
        session_token: 'tok_abc',
        expires_at: new Date(),
        revoked_at: new Date(),
      };
      sessionsQueries.revokeSessionById.mockResolvedValueOnce(mockRevoked);
      AuditLogService.logAction.mockRejectedValueOnce(new Error('Audit DB failed'));

      await expect(sessionsService.revokeSessionById(SESSION_ID, ACTOR_ID, IP))
        .rejects.toThrow('Audit DB failed');
    });
  });
});
