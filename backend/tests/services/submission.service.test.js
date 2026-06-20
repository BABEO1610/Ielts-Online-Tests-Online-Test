const SubmissionService = require('../../src/services/submission.service');
const { pool } = require('../../src/db/pool');
const fs = require('fs');
const AppError = require('../../src/utils/AppError');

jest.mock('../../src/db/pool', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn()
  }
}));

jest.mock('fs', () => {
  return {
    promises: {
      access: jest.fn(),
      rename: jest.fn()
    },
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    constants: { F_OK: 0 }
  };
});

describe('SubmissionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('submitSpeaking', () => {
    const mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    beforeEach(() => {
      pool.connect.mockResolvedValue(mockClient);
    });

    it('should submit successfully and move file', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'test-id' }] }); // Test exists
      fs.promises.access.mockResolvedValueOnce(); // File exists
      fs.existsSync.mockReturnValueOnce(true);
      
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'sub-1', audio_url: '/uploads/speaking/1/uuid.webm' }] }) // INSERT
        .mockResolvedValueOnce(); // COMMIT

      const result = await SubmissionService.submitSpeaking('1', 'test-id', 1, 'uuid.webm', 'ai');

      expect(result.id).toBe('sub-1');
      expect(fs.promises.rename).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should rollback if move file fails', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'test-id' }] });
      fs.promises.access.mockResolvedValueOnce();
      fs.existsSync.mockReturnValueOnce(true);
      
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'sub-1' }] }); // INSERT
        
      fs.promises.rename.mockRejectedValueOnce(new Error('Move failed'));

      await expect(SubmissionService.submitSpeaking('1', 'test-id', 1, 'uuid.webm', 'ai'))
        .rejects.toThrow('Move failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('createAttempt', () => {
    const mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    beforeEach(() => {
      pool.connect.mockResolvedValue(mockClient);
      mockClient.query.mockReset();
    });

    it('should create a mock speaking attempt with null test_id for numeric mock ids', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'attempt-1', status: 'in_progress' }] })
        .mockResolvedValueOnce(); // COMMIT

      const result = await SubmissionService.createAttempt('user-1', '2');

      expect(result.id).toBe('attempt-1');
      expect(pool.query).not.toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO speaking_attempts'),
        ['user-1', null]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should return a clear error when speaking attempt tables are missing', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockRejectedValueOnce(Object.assign(new Error('relation does not exist'), { code: '42P01' }));

      await expect(SubmissionService.createAttempt('user-1', null))
        .rejects.toMatchObject({
          message: 'Speaking tables are missing. Run backend migrations, then restart the server.',
          statusCode: 500,
          errorCode: 'SPEAKING_SCHEMA_MISSING'
        });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should reject an unknown real speaking test id before inserting', async () => {
      const testId = '11111111-1111-4111-8111-111111111111';
      pool.query.mockResolvedValueOnce({ rows: [] });

      await expect(SubmissionService.createAttempt('user-1', testId))
        .rejects.toMatchObject({
          message: 'Speaking test not found',
          statusCode: 404,
          errorCode: 'TEST_NOT_FOUND'
        });

      expect(pool.connect).not.toHaveBeenCalled();
    });
  });
});
