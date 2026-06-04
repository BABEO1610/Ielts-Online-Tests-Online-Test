/**
 * Factory for rate limit middlewares.
 *
 * @param {typeof import('express-rate-limit').rateLimit} rateLimit - Dependency injected express-rate-limit function
 * @returns {Object} An object containing configured rate limiter middlewares
 */
const rateLimitFactory = (rateLimit) => {
  /**
   * Helper function to create a standardized rate limiter
   * 
   * @param {number} maxRequests - Maximum number of requests allowed within the window
   * @param {number} windowMinutes - Time window in minutes
   * @param {string} message - Custom error message to return when limit is exceeded
   * @returns {import('express').RequestHandler} - Express rate limit middleware
   */
  const createLimiter = (maxRequests, windowMinutes, message) => {
    return rateLimit({
      windowMs: windowMinutes * 60 * 1000,
      max: maxRequests,
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      handler: (req, res, next) => {
        // EARS[Unwanted]: WHERE a User exceeds the API rate limit, THE system SHALL return HTTP 429 Too Many Requests.
        const response = {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: message || 'Too many requests, please try again later.'
          }
        };
        res.status(429).json(response);
      }
    });
  };

  return {
    /**
     * Rate limiter for login endpoints (20 req / 1 min)
     * EARS[Ubiquitous]: THE system SHALL enforce a max of 20 req/min for Login endpoints.
     * @type {import('express').RequestHandler}
     */
    loginLimiter: createLimiter(20, 1, 'Too many login attempts from this IP, please try again after a minute.'),

    /**
     * Rate limiter for registration endpoints (10 req / 1 min)
     * EARS[Ubiquitous]: THE system SHALL enforce a max of 10 req/min for Register endpoints.
     * @type {import('express').RequestHandler}
     */
    registerLimiter: createLimiter(10, 1, 'Too many registration attempts from this IP, please try again after a minute.'),

    /**
     * Rate limiter for forgot password endpoints (5 req / 1 min)
     * EARS[Ubiquitous]: THE system SHALL enforce a max of 5 req/min for Forgot Password endpoints.
     * @type {import('express').RequestHandler}
     */
    forgotPasswordLimiter: createLimiter(5, 1, 'Too many password reset requests from this IP, please try again after a minute.')
  };
};

module.exports = rateLimitFactory;
