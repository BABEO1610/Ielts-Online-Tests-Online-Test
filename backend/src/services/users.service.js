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
 * @returns {Promise<Object>} The updated user object.
 */
const updateProfile = async (userId, { fullName, avatarUrl, targetBandScore }) => {
  // Validate targetBandScore if provided
  if (targetBandScore !== undefined && targetBandScore !== null) {
    const numScore = Number(targetBandScore);
    
    // EARS[Unwanted]: WHERE a User submits a target_band_score outside [0.0, 9.0] or not divisible by 0.5, THE system SHALL return HTTP 400.
    if (
      isNaN(numScore) ||
      numScore < 0.0 ||
      numScore > 9.0 ||
      numScore % 0.5 !== 0
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
  });

  const { password_hash, ...safeUser } = updatedUser;
  return safeUser;
};

module.exports = {
  getProfile,
  updateProfile,
};
