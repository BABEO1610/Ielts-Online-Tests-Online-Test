/**
 * Traceability Matrix:
 * - SPEC §4 (State-driven): Decode JWT and match session_token against user_sessions. Deny if revoked_at IS NOT NULL OR expires_at < NOW() -> Test "should throw 401 if session is inactive in DB"
 * - SPEC §4 (State-driven): Check Redis cache -> Test "should throw 401 if session is revoked in Redis"
 * - SPEC §4 (State-driven): Block if must_change_password = TRUE -> Test "should throw 403 if must_change_password is true and route is not whitelisted"
 * - SPEC §9 (Edge Cases): Whitelist change password and logout -> Test "should allow access if must_change_password is true but route is whitelisted"
 * - SPEC §8 (Error Handling): AUTH_LOG_001, AUTH_SES_001 mapping -> Checked in all failure tests.
 */

const authenticate = require('../../../src/middleware/authenticate');
const { verifyAccessToken } = require('../../../src/utils/token.util');
const redisClient = require('../../../src/config/redis');
const { findActiveSession } = require('../../../src/db/queries/sessions.queries');
const AppError = require('../../../src/utils/AppError');

// Mock dependencies
jest.mock('../../../src/utils/token.util');
jest.mock('../../../src/config/redis', () => ({
  status: 'ready',
  hget: jest.fn(),
  hset: jest.fn(),
  expire: jest.fn()
}));
jest.mock('../../../src/db/queries/sessions.queries');
jest.mock('../../../src/config/database', () => ({}));
jest.mock('../../../src/utils/AppError', () => {
  return class AppError extends Error {
    constructor(message, statusCode, errorCode) {
      super(message);
      this.statusCode = statusCode;
      this.errorCode = errorCode;
    }
  };
});

describe('Middleware: Authenticate', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      cookies: {},
      path: '/api/v1/users/me'
    };
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should throw 401 AUTH_LOG_001 if no access_token provided', async () => {
    await authenticate(req, res, next);
    
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.errorCode).toBe('AUTH_LOG_001');
  });

  it('should throw 401 AUTH_SES_001 if token is invalid or expired', async () => {
    req.cookies.access_token = 'invalid_token';
    verifyAccessToken.mockReturnValue(null);

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.errorCode).toBe('AUTH_SES_001');
  });

  it('should throw 401 AUTH_SES_001 if token payload missing session_token', async () => {
    req.cookies.access_token = 'valid_token_but_no_session';
    verifyAccessToken.mockReturnValue({ sub: 'user-123', role: 'student' }); // no session_token

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.errorCode).toBe('AUTH_SES_001');
  });

  it('should throw 401 AUTH_SES_001 if session is revoked in Redis', async () => {
    req.cookies.access_token = 'valid_token';
    verifyAccessToken.mockReturnValue({ sub: 'user-123', role: 'student', session_token: 'session-123' });
    redisClient.hget.mockResolvedValue('true');

    await authenticate(req, res, next);

    expect(redisClient.hget).toHaveBeenCalledWith('session:session-123', 'revoked');
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.errorCode).toBe('AUTH_SES_001');
  });

  it('should fallback to DB and throw 401 if session is not active in DB, and cache it to Redis', async () => {
    req.cookies.access_token = 'valid_token';
    verifyAccessToken.mockReturnValue({ sub: 'user-123', role: 'student', session_token: 'session-123' });
    redisClient.hget.mockResolvedValue(null);
    findActiveSession.mockResolvedValue(null); // inactive in DB

    await authenticate(req, res, next);

    expect(findActiveSession).toHaveBeenCalledWith(expect.anything(), 'session-123');
    expect(redisClient.hset).toHaveBeenCalledWith('session:session-123', 'revoked', 'true');
    expect(redisClient.expire).toHaveBeenCalledWith('session:session-123', 900);
    
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.errorCode).toBe('AUTH_SES_001');
  });

  it('should bypass Redis if redisClient.status !== ready', async () => {
    req.cookies.access_token = 'valid_token';
    verifyAccessToken.mockReturnValue({ sub: 'user-123', role: 'student', session_token: 'session-123' });
    redisClient.status = 'error'; // simulate redis down
    findActiveSession.mockResolvedValue({ id: 'session-123' }); // valid in DB

    await authenticate(req, res, next);

    expect(redisClient.hget).not.toHaveBeenCalled();
    expect(findActiveSession).toHaveBeenCalledWith(expect.anything(), 'session-123');
    expect(next).toHaveBeenCalledWith(); // called without error
    expect(req.user).toBeDefined();

    // restore
    redisClient.status = 'ready';
  });

  it('should throw 403 AUTH_PERM_002 if must_change_password is true and route is not whitelisted', async () => {
    req.cookies.access_token = 'valid_token';
    verifyAccessToken.mockReturnValue({ 
      sub: 'user-123', role: 'student', session_token: 'session-123', must_change_password: true 
    });
    redisClient.hget.mockResolvedValue(null);
    findActiveSession.mockResolvedValue({ id: 'session-123' });

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(403);
    expect(error.errorCode).toBe('AUTH_PERM_002');
  });

  it('should allow access if must_change_password is true but route is /api/v1/auth/change-password', async () => {
    req.path = '/api/v1/auth/change-password';
    req.cookies.access_token = 'valid_token';
    verifyAccessToken.mockReturnValue({ 
      sub: 'user-123', role: 'student', session_token: 'session-123', must_change_password: true 
    });
    redisClient.hget.mockResolvedValue(null);
    findActiveSession.mockResolvedValue({ id: 'session-123' });

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(); // called without error
    expect(req.user.must_change_password).toBe(true);
  });

  it('should allow access if must_change_password is true but route is /api/v1/auth/logout', async () => {
    req.path = '/api/v1/auth/logout';
    req.cookies.access_token = 'valid_token';
    verifyAccessToken.mockReturnValue({ 
      sub: 'user-123', role: 'student', session_token: 'session-123', must_change_password: true 
    });
    redisClient.hget.mockResolvedValue(null);
    findActiveSession.mockResolvedValue({ id: 'session-123' });

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(); // called without error
    expect(req.user.must_change_password).toBe(true);
  });

  it('should attach req.user and call next on happy path', async () => {
    req.cookies.access_token = 'valid_token';
    verifyAccessToken.mockReturnValue({ 
      sub: 'user-123', role: 'student', session_token: 'session-123', must_change_password: false 
    });
    redisClient.hget.mockResolvedValue(null);
    findActiveSession.mockResolvedValue({ id: 'session-123' });

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(); // called without error
    expect(req.user).toEqual({
      id: 'user-123',
      role: 'student',
      session_token: 'session-123',
      must_change_password: false
    });
  });
});
