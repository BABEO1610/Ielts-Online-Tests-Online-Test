jest.mock('../../../src/db/pool', () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock('../../../src/api/assistant/assistant.repository', () => ({
  getRecentMessages: jest.fn().mockResolvedValue([]),
  getSessionPreference: jest.fn().mockResolvedValue({ supported: false, preferredAddress: null }),
}));

const { pool } = require('../../../src/db/pool');
const { ASSISTANT_INTENTS } = require('../../../src/api/assistant/assistant.intent');
const {
  buildContextInjection,
  clearColumnCacheForTests,
} = require('../../../src/api/assistant/assistant.context');

const user = { id: 'user-1' };

describe('Assistant context builder', () => {
  beforeEach(() => {
    pool.query.mockReset();
    clearColumnCacheForTests();
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
      route: expect.stringContaining('/tests/test-1/reading'),
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
    expect(pool.query.mock.calls[1][0]).toContain('title::text ILIKE');
    expect(pool.query.mock.calls[1][1]).toContain('%tam%');
    expect(result.databaseResults).toHaveLength(1);
    expect(result.databaseResults[0]).toMatchObject({
      id: 'res-1',
      title: 'tam',
      resourceType: 'audio',
      category: 'IELTS Academic',
      route: expect.stringContaining('/library?resourceId=res-1'),
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
    expect(result.knowledgeResults.length).toBeGreaterThan(0);
    expect(result.knowledgeDebug.usedKnowledgeBase).toBe(true);
  });

  it('adds no-match knowledge debug without injecting unrelated chunks', async () => {
    const result = await buildContextInjection({
      intent: ASSISTANT_INTENTS.IELTS_KNOWLEDGE,
      message: 'IELTS vocabulary for food topic',
      context: { pageType: 'home', route: '/', visibleItems: [] },
      user,
      sessionId: null,
    });

    expect(pool.query).not.toHaveBeenCalled();
    expect(result.knowledgeResults).toEqual([]);
    expect(result.knowledgeDebug.noMatch).toBe(true);
    expect(result.knowledgeDebug.usedKnowledgeBase).toBe(false);
  });

  it('keeps general English learning in knowledge mode without unrelated chunks', async () => {
    const result = await buildContextInjection({
      intent: ASSISTANT_INTENTS.IELTS_KNOWLEDGE,
      message: 'phân biệt although và despite',
      context: { pageType: 'home', route: '/', visibleItems: [] },
      user,
      sessionId: null,
    });

    expect(pool.query).not.toHaveBeenCalled();
    expect(result.databaseResults).toEqual([]);
    expect(result.knowledgeResults).toEqual([]);
    expect(result.knowledgeDebug.detectedTopic).toBe('english_grammar');
    expect(result.knowledgeDebug.noMatch).toBe(true);
    expect(result.knowledgeDebug.usedKnowledgeBase).toBe(false);
  });

  it('keeps FIND_TEST on DB context without knowledge retrieval results', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'is_published' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'test-1',
          title: 'IELTSZone Reading Mock Test',
          description: 'Reading test',
          skill: 'reading',
          difficulty: 'intermediate',
          duration_minutes: 60,
        }],
      });

    const result = await buildContextInjection({
      intent: ASSISTANT_INTENTS.FIND_TEST,
      message: 'co de reading nao khong',
      context: { pageType: 'home', route: '/', visibleItems: [] },
      user,
      sessionId: null,
    });

    expect(result.databaseResults).toHaveLength(1);
    expect(result.knowledgeResults).toEqual([]);
    expect(result.knowledgeDebug).toBeNull();
  });

  it('limits lookup context to 10 rows and exposes debug counts', async () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({
      id: `test-${index + 1}`,
      title: `IELTSZone Reading Mock Test ${index + 1}`,
      description: 'Academic reading test',
      skill: 'reading',
      difficulty: 'intermediate',
      duration_minutes: 60,
    }));

    pool.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'is_published' }, { column_name: 'review_status' }] })
      .mockResolvedValueOnce({ rows });

    const result = await buildContextInjection({
      intent: ASSISTANT_INTENTS.FIND_TEST,
      message: 'co de reading nao khong',
      context: { pageType: 'home', route: '/', visibleItems: [] },
      user,
      sessionId: null,
    });

    expect(pool.query.mock.calls[1][0]).toContain("review_status = 'approved'");
    expect(result.databaseResults).toHaveLength(10);
    expect(result.debug.dbRowCount).toBe(12);
    expect(result.debug.contextRowCount).toBe(10);
    expect(result.debug.contextLimitApplied).toBe(true);
  });

  it('uses fallback suggestions when a filtered test lookup has no rows', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'is_published' }, { column_name: 'review_status' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'test-1',
          title: 'IELTSZone Reading Mock Test 1',
          description: 'Academic reading test',
          skill: 'reading',
          difficulty: 'intermediate',
          duration_minutes: 60,
        }],
      });

    const result = await buildContextInjection({
      intent: ASSISTANT_INTENTS.FIND_TEST,
      message: 'co de speaking nao khong',
      context: { pageType: 'home', route: '/', visibleItems: [] },
      user,
      sessionId: null,
    });

    expect(result.databaseResults).toHaveLength(1);
    expect(result.debug.lookupMissing).toBe(true);
    expect(result.debug.fallbackReason).toBe('no_published_match_for_filter');
    expect(result.debug.skillFilter).toBe('speaking');
  });

  it('builds listening suggested links with the listening route', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'is_published' }, { column_name: 'review_status' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'listen-1',
          title: 'IELTSZone Listening Mock Test 1',
          description: 'Listening test',
          skill: 'listening',
          difficulty: 'intermediate',
          duration_minutes: 30,
        }],
      });

    const result = await buildContextInjection({
      intent: ASSISTANT_INTENTS.FIND_TEST,
      message: 'co de listening nao khong',
      context: { pageType: 'home', route: '/', visibleItems: [] },
      user,
      sessionId: null,
    });

    expect(result.suggestedLinks[0].href).toContain('/tests/listen-1/listening');
    expect(result.suggestedLinks[0].href).not.toContain('/reading');
  });

  it('builds a specific test link for mock test number navigation', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'is_published' }, { column_name: 'review_status' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'writing-10',
          title: 'IELTSZone Writing Mock Test 10',
          description: 'Writing test 10',
          skill: 'writing',
          difficulty: 'intermediate',
          duration_minutes: 60,
        }],
      });

    const result = await buildContextInjection({
      intent: ASSISTANT_INTENTS.FIND_TEST,
      message: 'mock test 10 writing',
      context: { pageType: 'home', route: '/', visibleItems: [] },
      user,
      sessionId: null,
    });

    expect(pool.query.mock.calls[1][1]).toEqual(expect.arrayContaining(['writing']));
    expect(pool.query.mock.calls[1][1]).toEqual(expect.arrayContaining(['%mock test 10%']));
    expect(result.databaseResults).toHaveLength(1);
    expect(result.debug.testNumber).toBe(10);
    expect(result.suggestedLinks[0].href).toContain('/tests/writing-10/writing');
  });

  it('returns review clarification when attemptId is missing', async () => {
    const result = await buildContextInjection({
      intent: ASSISTANT_INTENTS.POST_TEST_REVIEW,
      message: 'review bài vừa rồi',
      context: { pageType: 'home', route: '/', visibleItems: [] },
      user,
      sessionId: null,
    });

    expect(pool.query).not.toHaveBeenCalled();
    expect(result.directAnswer).toContain('Mình chưa biết bạn muốn review bài nào');
    expect(result.debug.reviewFallbackReason).toBe('missing_attempt_id');
  });

  it('builds navigation links for practice history', async () => {
    const result = await buildContextInjection({
      intent: ASSISTANT_INTENTS.NAVIGATION,
      message: 'xem lịch sử làm bài',
      context: { pageType: 'home', route: '/', visibleItems: [] },
      user,
      sessionId: null,
    });

    expect(pool.query).not.toHaveBeenCalled();
    expect(result.suggestedLinks).toHaveLength(1);
    expect(result.suggestedLinks[0].href).toContain('/practice-history');
  });

  it('parses quantity and oldest sort for reading lookup without fallback', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'is_published' }, { column_name: 'review_status' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'old-reading-1',
          title: 'IELTSZone Reading Mock Test 1',
          description: 'Oldest reading test',
          skill: 'reading',
          difficulty: 'intermediate',
          duration_minutes: 60,
        }],
      });

    const result = await buildContextInjection({
      intent: ASSISTANT_INTENTS.FIND_TEST,
      message: 'tìm cho tôi 1 đề reading cũ nhất',
      context: { pageType: 'home', route: '/', visibleItems: [] },
      user,
      sessionId: null,
    });

    expect(pool.query.mock.calls[1][0]).toContain('ORDER BY created_at ASC');
    expect(pool.query.mock.calls[1][0]).toContain('LIMIT 1');
    expect(result.databaseResults).toHaveLength(1);
    expect(result.debug.skillFilter).toBe('reading');
    expect(result.debug.requestedQuantity).toBe(1);
    expect(result.debug.sortOrder).toBe('ASC');
    expect(result.debug.sortField).toBe('created_at');
    expect(result.debug.searchTerms).toEqual([]);
    expect(result.debug.lookupMissing).toBe(false);
    expect(result.debug.fallbackReason).toBeNull();
  });

  it('parses title number lookup without forcing fallback', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'is_published' }, { column_name: 'review_status' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'reading-1',
          title: 'IELTSZone Reading Mock Test 1',
          description: 'Reading test 1',
          skill: 'reading',
          difficulty: 'intermediate',
          duration_minutes: 60,
        }],
      });

    const result = await buildContextInjection({
      intent: ASSISTANT_INTENTS.FIND_TEST,
      message: 'đề reading số 1',
      context: { pageType: 'home', route: '/', visibleItems: [] },
      user,
      sessionId: null,
    });

    expect(pool.query.mock.calls[1][1]).toEqual(expect.arrayContaining(['reading']));
    expect(result.databaseResults).toHaveLength(1);
    expect(result.debug.titleNumber).toBe(1);
    expect(result.debug.lookupMissing).toBe(false);
  });

  it('ignores conversational filler and ranks tests by meaningful topic terms', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'is_published' }, { column_name: 'review_status' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'reading-general',
            title: 'IELTSZone General Reading Practice',
            description: 'A mixed-topic reading test',
            skill: 'reading',
            difficulty: 'intermediate',
            duration_minutes: 60,
          },
          {
            id: 'reading-environment',
            title: 'Reading Practice: The Environment',
            description: 'A passage about climate and conservation',
            skill: 'reading',
            difficulty: 'intermediate',
            duration_minutes: 60,
          },
        ],
      });

    const result = await buildContextInjection({
      intent: ASSISTANT_INTENTS.FIND_TEST,
      message: 'Find me a Reading test about environment please',
      context: { pageType: 'home', route: '/', visibleItems: [] },
      user,
      sessionId: null,
    });

    expect(result.debug.searchTerms).toEqual(['environment']);
    expect(result.debug.fuzzyTitleMatch).toBe(true);
    expect(result.debug.lookupMissing).toBe(false);
    expect(result.databaseResults.map((item) => item.id)).toEqual(['reading-environment']);
  });

  it('filters a quantity lookup by topic before choosing the single result', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'is_published' }, { column_name: 'review_status' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'reading-general',
            title: 'Newest General Reading Practice',
            description: 'A mixed-topic reading test',
            skill: 'reading',
            difficulty: 'intermediate',
            duration_minutes: 60,
          },
          {
            id: 'reading-environment',
            title: 'Reading Practice: The Environment',
            description: 'A passage about conservation',
            skill: 'reading',
            difficulty: 'intermediate',
            duration_minutes: 60,
          },
        ],
      });

    const result = await buildContextInjection({
      intent: ASSISTANT_INTENTS.FIND_TEST,
      message: 'tìm 1 đề Reading về environment phù hợp với mình nhé',
      context: { pageType: 'home', route: '/', visibleItems: [] },
      user,
      sessionId: null,
    });

    const [sql, params] = pool.query.mock.calls[1];
    expect(sql).toContain('title::text ILIKE');
    expect(sql.indexOf('ILIKE')).toBeLessThan(sql.indexOf('ORDER BY'));
    expect(sql).toContain('LIMIT 50');
    expect(params).toEqual(expect.arrayContaining(['reading', '%environment%']));
    expect(params).not.toContain('%ve%');
    expect(result.debug.requestedQuantity).toBe(1);
    expect(result.databaseResults.map((item) => item.id)).toEqual(['reading-environment']);
  });

  it('returns only the requested number of grounded alternatives when a topic has no match', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'is_published' }, { column_name: 'review_status' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'reading-1',
            title: 'IELTSZone Reading Practice 1',
            description: 'Reading test',
            skill: 'reading',
            difficulty: 'intermediate',
            duration_minutes: 60,
          },
          {
            id: 'listening-1',
            title: 'IELTSZone Listening Practice 1',
            description: 'Listening test',
            skill: 'listening',
            difficulty: 'intermediate',
            duration_minutes: 30,
          },
        ],
      });

    const result = await buildContextInjection({
      intent: ASSISTANT_INTENTS.FIND_TEST,
      message: 'tìm 1 đề về astronomy',
      context: { pageType: 'home', route: '/', visibleItems: [] },
      user,
      sessionId: null,
    });

    expect(result.debug.lookupMissing).toBe(true);
    expect(result.debug.fallbackReason).toBe('no_published_match_for_terms');
    expect(result.databaseResults).toHaveLength(1);
  });
});
