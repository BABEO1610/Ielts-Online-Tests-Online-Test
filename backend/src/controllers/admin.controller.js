/**
 * @file backend/src/controllers/admin.controller.js
 * @description Controller for Admin operations on Users.
 */

/**
 * Factory for Admin Controller using Dependency Injection.
 * 
 * @param {Object} usersService - Injected users service
 * @param {typeof import('../utils/AppError')} AppError - Injected AppError class
 * @param {Object} sessionsService - Injected sessions service
 * @returns {Object} Controller methods
 */
const adminControllerFactory = (usersService, AppError, sessionsService) => {
  return {
    /**
     * Handler for listing users with pagination and filters
     * EARS[Event]: WHEN an Admin requests the user list, THE system SHALL return paginated users based on query parameters.
     * 
     * @param {import('express').Request} req - Express request
     * @param {import('express').Response} res - Express response
     * @param {import('express').NextFunction} next - Express next function
     * @returns {Promise<void>}
     */
    listUsers: async (req, res, next) => {
      try {
        const { page = 1, limit = 10, role, status, search } = req.query;
        
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        
        // Pass to service. Actor role is expected to be 'admin' (checked by authorize middleware)
        const result = await usersService.listUsers(req.user.role, {
          page: pageNum,
          limit: limitNum,
          role,
          status,
          search
        });
        
        res.status(200).json({
          success: true,
          data: result.users,
          error: null,
          meta: {
            page: result.page,
            limit: result.limit,
            total: result.total
          }
        });
      } catch (error) {
        next(error);
      }
    },

    /**
     * Handler for updating a user's role
     * EARS[Event]: WHEN an Admin changes the Role of another User, THE system SHALL update the users record and log the action.
     * 
     * @param {import('express').Request} req - Express request
     * @param {import('express').Response} res - Express response
     * @param {import('express').NextFunction} next - Express next function
     * @returns {Promise<void>}
     */
    updateUserRole: async (req, res, next) => {
      try {
        const actorId = req.user.id;
        const targetId = req.params.id;
        const { role } = req.body;
        
        // EARS[Unwanted]: WHERE an Admin attempts to modify their own role, THE system SHALL return HTTP 403.
        if (actorId === targetId) {
          throw new AppError('You cannot modify your own role.', 403, 'AUTH_PERM_001');
        }
        
        const updatedUser = await usersService.changeUserRole(actorId, targetId, role);
        
        res.status(200).json({
          success: true,
          data: updatedUser,
          error: null,
          meta: null
        });
      } catch (error) {
        next(error);
      }
    },

    /**
     * Handler for updating a user's status
     * EARS[Event]: WHEN an Admin changes the Status of another User, THE system SHALL update the users record and log the action.
     * 
     * @param {import('express').Request} req - Express request
     * @param {import('express').Response} res - Express response
     * @param {import('express').NextFunction} next - Express next function
     * @returns {Promise<void>}
     */
    updateUserStatus: async (req, res, next) => {
      try {
        const actorId = req.user.id;
        const targetId = req.params.id;
        const { status } = req.body;
        
        // EARS[Unwanted]: WHERE an Admin attempts to modify their own status, THE system SHALL return HTTP 403.
        if (actorId === targetId) {
          throw new AppError('You cannot modify your own status.', 403, 'AUTH_PERM_001');
        }
        
        const updatedUser = await usersService.changeUserStatus(actorId, targetId, status);
        
        res.status(200).json({
          success: true,
          data: updatedUser,
          error: null,
          meta: null
        });
      } catch (error) {
        next(error);
      }
    },

    /**
     * Handler for listing all active sessions (Admin only)
     * EARS[Event]: WHEN an Admin requests GET /admin/sessions, THE system SHALL return all active user sessions.
     *
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     * @param {import('express').NextFunction} next
     */
    listSessions: async (req, res, next) => {
      try {
        const sessions = await sessionsService.getAllActiveSessions();
        res.status(200).json({
          success: true,
          data: sessions,
          error: null,
          meta: { total: sessions.length }
        });
      } catch (error) {
        next(error);
      }
    },

    /**
     * Handler for revoking a specific session by ID (Admin only)
     * EARS[Event]: WHEN an Admin calls DELETE /admin/sessions/:id,
     * THE system SHALL revoke the session and log the action.
     *
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     * @param {import('express').NextFunction} next
     */
    revokeSession: async (req, res, next) => {
      try {
        // SEC-10: actorId lấy từ auth middleware, không từ request body/params
        const actorId = req.user.id;
        const sessionId = req.params.id;
        const ipAddress = req.ip;

        const result = await sessionsService.revokeSessionById(sessionId, actorId, ipAddress);
        res.status(200).json({
          success: true,
          data: result,
          error: null,
          meta: null
        });
      } catch (error) {
        next(error);
      }
    }
  };
};

module.exports = adminControllerFactory;
