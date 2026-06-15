const TestService = require('../../src/services/test.service');
const { pool } = require('../../src/db/pool');

jest.mock('../../src/db/pool', () => {
  const mClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  return {
    pool: {
      connect: jest.fn(() => Promise.resolve(mClient)),
    },
  };
});

describe('TestService', () => {
  let client;

  beforeEach(async () => {
    jest.clearAllMocks();
    client = await pool.connect();
  });

  describe('createReadingTest', () => {
    const mockData = {
      title: 'Mock Reading Test',
      description: 'Desc',
      difficulty: 'intermediate',
      duration: 60,
      publishAt: new Date().toISOString(),
      passages: [
        {
          title: 'Passage 1',
          instruction: 'Instruction',
          content: 'Content',
          blocks: [
            {
              type: 'Multiple Choice',
              range: '1-5',
              questions: [
                {
                  questionOrder: 1,
                  text: 'Q1',
                  options: [{ id: 1, text: 'Opt1' }],
                  correctAnswers: [1]
                }
              ]
            }
          ]
        }
      ]
    };
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    it('should successfully create a test with hierarchical data (Happy Path)', async () => {
      // Mock returns for each INSERT query
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'test-1' }] }) // mock_tests
        .mockResolvedValueOnce({ rows: [{ id: 'passage-1' }] }) // test_passages
        .mockResolvedValueOnce({ rows: [{ id: 'block-1' }] }) // question_blocks
        .mockResolvedValueOnce({}) // questions
        .mockResolvedValueOnce({}); // COMMIT

      const res = await TestService.createReadingTest(mockData, userId);

      expect(res.id).toBe('test-1');
      expect(client.query).toHaveBeenCalledWith('BEGIN');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(client.release).toHaveBeenCalled();
      
      // Verify mock_tests query
      expect(client.query.mock.calls[1][0]).toContain('INSERT INTO mock_tests');
      // Verify passages query
      expect(client.query.mock.calls[2][0]).toContain('INSERT INTO test_passages');
      // Verify blocks query
      expect(client.query.mock.calls[3][0]).toContain('INSERT INTO question_blocks');
      // Verify questions query
      expect(client.query.mock.calls[4][0]).toContain('INSERT INTO questions');
    });

    it('should rollback transaction on error (Error Case)', async () => {
      const dbError = new Error('DB Error');
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(dbError); // Fail at mock_tests

      await expect(TestService.createReadingTest(mockData, userId)).rejects.toThrow(dbError);

      expect(client.query).toHaveBeenCalledWith('BEGIN');
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalled();
    });
  });
});
