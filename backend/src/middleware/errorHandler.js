const logger = require('../utils/logger');

/**
 * Centralized Error Handler Middleware
 * Maps HTTP Status codes and hides stack trace in production environments.
 * 
 * @param {Error} err - Error object
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next function
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errorCode = err.errorCode || err.code || 'INTERNAL_ERROR';

  // Handle specific library/native errors gracefully
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      errorCode = 'FILE_TOO_LARGE';
      message = 'File tải lên vượt quá giới hạn 200MB.';
    } else {
      statusCode = 422;
      errorCode = err.code || 'UPLOAD_VALIDATION_ERROR';
      message = 'Dữ liệu file upload không hợp lệ.';
    }
  } else if (err.name === 'SyntaxError' && err.type === 'entity.parse.failed') {
    // EARS[Unwanted]: WHERE a JSON syntax error occurs in body, return 400
    statusCode = 400;
    errorCode = 'BAD_REQUEST_JSON';
    message = 'Invalid JSON payload';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'AUTH_SES_001';
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'AUTH_SES_001';
    message = 'Session expired.';
  }

  if (statusCode >= 500 && err.isOperational !== true) {
    errorCode = 'INTERNAL_ERROR';
    message = 'Đã xảy ra lỗi hệ thống.';
  }

  // EARS[Event]: WHEN an error occurs, THE system SHALL log it using winston.
  if (statusCode === 500) {
    logger.error('Unhandled Exception:', err);
  } else {
    logger.warn(`Operational Error [${errorCode}]: ${message}`);
  }

  const response = {
    success: false,
    data: null,
    error: {
      code: errorCode,
      message,
      details: err.details || null,
    },
    meta: {
      request_id: req.id || null,
    },
  };

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
