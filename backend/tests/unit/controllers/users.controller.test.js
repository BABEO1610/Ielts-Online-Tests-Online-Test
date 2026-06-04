/**
 * @file backend/tests/unit/controllers/users.controller.test.js
 * @description Unit tests for User Controller.
 * 
 * Traceability Matrix:
 * | EARS/Requirement | Test Case |
 * |------------------|-----------|
 * | USER-09 (Event)  | should return 200 and the user profile when getting profile |
 * | USER-09 (Event)  | should return 200 and updated user profile when updating profile |
 * | HTTP 400 Error   | should call next with error when updateProfile fails (e.g., target_band_score invalid) |
 * | Unwanted Error   | should call next with error when getProfile fails (e.g. user not found) |
 */

const usersController = require('../../../src/controllers/users.controller');
const usersService = require('../../../src/services/users.service');

// Mock users service
jest.mock('../../../src/services/users.service');

describe('User Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { id: 'user-id-123' },
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return 200 and the user profile when getting profile', async () => {
      // Arrange
      const mockProfile = { id: 'user-id-123', full_name: 'John Doe', email: 'john@example.com' };
      usersService.getProfile.mockResolvedValue(mockProfile);

      // Act
      await usersController.getProfile(req, res, next);

      // Assert
      expect(usersService.getProfile).toHaveBeenCalledWith('user-id-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockProfile,
        error: null,
        meta: null
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error when getProfile fails', async () => {
      // Arrange
      const mockError = new Error('User not found');
      mockError.statusCode = 404;
      usersService.getProfile.mockRejectedValue(mockError);

      // Act
      await usersController.getProfile(req, res, next);

      // Assert
      expect(usersService.getProfile).toHaveBeenCalledWith('user-id-123');
      expect(next).toHaveBeenCalledWith(mockError);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('should return 200 and updated user profile when updating profile', async () => {
      // Arrange
      req.body = {
        full_name: 'John Doe Updated',
        avatar_url: 'http://example.com/avatar.jpg',
        target_band_score: 7.5
      };
      const mockUpdatedProfile = {
        id: 'user-id-123',
        full_name: 'John Doe Updated',
        avatar_url: 'http://example.com/avatar.jpg',
        target_band_score: 7.5
      };
      usersService.updateProfile.mockResolvedValue(mockUpdatedProfile);

      // Act
      await usersController.updateProfile(req, res, next);

      // Assert
      expect(usersService.updateProfile).toHaveBeenCalledWith('user-id-123', {
        fullName: 'John Doe Updated',
        avatarUrl: 'http://example.com/avatar.jpg',
        targetBandScore: 7.5
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedProfile,
        error: null,
        meta: null
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error when updateProfile fails (e.g., target_band_score invalid)', async () => {
      // Arrange
      req.body = {
        target_band_score: 7.3 // Invalid boundary value
      };
      const mockError = new Error('Target Band Score must be between 0 and 9, in 0.5 increments.');
      mockError.statusCode = 400;
      usersService.updateProfile.mockRejectedValue(mockError);

      // Act
      await usersController.updateProfile(req, res, next);

      // Assert
      expect(usersService.updateProfile).toHaveBeenCalledWith('user-id-123', {
        fullName: undefined,
        avatarUrl: undefined,
        targetBandScore: 7.3
      });
      expect(next).toHaveBeenCalledWith(mockError);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
