/**
 * @file backend/tests/unit/services/users.profile.test.js
 * @description Unit tests for users service (Profile).
 * 
 * Traceability Matrix:
 * - USER-09: As a Student, I want to view and update my profile (Name, Avatar, Target Band Score).
 * - AUTH_PROF_001: Target Band Score must be between 0 and 9, in 0.5 increments.
 */

const { getProfile, updateProfile } = require('../../../src/services/users.service');
const usersQueries = require('../../../src/db/queries/users.queries');

// Mock queries
jest.mock('../../../src/db/queries/users.queries');

describe('Users Service - Profile (T027)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile without password_hash', async () => {
      // EARS[Event]: WHEN a user requests their profile...
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        password_hash: 'hashedpassword123',
        status: 'active'
      };

      usersQueries.findUserById.mockResolvedValue(mockUser);

      const result = await getProfile('user-123');

      expect(usersQueries.findUserById).toHaveBeenCalledWith('user-123');
      expect(result).not.toHaveProperty('password_hash');
      expect(result.id).toBe('user-123');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw NOT_FOUND if user does not exist', async () => {
      usersQueries.findUserById.mockResolvedValue(null);

      await expect(getProfile('invalid-id')).rejects.toThrow('User not found');
    });
  });

  describe('updateProfile', () => {
    const validUserId = 'user-123';
    
    beforeEach(() => {
      usersQueries.findUserById.mockResolvedValue({
        id: validUserId,
        email: 'test@example.com',
        full_name: 'Old Name'
      });
      
      usersQueries.updateProfile.mockImplementation((id, data) => Promise.resolve({
        id,
        email: 'test@example.com',
        full_name: data.full_name,
        avatar_url: data.avatar_url,
        target_band_score: data.target_band_score
      }));
    });

    it('should successfully update profile with valid target_band_score (Happy Path)', async () => {
      // EARS[Event]: WHEN a User requests a Profile update...
      const updateData = {
        fullName: 'New Name',
        avatarUrl: 'https://example.com/avatar.png',
        targetBandScore: 7.5
      };

      const result = await updateProfile(validUserId, updateData);

      expect(usersQueries.updateProfile).toHaveBeenCalledWith(validUserId, {
        full_name: 'New Name',
        avatar_url: 'https://example.com/avatar.png',
        target_band_score: 7.5
      });
      expect(result.full_name).toBe('New Name');
      expect(result.target_band_score).toBe(7.5);
    });

    it('should successfully update profile with boundary target_band_score (0.0)', async () => {
      await updateProfile(validUserId, { fullName: 'Name', targetBandScore: 0.0 });
      expect(usersQueries.updateProfile).toHaveBeenCalledWith(validUserId, expect.objectContaining({
        target_band_score: 0.0
      }));
    });

    it('should successfully update profile with boundary target_band_score (9.0)', async () => {
      await updateProfile(validUserId, { fullName: 'Name', targetBandScore: 9.0 });
      expect(usersQueries.updateProfile).toHaveBeenCalledWith(validUserId, expect.objectContaining({
        target_band_score: 9.0
      }));
    });

    // Error Cases (Unwanted patterns)
    const invalidScores = [
      { value: -0.5, desc: 'negative' },
      { value: 9.5, desc: 'greater than 9' },
      { value: 7.2, desc: 'not divisible by 0.5' },
      { value: 'abc', desc: 'not a number string' },
      { value: NaN, desc: 'NaN' }
    ];

    invalidScores.forEach(({ value, desc }) => {
      it(`should throw AUTH_PROF_001 error when targetBandScore is invalid (${desc}: ${value})`, async () => {
        // EARS[Unwanted]: WHERE a User submits a target_band_score outside [0.0, 9.0] or not divisible by 0.5...
        await expect(updateProfile(validUserId, { targetBandScore: value }))
          .rejects
          .toMatchObject({
            code: 'AUTH_PROF_001',
            statusCode: 400
          });
      });
    });

    it('should allow updating profile without providing targetBandScore', async () => {
      const result = await updateProfile(validUserId, { fullName: 'New Name' });
      expect(usersQueries.updateProfile).toHaveBeenCalledWith(validUserId, {
        full_name: 'New Name',
        avatar_url: undefined,
        target_band_score: undefined
      });
      expect(result.full_name).toBe('New Name');
    });

    it('should throw NOT_FOUND if user does not exist during update', async () => {
      usersQueries.findUserById.mockResolvedValue(null);
      
      await expect(updateProfile('invalid-id', { fullName: 'Test' }))
        .rejects
        .toMatchObject({
          code: 'NOT_FOUND',
          statusCode: 404
        });
    });
  });
});
