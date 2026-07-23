/**
 * @file backend/src/services/users.service.js
 * @description Service for managing user profiles and other user-related operations.
 */

const usersQueries = require('../db/queries/users.queries');

/**
 * Retrieves a user's profile.
 * EARS[Event]: WHEN a user requests their profile, THE system SHALL return the user object.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Object>} The user profile data.
 */
const getProfile = async (userId) => {
  const user = await usersQueries.findUserById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.code = 'NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }
  
  // Return safe user object (omit password_hash)
  const { password_hash, ...safeUser } = user;
  safeUser.has_password = !!password_hash;
  return safeUser;
};

/**
 * Updates a user's profile.
 * EARS[Event]: WHEN a User requests a Profile update (full_name, avatar_url, target_band_score), THE system SHALL validate the input, update the users table, set updated_at = NOW(), and return the updated user object.
 * @param {string} userId - The ID of the user.
 * @param {Object} profileData - The data to update.
 * @param {string} profileData.fullName - The user's full name.
 * @param {string} [profileData.avatarUrl] - The user's avatar URL.
 * @param {number} [profileData.targetBandScore] - The user's target band score.
 * @param {string} [profileData.targetTestDate] - The user's target test date.
 * @returns {Promise<Object>} The updated user object.
 */
const updateProfile = async (userId, { fullName, avatarUrl, targetBandScore, targetTestDate }) => {
  // Validate targetBandScore if provided
  if (targetBandScore !== undefined && targetBandScore !== null) {
    const numScore = Number(targetBandScore);
    
    // EARS[Unwanted]: WHERE a User submits a target_band_score outside [0.0, 9.0] or not divisible by 0.5, THE system SHALL return HTTP 400.
    if (
      isNaN(numScore) ||
      numScore < 0.0 ||
      numScore > 9.0 ||
      (numScore * 10) % 5 !== 0
    ) {
      const error = new Error('Target Band Score must be between 0 and 9, in 0.5 increments.');
      error.code = 'AUTH_PROF_001';
      error.statusCode = 400;
      throw error;
    }
  }

  // Check if user exists before updating
  const existingUser = await usersQueries.findUserById(userId);
  if (!existingUser) {
    const error = new Error('User not found');
    error.code = 'NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }

  const updatedUser = await usersQueries.updateProfile(userId, {
    full_name: fullName,
    avatar_url: avatarUrl,
    target_band_score: targetBandScore,
    target_test_date: targetTestDate ? new Date(targetTestDate).toISOString().split('T')[0] : null,
  });

  const { password_hash, ...safeUser } = updatedUser;
  return safeUser;
};

const AuditLogService = require('./audit.service');
const sessionsQueries = require('../db/queries/sessions.queries');

/**
 * Lists users with pagination and filters.
 * EARS[Event]: WHEN listUsers is called, THE system SHALL return paginated safe users based on query parameters.
 * @param {string} actorRole - The role of the user requesting the list.
 * @param {Object} filters
 * @returns {Promise<Object>} Paginated users.
 */
const listUsers = async (actorRole, { page, limit, role, status, search }) => {
  if (actorRole !== 'admin') {
    const error = new Error('You do not have permission to perform this action.');
    error.code = 'AUTH_PERM_001';
    error.statusCode = 403;
    throw error;
  }
  
  const result = await usersQueries.listUsers({ page, limit, role, status, search });
  
  const safeUsers = result.rows.map(user => {
    const { password_hash, ...safeUser } = user;
    return safeUser;
  });
  
  return {
    users: safeUsers,
    total: result.total,
    page,
    limit
  };
};

/**
 * Changes a user's role.
 * EARS[Event]: WHEN an Admin changes the Role of another User, THE system SHALL update the users record and log the action.
 * @param {string} actorId - The ID of the admin.
 * @param {string} targetId - The ID of the user.
 * @param {string} role - The new role.
 * @returns {Promise<Object>} The updated user.
 */
const changeUserRole = async (actorId, targetId, role) => {
  if (actorId === targetId) {
    const error = new Error('Cannot change your own role');
    error.code = 'AUTH_PERM_001';
    error.statusCode = 403;
    throw error;
  }
  
  const oldUser = await usersQueries.findUserById(targetId);
  if (!oldUser) {
    const error = new Error('User not found');
    error.code = 'NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }
  
  const updatedUser = await usersQueries.updateRole(targetId, role);
  
  // Revoke all sessions
  await sessionsQueries.revokeAllSessionsForUser(targetId);
  
  // Log action
  await AuditLogService.logAction(
    actorId,
    'role_changed',
    'users',
    targetId,
    { role: oldUser.role },
    { role: updatedUser.role },
    null,
    true
  );
  
  const { password_hash, ...safeUser } = updatedUser;
  return safeUser;
};

/**
 * Changes a user's status.
 * EARS[Event]: WHEN an Admin changes the Status of another User, THE system SHALL update the users record and log the action.
 * @param {string} actorId - The ID of the admin.
 * @param {string} targetId - The ID of the user.
 * @param {string} status - The new status.
 * @returns {Promise<Object>} The updated user.
 */
const changeUserStatus = async (actorId, targetId, status) => {
  if (actorId === targetId) {
    const error = new Error('Cannot change your own status');
    error.code = 'AUTH_PERM_001';
    error.statusCode = 403;
    throw error;
  }
  
  const oldUser = await usersQueries.findUserById(targetId);
  if (!oldUser) {
    const error = new Error('User not found');
    error.code = 'NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }
  
  const updatedUser = await usersQueries.updateStatus(targetId, status);
  
  // Revoke all sessions if deactivated/banned
  if (status === 'inactive' || status === 'banned') {
    await sessionsQueries.revokeAllSessionsForUser(targetId);
  }
  
  // Log action
  let actionName = 'user_updated';
  if (status === 'inactive' || status === 'banned') actionName = 'user_deactivated';
  
  await AuditLogService.logAction(
    actorId,
    actionName,
    'users',
    targetId,
    { status: oldUser.status },
    { status: updatedUser.status },
    null,
    true
  );
  
  const { password_hash, ...safeUser } = updatedUser;
  return safeUser;
};

module.exports = {
  getProfile,
  updateProfile,
  listUsers,
  changeUserRole,
  changeUserStatus,
};
