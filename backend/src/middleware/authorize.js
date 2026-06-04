/**
 * Factory for authorize middleware.
 * 
 * @param {typeof import('../utils/AppError')} AppError - Dependency injected AppError class
 * @returns {function(string|string[]): import('express').RequestHandler} - The authorize middleware factory
 */
const authorizeFactory = (AppError) => {
  /**
   * Authorize middleware
   * 
   * @param {string|string[]} requiredRole - The role(s) required to access the route
   * @returns {import('express').RequestHandler} - Express middleware function
   */
  return (requiredRole) => {
    /**
     * Express Request Handler
     * 
     * @param {import('express').Request} req - Express request object
     * @param {import('express').Response} res - Express response object
     * @param {import('express').NextFunction} next - Express next function
     */
    return (req, res, next) => {
      // EARS[State-driven]: WHILE a request passes through the authorize middleware, THE system SHALL compare req.user.role with requiredRole.
      if (!req.user || !req.user.role) {
        // EARS[Unwanted]: WHERE a User lacks required permissions, THE system SHALL return HTTP 403 AUTH_PERM_001.
        return next(new AppError('You do not have permission to perform this action.', 403, 'AUTH_PERM_001'));
      }

      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

      if (!roles.includes(req.user.role)) {
        // EARS[Unwanted]: WHERE a User lacks required permissions, THE system SHALL return HTTP 403 AUTH_PERM_001.
        return next(new AppError('You do not have permission to perform this action.', 403, 'AUTH_PERM_001'));
      }

      next();
    };
  };
};

module.exports = authorizeFactory;
