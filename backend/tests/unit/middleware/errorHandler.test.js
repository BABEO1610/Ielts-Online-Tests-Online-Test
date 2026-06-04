/**
 * Traceability Matrix:
 * - Maps to SPEC §4 (Unwanted: Error handling format)
 * - Maps to SPEC §8 (Error Handling Matrix format and mapping)
 * - Maps to T030 (Centralized Error Handler, winston, map HTTP Status, hide stack trace)
 */
const errorHandler = require('../../../src/middleware/errorHandler');
const AppError = require('../../../src/utils/AppError');
const logger = require('../../../src/utils/logger');

// Mock logger to prevent actual console output during tests
jest.mock('../../../src/utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('Error Handler Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let originalEnv;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    originalEnv = process.env.NODE_ENV;
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should handle AppError and return corresponding status and format', () => {
    process.env.NODE_ENV = 'production';
    const err = new AppError('Registration failed. Please try again.', 400, 'AUTH_REG_001');

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'AUTH_REG_001',
        message: 'Registration failed. Please try again.',
      },
    });
    expect(logger.warn).toHaveBeenCalledWith('Operational Error [AUTH_REG_001]: Registration failed. Please try again.');
  });

  it('should handle generic errors as 500 Internal Server Error', () => {
    process.env.NODE_ENV = 'production';
    const err = new Error('Some unexpected system failure');

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Some unexpected system failure',
      },
    });
    expect(logger.error).toHaveBeenCalledWith('Unhandled Exception:', err);
  });

  it('should include stack trace in development mode', () => {
    process.env.NODE_ENV = 'development';
    const err = new Error('Test Dev Error');

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Test Dev Error',
        stack: expect.any(String),
      },
    });
  });

  it('should handle SyntaxError (JSON Parse Error)', () => {
    process.env.NODE_ENV = 'production';
    const err = new SyntaxError('Unexpected token');
    err.type = 'entity.parse.failed';

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'BAD_REQUEST_JSON',
        message: 'Invalid JSON payload',
      },
    });
  });

  it('should handle JsonWebTokenError', () => {
    process.env.NODE_ENV = 'production';
    const err = new Error('invalid signature');
    err.name = 'JsonWebTokenError';

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'AUTH_SES_001',
        message: 'Invalid token',
      },
    });
  });

  it('should handle TokenExpiredError', () => {
    process.env.NODE_ENV = 'production';
    const err = new Error('jwt expired');
    err.name = 'TokenExpiredError';

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'AUTH_SES_001',
        message: 'Session expired.',
      },
    });
  });
});
