const SubmissionService = require('../../src/services/submission.service');
const { pool } = require('../../src/db/pool');

jest.mock('../../src/db/pool', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn()
  }
}));

jest.mock('../../src/config/supabase', () => ({
  storage: {
    from: jest.fn(() => ({
      getPublicUrl: jest.fn((path) => ({
        data: { publicUrl: `https://supabase.test/storage/v1/object/public/speaking-audio/${path}` }
      }))
    }))
  }
}));

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

    it('should submit successfully with uploaded Supabase audio path', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'test-id' }] }); // Test exists
      
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 'sub-1',
            audio_url: 'https://supabase.test/storage/v1/object/public/speaking-audio/speaking/1/uuid.webm'
          }]
        }) // INSERT
        .mockResolvedValueOnce(); // COMMIT

      const result = await SubmissionService.submitSpeaking('1', 'test-id', 1, 'speaking/1/uuid.webm', 'ai');

      expect(result.id).toBe('sub-1');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO speaking_submissions'),
        [
          '1',
          'test-id',
          1,
          'https://supabase.test/storage/v1/object/public/speaking-audio/speaking/1/uuid.webm',
          'ai'
        ]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should reject audio paths outside the current user folder', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'test-id' }] });

      await expect(SubmissionService.submitSpeaking('1', 'test-id', 1, 'speaking/2/uuid.webm', 'ai'))
        .rejects.toMatchObject({
          message: 'Invalid speaking audio path',
          statusCode: 400,
          errorCode: 'INVALID_AUDIO_PATH'
        });

      expect(pool.connect).not.toHaveBeenCalled();
    });
  });

  describe('getSpeakingAudioUrl', () => {
    it('should return the stored public URL for tutors', async () => {
      const url = 'https://supabase.test/storage/v1/object/public/speaking-audio/speaking/user-1/uuid.webm';
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 'sub-1', user_id: 'user-1', audio_url: url }]
      });

      const result = await SubmissionService.getSpeakingAudioUrl('sub-1', {
        id: 'tutor-1',
        role: 'tutor'
      });

      expect(result).toBe(url);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT id, user_id, audio_url FROM speaking_submissions WHERE id = $1',
        ['sub-1']
      );
    });

    it('should scope student audio lookup to the current student', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 'sub-1', user_id: 'user-1', audio_url: 'speaking/user-1/uuid.webm' }]
      });

      const result = await SubmissionService.getSpeakingAudioUrl('sub-1', {
        id: 'user-1',
        role: 'student'
      });

      expect(result).toBe('https://supabase.test/storage/v1/object/public/speaking-audio/speaking/user-1/uuid.webm');
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT id, user_id, audio_url FROM speaking_submissions WHERE id = $1 AND user_id = $2',
        ['sub-1', 'user-1']
      );
    });

    it('should reject unsupported roles', async () => {
      await expect(SubmissionService.getSpeakingAudioUrl('sub-1', {
        id: 'user-1',
        role: 'guest'
      })).rejects.toMatchObject({
        statusCode: 403,
        errorCode: 'AUTH_PERM_001'
      });

      expect(pool.query).not.toHaveBeenCalled();
    });
  });
});
