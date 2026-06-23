const ContentService = require('../../src/services/content.service');
const { pool } = require('../../src/db/pool');
const TestService = require('../../src/services/test.service');

jest.mock('../../src/db/pool', () => {
  return {
    pool: {
      query: jest.fn(),
    },
  };
});

jest.mock('../../src/services/test.service');

describe('ContentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTestDetail', () => {
    const testId = 'test-123';

    it('should successfully return reading test details (Happy Path)', async () => {
      const mockTest = { id: testId, title: 'Reading Test', skill: 'reading' };
      const mockPassages = [{ id: 'p-1', title: 'Passage 1' }];
      const mockQuestions = [{ id: 'q-1', text: 'Q1' }];

      pool.query
        .mockResolvedValueOnce({ rows: [mockTest] }) // getTestDetailBase
        .mockResolvedValueOnce({ rows: mockPassages }) // getTestPassages
        .mockResolvedValueOnce({ rows: mockQuestions }); // getTestQuestions

      const result = await ContentService.getTestDetail(testId);

      expect(result).toEqual({
        ...mockTest,
        passages: mockPassages,
        questions: mockQuestions,
      });
      expect(pool.query).toHaveBeenCalledTimes(3);
    });

    it('should successfully return listening test details with sections (Happy Path)', async () => {
      const mockTest = { id: testId, title: 'Listening Test', skill: 'listening' };
      const mockPassages = [{ id: 'p-1', title: 'Part 1' }];
      const mockQuestions = [{ id: 'q-1', text: 'Q1' }];
      const mockFullTest = {
        id: testId,
        skill: 'listening',
        passages: [{ id: 'p-1', title: 'Part 1', blocks: [] }],
        sections: [{ id: 's-1', title: 'Part 1', blocks: [] }],
      };

      pool.query
        .mockResolvedValueOnce({ rows: [mockTest] }) // getTestDetailBase
        .mockResolvedValueOnce({ rows: mockPassages }) // getTestPassages
        .mockResolvedValueOnce({ rows: mockQuestions }); // getTestQuestions

      TestService.getTestById.mockResolvedValueOnce(mockFullTest);

      const result = await ContentService.getTestDetail(testId);

      expect(result).toEqual({
        ...mockTest,
        passages: mockFullTest.passages,
        questions: mockQuestions,
        sections: mockFullTest.sections,
      });
      expect(pool.query).toHaveBeenCalledTimes(3);
      expect(TestService.getTestById).toHaveBeenCalledWith(testId);
    });

    it('should throw AppError if test not found (Error Case)', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] }) // getTestDetailBase
        .mockResolvedValueOnce({ rows: [] }) // getTestPassages
        .mockResolvedValueOnce({ rows: [] }); // getTestQuestions

      await expect(ContentService.getTestDetail(testId)).rejects.toThrow('Test not found');
    });
  });
});
