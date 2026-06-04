/**
 * Traceability Matrix:
 * - findUserByEmail: T010, PLAN §2.5
 * - findUserById: T010, PLAN §2.5
 * - createUser: T010, PLAN §2.5, SPEC §4 (Unwanted: AUTH_REG_001)
 * - updateProfile: T010, PLAN §2.5
 * - updateRole: T010, PLAN §2.5
 * - updateStatus: T010, PLAN §2.5
 */

const { pool } = require('../../../../src/db/pool');
const usersQueries = require('../../../../src/db/queries/users.queries');

jest.mock('../../../../src/db/pool', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('Users Queries', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findUserByEmail', () => {
    it('should return user when found', async () => {
      const mockUser = { id: 'uuid-1', email: 'test@example.com' };
      pool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await usersQueries.findUserByEmail('test@example.com');

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['test@example.com']
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await usersQueries.findUserByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findUserById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: 'uuid-1', email: 'test@example.com' };
      pool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await usersQueries.findUserById('uuid-1');

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        ['uuid-1']
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await usersQueries.findUserById('uuid-1');

      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    const validData = {
      email: 'test@example.com',
      password_hash: 'hashed',
      full_name: 'Test User',
    };

    it('should create and return the new user', async () => {
      const mockCreatedUser = { id: 'uuid-1', ...validData, role: 'student', status: 'pending' };
      pool.query.mockResolvedValueOnce({ rows: [mockCreatedUser] });

      const result = await usersQueries.createUser(validData);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        [validData.email, validData.password_hash, validData.full_name]
      );
      expect(result).toEqual(mockCreatedUser);
    });

    it('should throw AUTH_REG_001 when email already exists', async () => {
      const dbError = new Error('duplicate key value violates unique constraint');
      dbError.code = '23505';
      pool.query.mockRejectedValueOnce(dbError);

      try {
        await usersQueries.createUser(validData);
        // Fail test if no error thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err.code).toBe('AUTH_REG_001');
        expect(err.message).toBe('Email already exists');
      }
    });

    it('should throw original error for other DB errors', async () => {
      const dbError = new Error('Some DB error');
      dbError.code = '50000';
      pool.query.mockRejectedValueOnce(dbError);

      await expect(usersQueries.createUser(validData)).rejects.toThrow('Some DB error');
    });
  });

  describe('updateProfile', () => {
    it('should update and return the user profile', async () => {
      const updateData = { full_name: 'New Name', avatar_url: 'http://url', target_band_score: 7.0 };
      const mockUpdatedUser = { id: 'uuid-1', ...updateData };
      pool.query.mockResolvedValueOnce({ rows: [mockUpdatedUser] });

      const result = await usersQueries.updateProfile('uuid-1', updateData);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['uuid-1', updateData.full_name, updateData.avatar_url, updateData.target_band_score]
      );
      expect(result).toEqual(mockUpdatedUser);
    });
  });

  describe('updateRole', () => {
    it('should update and return user role', async () => {
      const mockUpdatedUser = { id: 'uuid-1', role: 'admin' };
      pool.query.mockResolvedValueOnce({ rows: [mockUpdatedUser] });

      const result = await usersQueries.updateRole('uuid-1', 'admin');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['uuid-1', 'admin']
      );
      expect(result).toEqual(mockUpdatedUser);
    });
  });

  describe('updateStatus', () => {
    it('should update and return user status', async () => {
      const mockUpdatedUser = { id: 'uuid-1', status: 'active' };
      pool.query.mockResolvedValueOnce({ rows: [mockUpdatedUser] });

      const result = await usersQueries.updateStatus('uuid-1', 'active');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['uuid-1', 'active']
      );
      expect(result).toEqual(mockUpdatedUser);
    });
  });
});
