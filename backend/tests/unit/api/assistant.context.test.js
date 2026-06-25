jest.mock('../../../src/db/pool', () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock('../../../src/api/assistant/assistant.repository', () => ({
  getRecentMessages: jest.fn().mockResolvedValue([]),
}));

const { pool } = require('../../../src/db/pool');
const { ASSISTANT_INTENTS } = require('../../../src/api/assistant/assistant.intent');
const { buildContextInjection } = require('../../../src/api/assistant/assistant.context');

const user = { id: 'user-1' };

describe('Assistant context builder', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  it('queries mock_tests for FIND_TEST', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'is_published' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'test-1',
          title: 'Cambridge 18 Reading',
          description: 'Academic reading test',
          skill: 'reading',
          difficulty: 'intermediate',
          duration_minutes: 60,
        }],
      });

    const result = await buildContextInjection({
      intent: ASSISTANT_INTENTS.FIND_TEST,
      message: 'co de reading Cambridge 18 khong',
      context: { pageType: 'home', route: '/', visibleItems: [] },
      user,
      sessionId: null,
    });

    expect(pool.query.mock.calls[1][0]).toContain('FROM mock_tests');
    expect(result.databaseResults).toHaveLength(1);
    expect(result.databaseResults[0]).toMatchObject({
      id: 'test-1',
      title: 'Cambridge 18 Reading',
      skill: 'reading',
      route: expect.stringContaining('/reading'),
    });
  });

  it('queries library_resources for FIND_LESSON', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'category' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'res-1',
          title: 'tam',
          description: 'Audio resource',
          category: 'IELTS Academic',
          resource_type: 'audio',
          file_size_bytes: 123,
        }],
      });

    const result = await buildContextInjection({
      intent: ASSISTANT_INTENTS.FIND_LESSON,
      message: 'co de tam trong thu vien khong',
      context: { pageType: 'library', route: '/library', visibleItems: [{ title: 'tam' }] },
      user,
      sessionId: null,
    });

    expect(pool.query.mock.calls[1][0]).toContain('FROM library_resources');
    expect(result.databaseResults).toHaveLength(1);
    expect(result.databaseResults[0]).toMatchObject({
      id: 'res-1',
      title: 'tam',
      resourceType: 'audio',
      category: 'IELTS Academic',
      route: expect.stringContaining('/library'),
    });
  });

  it('does not query DB for IELTS_KNOWLEDGE', async () => {
    const result = await buildContextInjection({
      intent: ASSISTANT_INTENTS.IELTS_KNOWLEDGE,
      message: 'coherence trong IELTS Writing la gi',
      context: { pageType: 'home', route: '/', visibleItems: [] },
      user,
      sessionId: null,
    });

    expect(pool.query).not.toHaveBeenCalled();
    expect(result.databaseResults).toEqual([]);
  });
});
