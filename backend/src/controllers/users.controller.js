/**
 * @file backend/src/controllers/users.controller.js
 * @description Controller for handling user profile related endpoints.
 */

const usersService = require('../services/users.service');

/**
 * Get current user's profile.
 * EARS[Event]: WHEN a user requests their profile, THE system SHALL return the user object.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await usersService.getProfile(userId);

    res.status(200).json({
      success: true,
      data: profile,
      error: null,
      meta: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update current user's profile.
 * EARS[Event]: WHEN a User requests a Profile update (full_name, avatar_url, target_band_score), THE system SHALL validate the input, update the users table, set updated_at = NOW(), and return the updated user object.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { full_name, avatar_url, target_band_score } = req.body;

    const updatedProfile = await usersService.updateProfile(userId, {
      fullName: full_name,
      avatarUrl: avatar_url,
      targetBandScore: target_band_score
    });

    res.status(200).json({
      success: true,
      data: updatedProfile,
      error: null,
      meta: null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile
};
