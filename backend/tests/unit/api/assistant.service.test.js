jest.mock('../../../src/services/ai.service', () => ({
  generateAssistantAnswer: jest.fn(),
  streamAssistantAnswer: jest.fn(),
}));

jest.mock('../../../src/db/pool', () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock('../../../src/api/assistant/assistant.repository', () => ({
  createOrGetSession: jest.fn(),
  saveUserMessage: jest.fn(),
  saveAssistantMessage: jest.fn(),
  getRecentMessages: jest.fn(),
  getSessionPreference: jest.fn(),
  setSessionPreference: jest.fn(),
  getHistory: jest.fn(),
  rateAssistantMessage: jest.fn(),
}));

const aiService = require('../../../src/services/ai.service');
const repository = require('../../../src/api/assistant/assistant.repository');
const { pool } = require('../../../src/db/pool');
const { ASSISTANT_INTENTS } = require('../../../src/api/assistant/assistant.intent');
const { ERROR_CODES } = require('../../../src/api/assistant/assistant.constants');
const { clearColumnCacheForTests } = require('../../../src/api/assistant/assistant.context');
const { handleChat, handleChatStream, runAssistantPipeline } = require('../../../src/api/assistant/assistant.service');

describe('Assistant service pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockReset();
    pool.query.mockResolvedValue({ rows: [] });
    repository.getRecentMessages.mockResolvedValue([]);
    repository.getSessionPreference.mockResolvedValue({ supported: false, preferredAddress: null });
    repository.setSessionPreference.mockResolvedValue(true);
    repository.createOrGetSession.mockResolvedValue('session-1');
    repository.saveUserMessage.mockResolvedValue({ id: 'user-message-1' });
    repository.saveAssistantMessage.mockResolvedValue({ id: 'assistant-message-1' });
    clearColumnCacheForTests();
  });

  it('greets authenticated users by resolved account name without calling AI', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ column_name: 'id' }, { column_name: 'full_name' }] })
      .mockResolvedValueOnce({ rows: [{ full_name: 'Nguyễn Tiến Đạt' }] });

    const result = await runAssistantPipeline({
      user: { id: 'user-1', email: 'dat@example.com' },
      payload: {
        message: 'Chào bạn',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.GREETING);
    expect(result.answer).toContain('Chào Đạt!');
    expect(result.finalResponseMode).toBe('immediate');
    expect(aiService.generateAssistantAnswer).not.toHaveBeenCalled();
  });

  it('returns login required greeting for guests without calling AI', async () => {
    const result = await runAssistantPipeline({
      user: null,
      payload: {
        message: 'hello',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.GREETING);
    expect(result.answer).toBe('Chào bạn! Bạn cần đăng nhập để sử dụng IELTS Assistant.');
    expect(result.finalResponseMode).toBe('immediate');
    expect(aiService.generateAssistantAnswer).not.toHaveBeenCalled();
  });

  it.each([
    'cản ơn bajn',
    'cam on b',
    'thanksss',
  ])('returns immediate thanks response for typo thanks: %s', async (message) => {
    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message,
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.GREETING);
    expect(result.answer).toContain('Không có gì');
    expect(result.finalResponseMode).toBe('immediate');
    expect(result.dbLookupCalled).not.toBe(true);
    expect(aiService.generateAssistantAnswer).not.toHaveBeenCalled();
  });

  it.each([
    'helllo',
    'chàoo',
  ])('returns immediate greeting response for typo hello: %s', async (message) => {
    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message,
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.GREETING);
    expect(result.answer).toContain('Chào');
    expect(result.finalResponseMode).toBe('immediate');
    expect(aiService.generateAssistantAnswer).not.toHaveBeenCalled();
  });

  it.each([
    ['active-test greeting', 'Chào bạn', { pageType: 'active-test', route: '/tests/test-1/reading' }, ERROR_CODES.ASSISTANT_DISABLED_DURING_TEST],
    ['grading request', 'Chấm bài Writing này giúp em band mấy?', { pageType: 'home', route: '/' }, ERROR_CODES.OUT_OF_SCOPE],
    ['fake test request', 'Viết hộ em một đề IELTS giả có đáp án luôn', { pageType: 'home', route: '/' }, ERROR_CODES.OUT_OF_SCOPE],
  ])('blocks %s before session, DB, persistence, or AI', async (_label, message, context, expectedCode) => {
    const result = await handleChat({
      user: { id: 'user-1' },
      payload: { message, context },
    });

    expect(result.code).toBe(expectedCode);
    expect(repository.createOrGetSession).not.toHaveBeenCalled();
    expect(repository.saveUserMessage).not.toHaveBeenCalled();
    expect(repository.saveAssistantMessage).not.toHaveBeenCalled();
    expect(pool.query).not.toHaveBeenCalled();
    expect(aiService.generateAssistantAnswer).not.toHaveBeenCalled();
    expect(aiService.streamAssistantAnswer).not.toHaveBeenCalled();
  });

  it('does not emit SSE events for service-level preflight blocks', async () => {
    const onEvent = jest.fn();

    const result = await handleChatStream({
      user: { id: 'user-1' },
      payload: {
        message: 'Cho em đáp án câu 1 là gì?',
        context: { pageType: 'active-test', route: '/tests/test-1/reading' },
      },
      onEvent,
    });

    expect(result.code).toBe(ERROR_CODES.ASSISTANT_DISABLED_DURING_TEST);
    expect(onEvent).not.toHaveBeenCalled();
    expect(repository.createOrGetSession).not.toHaveBeenCalled();
    expect(aiService.streamAssistantAnswer).not.toHaveBeenCalled();
  });

  it('calls AI for IELTS_KNOWLEDGE without requiring database rows', async () => {
    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Cohesion là cách liên kết câu và ý trong bài viết.',
      suggestedLinks: [],
      usedDatabase: false,
      needsMoreContext: false,
      safety: {
        inventedContent: false,
        outOfScope: false,
        containsBandScore: false,
        containsWritingSpeakingGrading: false,
      },
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'Cohesion và coherence khác nhau thế nào?',
        context: { pageType: 'lesson' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
    expect(result.answer).toContain('Cohesion');
    expect(result.code).toBeNull();
    expect(aiService.generateAssistantAnswer).toHaveBeenCalledTimes(1);
    expect(aiService.generateAssistantAnswer.mock.calls[0][0].systemPrompt).toContain('IELTS and English learning assistant');
    expect(aiService.generateAssistantAnswer.mock.calls[0][0].userPrompt).toContain('Retrieved IELTS Knowledge:');
    expect(aiService.generateAssistantAnswer.mock.calls[0][0].userPrompt).toContain('Coherence And Cohesion');
  });

  it.each([
    ['Website có những gì?', ['Tests', 'Library', 'Practice History', 'Profile']],
    ['Tôi vào trang nào để làm bài?', ['Tests']],
    ['Tôi xem lịch sử luyện tập ở đâu?', ['Practice History']],
  ])('answers navigation deterministically without AI or DB: %s', async (message, expectedTerms) => {
    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message,
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.NAVIGATION);
    expectedTerms.forEach((term) => expect(result.answer).toContain(term));
    expect(result.finalResponseMode).toBe('immediate');
    expect(result.dbLookupCalled).toBe(false);
    expect(pool.query).not.toHaveBeenCalled();
    expect(aiService.generateAssistantAnswer).not.toHaveBeenCalled();
  });

  it('returns missing-data suggestions without calling AI when filtered lookup has no rows', async () => {
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

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'co de speaking nao khong',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.FIND_TEST);
    expect(result.finalResponseMode).toBe('safe_missing_data_with_suggestions');
    expect(result.fallbackUsed).toBe(true);
    expect(result.answer).toContain('speaking');
    expect(result.suggestedLinks[0].href).toContain('/reading');
    expect(aiService.generateAssistantAnswer).not.toHaveBeenCalled();
  });

  it('calls AI for Vietnamese IELTS reading study tips', async () => {
    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Với Reading, bạn nên luyện skim, scan và phân tích keyword/paraphrase.',
      suggestedLinks: [],
      usedDatabase: false,
      needsMoreContext: false,
      safety: {
        inventedContent: false,
        outOfScope: false,
        containsBandScore: false,
        containsWritingSpeakingGrading: false,
      },
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'mẹo học reading thế nào',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
    expect(result.finalResponseMode).toBe('ai');
    expect(aiService.generateAssistantAnswer).toHaveBeenCalledTimes(1);
  });

  it.each([
    'cách áp dụng phương pháp cho IELTS Reading',
    'cách làm Reading hiệu quả',
  ])('routes strategy question to IELTS_KNOWLEDGE without DB lookup: %s', async (message) => {
    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Bạn nên xác định mục tiêu của kỹ thuật, luyện từng bước và review lỗi sau mỗi bài Reading.',
      suggestedLinks: [],
      usedDatabase: false,
      needsMoreContext: false,
      safety: {
        inventedContent: false,
        outOfScope: false,
        containsBandScore: false,
        containsWritingSpeakingGrading: false,
      },
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message,
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
    expect(result.dbLookupCalled).toBe(false);
    expect(pool.query).not.toHaveBeenCalled();
    expect(aiService.generateAssistantAnswer).toHaveBeenCalledTimes(1);
  });

  it('routes Matching Headings strategy to IELTS_KNOWLEDGE and injects matching chunks', async () => {
    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Matching Headings cần đọc ý chính toàn đoạn, không chọn chỉ vì lặp keyword.',
      suggestedLinks: [],
      usedDatabase: false,
      needsMoreContext: false,
      safety: {
        inventedContent: false,
        outOfScope: false,
        containsBandScore: false,
        containsWritingSpeakingGrading: false,
      },
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'phương pháp làm Matching Headings',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
    expect(result.dbLookupCalled).toBe(false);
    expect(aiService.generateAssistantAnswer.mock.calls[0][0].userPrompt).toContain('Question Type: matching_headings');
  });

  it('keeps explicit Reading practice lookup on DB path', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'is_published' }, { column_name: 'review_status' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'reading-latest',
          title: 'IELTSZone Reading Mock Test Latest',
          description: 'Latest reading test',
          skill: 'reading',
          difficulty: 'intermediate',
          duration_minutes: 60,
        }],
      });

    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Mình tìm thấy 1 đề Reading mới nhất trong hệ thống.',
      suggestedLinks: [],
      usedDatabase: true,
      needsMoreContext: false,
      safety: {
        inventedContent: false,
        outOfScope: false,
        containsBandScore: false,
        containsWritingSpeakingGrading: false,
      },
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'cho tôi 1 đề Reading mới nhất',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.FIND_TEST);
    expect(result.dbLookupCalled).toBe(true);
    expect(pool.query.mock.calls[1][0]).toContain('FROM mock_tests');
  });

  it('asks clarification for ambiguous skill-only requests without DB lookup', async () => {
    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'reading đi',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.CLARIFICATION);
    expect(result.answer).toContain('tìm đề reading');
    expect(result.dbLookupCalled).not.toBe(true);
    expect(pool.query).not.toHaveBeenCalled();
    expect(aiService.generateAssistantAnswer).not.toHaveBeenCalled();
  });

  it('keeps lookup context at 10 but displays only 3 links with hasMore metadata', async () => {
    const rows = Array.from({ length: 10 }, (_, index) => ({
      id: `writing-${index + 1}`,
      title: `IELTSZone Writing Mock Test ${index + 1}`,
      description: 'Writing test',
      skill: 'writing',
      difficulty: 'intermediate',
      duration_minutes: 60,
    }));

    pool.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'is_published' }, { column_name: 'review_status' }] })
      .mockResolvedValueOnce({ rows });

    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Mình tìm thấy các đề Writing đang có trong hệ thống.',
      suggestedLinks: [],
      usedDatabase: true,
      needsMoreContext: false,
      safety: {
        inventedContent: false,
        outOfScope: false,
        containsBandScore: false,
        containsWritingSpeakingGrading: false,
      },
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'có đề writing nào không',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.FIND_TEST);
    expect(result.suggestedLinks).toHaveLength(3);
    expect(result.linkMeta).toMatchObject({
      totalMatched: 10,
      displayedCount: 3,
      hasMore: true,
    });
  });

  it('keeps reading availability lookup at context 10 and display 3 with hasMore', async () => {
    const rows = Array.from({ length: 10 }, (_, index) => ({
      id: `reading-${index + 1}`,
      title: `IELTSZone Reading Mock Test ${index + 1}`,
      description: 'Reading test',
      skill: 'reading',
      difficulty: 'intermediate',
      duration_minutes: 60,
    }));

    pool.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'is_published' }, { column_name: 'review_status' }] })
      .mockResolvedValueOnce({ rows });

    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Mình tìm thấy các đề Reading đang có trong hệ thống.',
      suggestedLinks: [],
      usedDatabase: true,
      needsMoreContext: false,
      safety: {
        inventedContent: false,
        outOfScope: false,
        containsBandScore: false,
        containsWritingSpeakingGrading: false,
      },
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'có đề reading nào không',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.suggestedLinks).toHaveLength(3);
    expect(result.linkMeta).toMatchObject({ totalMatched: 10, displayedCount: 3, hasMore: true });
  });

  it('returns one oldest reading test without fallback for quantity and sort lookup', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'is_published' }, { column_name: 'review_status' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'reading-oldest',
          title: 'IELTSZone Reading Mock Test 1',
          description: 'Oldest reading test',
          skill: 'reading',
          difficulty: 'intermediate',
          duration_minutes: 60,
        }],
      });

    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Mình tìm thấy IELTSZone Reading Mock Test 1, đây là đề Reading cũ nhất.',
      suggestedLinks: [],
      usedDatabase: true,
      needsMoreContext: false,
      safety: {
        inventedContent: false,
        outOfScope: false,
        containsBandScore: false,
        containsWritingSpeakingGrading: false,
      },
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'tìm cho tôi 1 đề reading cũ nhất',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.FIND_TEST);
    expect(result.suggestedLinks).toHaveLength(1);
    expect(result.fallbackUsed).toBeFalsy();
    expect(pool.query.mock.calls[1][0]).toContain('ORDER BY created_at ASC');
    expect(pool.query.mock.calls[1][0]).toContain('LIMIT 1');
  });

  it('uses a grounded deterministic lookup answer when the provider fails', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'is_published' }, { column_name: 'review_status' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'reading-practice-1',
          title: 'IELTSZone Reading Practice 1',
          description: 'Reading practice test',
          skill: 'reading',
          difficulty: 'intermediate',
          duration_minutes: 60,
        }],
      });
    aiService.generateAssistantAnswer.mockRejectedValue(new Error('provider down'));

    const result = await handleChat({
      user: { id: 'user-1' },
      payload: {
        message: 'có đề Reading nào không?',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.code).toBeNull();
    expect(result.answer).toContain('IELTSZone Reading Practice 1');
    expect(result.suggestedLinks[0].href).toContain('/tests/reading-practice-1/reading');
    expect(result).toMatchObject({
      fallbackUsed: true,
      finalResponseMode: 'deterministic_fallback',
      fallbackType: 'deterministic_fallback',
      grounding: { usedDatabase: true },
    });
    expect(repository.saveUserMessage).toHaveBeenCalledTimes(1);
    expect(repository.saveAssistantMessage).toHaveBeenCalledTimes(1);
  });

  it('replaces an invented lookup title with database-grounded results', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'is_published' }, { column_name: 'review_status' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'reading-practice-1',
          title: 'IELTSZone Reading Practice 1',
          description: 'Reading practice test',
          skill: 'reading',
          difficulty: 'intermediate',
          duration_minutes: 60,
        }],
      });
    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Mình đề xuất Cambridge IELTS 19 Test 4 cho bạn.',
      suggestedLinks: [],
      usedDatabase: true,
      needsMoreContext: false,
      safety: {},
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'có đề Reading nào không?',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.answer).toContain('IELTSZone Reading Practice 1');
    expect(result.answer).not.toContain('Cambridge IELTS 19 Test 4');
    expect(result.fallbackUsed).toBe(true);
    expect(result.fallbackReason).toBe('ungrounded_lookup_answer');
    expect(result.finalResponseMode).toBe('deterministic_fallback');
  });

  it('keeps an AI lookup answer that names an actual database result', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'is_published' }, { column_name: 'review_status' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'reading-practice-1',
          title: 'IELTSZone Reading Practice 1',
          description: 'Reading practice test',
          skill: 'reading',
          difficulty: 'intermediate',
          duration_minutes: 60,
        }],
      });
    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Được nè. IELTSZone Reading Practice 1 là lựa chọn bạn có thể mở để luyện.',
      suggestedLinks: [],
      usedDatabase: true,
      needsMoreContext: false,
      safety: {},
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'có đề Reading nào không?',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.answer).toContain('IELTSZone Reading Practice 1');
    expect(result.fallbackUsed).toBe(false);
    expect(result.finalResponseMode).toBe('ai');
  });

  it('returns three latest writing tests with displayed count three', async () => {
    const rows = Array.from({ length: 3 }, (_, index) => ({
      id: `writing-${index + 1}`,
      title: `IELTSZone Writing Mock Test ${index + 1}`,
      description: 'Writing test',
      skill: 'writing',
      difficulty: 'intermediate',
      duration_minutes: 60,
    }));

    pool.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'is_published' }, { column_name: 'review_status' }] })
      .mockResolvedValueOnce({ rows });

    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Mình tìm thấy 3 đề Writing mới nhất.',
      suggestedLinks: [],
      usedDatabase: true,
      needsMoreContext: false,
      safety: {
        inventedContent: false,
        outOfScope: false,
        containsBandScore: false,
        containsWritingSpeakingGrading: false,
      },
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'cho tôi 3 đề writing mới nhất',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.suggestedLinks).toHaveLength(3);
    expect(result.linkMeta).toMatchObject({ totalMatched: 3, displayedCount: 3, hasMore: false });
    expect(pool.query.mock.calls[1][0]).toContain('ORDER BY created_at DESC');
    expect(pool.query.mock.calls[1][0]).toContain('LIMIT 3');
  });

  it('uses IELTS knowledge fallback template when AI provider fails', async () => {
    aiService.generateAssistantAnswer.mockRejectedValue(new Error('provider down'));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'mẹo học reading thế nào',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
    expect(result.answer).toContain('IELTS Reading');
    expect(result.answer).toContain('True/False/Not Given');
    expect(result.answer).not.toContain('Mình chỉ hỗ trợ');
    expect(result.finalResponseMode).toBe('ai_fallback_error');
    expect(result.fallbackUsed).toBe(true);
  });

  it('uses Writing Task 1 overview fallback when AI provider fails', async () => {
    aiService.generateAssistantAnswer.mockRejectedValue(new Error('provider down'));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'Writing Task 1 overview viết thế nào',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
    expect(result.answer).toContain('IELTS Writing Task 1');
    expect(result.answer).toContain('overview');
    expect(result.finalResponseMode).toBe('ai_fallback_error');
  });

  it('uses Speaking Part 2 fallback when AI provider fails', async () => {
    aiService.generateAssistantAnswer.mockRejectedValue(new Error('provider down'));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'Speaking Part 2 trả lời thế nào',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
    expect(result.answer).toContain('IELTS Speaking Part 2');
    expect(result.answer).toContain('cue card');
    expect(result.finalResponseMode).toBe('ai_fallback_error');
  });

  it('uses generic IELTS fallback when AI provider fails without a specific skill', async () => {
    aiService.generateAssistantAnswer.mockRejectedValue(new Error('provider down'));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'tip học IELTS thế nào',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
    expect(result.answer).toContain('kỹ năng cụ thể');
    expect(result.finalResponseMode).toBe('ai_fallback_error');
  });

  it('uses remembered Skimming and Scanning context in the provider fallback', async () => {
    repository.getSessionPreference.mockResolvedValue({
      supported: true,
      preferredAddress: 'Siêu nhân Đạt',
    });
    repository.getRecentMessages.mockResolvedValue([
      { role: 'user', content: 'Skimming là gì?' },
      { role: 'assistant', content: 'Skimming là đọc lướt để nắm ý chính.' },
      { role: 'user', content: 'Scanning là gì?' },
      { role: 'assistant', content: 'Scanning là quét để tìm thông tin cụ thể.' },
    ]);
    aiService.generateAssistantAnswer.mockRejectedValue(new Error('provider down'));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        sessionId: 'session-1',
        message: 'kết hợp 2 cái này như thế nào?',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
    expect(result.answer).toContain('Siêu nhân Đạt');
    expect(result.answer.toLowerCase()).toContain('skimming');
    expect(result.answer.toLowerCase()).toContain('scanning');
    expect(result.answer).not.toContain('chưa gọi được AI');
  });

  it('returns review clarification when no attemptId is available', async () => {
    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'review bài vừa rồi',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.POST_TEST_REVIEW);
    expect(result.answer).toContain('Mình chưa biết bạn muốn review bài nào');
    expect(result.finalResponseMode).toBe('clarification');
    expect(aiService.generateAssistantAnswer).not.toHaveBeenCalled();
  });

  it('queries attempt context for question review when attemptId exists', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'attempt-1',
          user_id: 'user-1',
          test_id: 'test-1',
          submitted_at: '2026-06-26T00:00:00.000Z',
          band_score: null,
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'question-5',
          question_order: 5,
          question_text: 'Question 5',
          options: null,
          correct_answer: 'B',
          explanation: 'Because the passage says so.',
          given_answer: 'A',
          is_correct: false,
        }],
      });

    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Câu 5 sai vì bạn chọn A, trong khi đáp án đúng là B theo explanation có sẵn.',
      suggestedLinks: [],
      usedDatabase: true,
      needsMoreContext: false,
      safety: {
        inventedContent: false,
        outOfScope: false,
        containsBandScore: false,
        containsWritingSpeakingGrading: false,
      },
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'vì sao câu 5 sai',
        context: { pageType: 'review', route: '/results/attempt-1/review', attemptId: 'attempt-1' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.POST_TEST_REVIEW);
    expect(pool.query.mock.calls[0][0]).toContain('FROM test_attempts');
    expect(pool.query.mock.calls[1][0]).toContain('FROM question_answers');
    expect(aiService.generateAssistantAnswer).toHaveBeenCalledTimes(1);
    expect(result.finalResponseMode).toBe('ai');
  });
  it('uses valid JSON answer for IELTS knowledge without capability fallback', async () => {
    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Bạn nên chia IELTS thành 4 kỹ năng và luyện đều mỗi ngày.',
      suggestedLinks: [],
      usedDatabase: false,
      needsMoreContext: false,
      safety: {
        inventedContent: false,
        outOfScope: false,
        containsBandScore: false,
        containsWritingSpeakingGrading: false,
      },
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'tip học ielts thế nào',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
    expect(result.dbLookupCalled).toBe(false);
    expect(result.aiResponseValid).toBe(true);
    expect(result.aiResponseFormat).toBe('json');
    expect(result.answer).not.toContain('tìm test, lesson');
    expect(aiService.generateAssistantAnswer).toHaveBeenCalledTimes(1);
  });

  it('uses plain text answer for IELTS knowledge', async () => {
    aiService.generateAssistantAnswer.mockResolvedValue('Bạn nên học IELTS theo mục tiêu từng kỹ năng và review lỗi thường xuyên.');

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'tip học ielts thế nào',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
    expect(result.answer).toContain('IELTS');
    expect(result.aiResponseValid).toBe(true);
    expect(result.aiResponseFormat).toBe('plain_text');
    expect(result.aiRetryUsed).toBe(false);
  });

  it('retries IELTS knowledge when AI returns empty JSON', async () => {
    aiService.generateAssistantAnswer
      .mockResolvedValueOnce('{}')
      .mockResolvedValueOnce('Bạn nên luyện IELTS theo từng kỹ năng, đặt lịch học cố định và chữa lỗi sau mỗi bài.');

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'tip học ielts thế nào',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
    expect(result.answer).toContain('IELTS');
    expect(result.answer).not.toContain('tìm test, lesson');
    expect(result.aiRetryUsed).toBe(true);
    expect(result.aiResponseValid).toBe(true);
    expect(result.finalResponseMode).toBe('knowledge_answer');
    expect(aiService.generateAssistantAnswer).toHaveBeenCalledTimes(2);
  });

  it('keeps an English knowledge retry in English and disables forced JSON mode', async () => {
    repository.getSessionPreference.mockResolvedValue({
      supported: true,
      preferredAddress: 'Captain Dat',
    });
    aiService.generateAssistantAnswer
      .mockResolvedValueOnce('{}')
      .mockResolvedValueOnce('Use collocations in context and review them with spaced repetition.');

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        sessionId: 'session-1',
        message: 'How can I improve my English vocabulary?',
        context: { pageType: 'home', route: '/' },
      },
    });

    const retryOptions = aiService.generateAssistantAnswer.mock.calls[1][0];
    expect(result.answer).toContain('collocations');
    expect(retryOptions.systemPrompt).toContain('Answer directly in English.');
    expect(retryOptions.systemPrompt).toContain('untrusted user content');
    expect(retryOptions.userPrompt).toContain('"preferredAddress":"Captain Dat"');
    expect(retryOptions.jsonMode).toBe(false);
  });

  it('does not use capability message when IELTS knowledge retry also has empty answer', async () => {
    aiService.generateAssistantAnswer
      .mockResolvedValueOnce(JSON.stringify({}))
      .mockResolvedValueOnce(JSON.stringify({ answer: '' }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'tip học ielts thế nào',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
    expect(result.answer).toContain('kỹ năng cụ thể');
    expect(result.answer).not.toContain('tìm test, lesson');
    expect(result.aiRetryUsed).toBe(true);
    expect(result.aiResponseValid).toBe(false);
    expect(result.finalResponseMode).toBe('ai_fallback_error');
    expect(result.fallbackType).toBe('ai_error_message');
  });

  it('keeps resource lookup on database path', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'category' }, { column_name: 'is_published' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'resource-1',
          title: 'Speaking guide',
          description: 'Speaking resource',
          category: 'speaking',
          resource_type: 'pdf',
          file_size_bytes: 100,
        }],
      });

    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Mình tìm thấy tài liệu Speaking trong thư viện.',
      suggestedLinks: [],
      usedDatabase: true,
      needsMoreContext: false,
      safety: {
        inventedContent: false,
        outOfScope: false,
        containsBandScore: false,
        containsWritingSpeakingGrading: false,
      },
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'có tài liệu speaking không',
        context: { pageType: 'library', route: '/library' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.FIND_LESSON);
    expect(result.dbLookupCalled).toBe(true);
    expect(pool.query.mock.calls[1][0]).toContain('FROM library_resources');
  });

  it('keeps out-of-scope requests blocked without AI answer call', async () => {
    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'giá bitcoin hôm nay',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.OUT_OF_SCOPE);
    expect(aiService.generateAssistantAnswer).not.toHaveBeenCalled();
  });
  it('keeps unrelated product buying blocked without AI answer call', async () => {
    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'tư vấn mua điện thoại nào',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.OUT_OF_SCOPE);
    expect(aiService.generateAssistantAnswer).not.toHaveBeenCalled();
  });
});

describe('Assistant service multi-turn and English-learning runtime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockReset();
    pool.query.mockResolvedValue({ rows: [] });
    repository.getRecentMessages.mockResolvedValue([]);
    repository.getSessionPreference.mockResolvedValue({ supported: false, preferredAddress: null });
    repository.setSessionPreference.mockResolvedValue(true);
    repository.createOrGetSession.mockResolvedValue('session-1');
    repository.saveUserMessage.mockResolvedValue({ id: 'user-message-1' });
    repository.saveAssistantMessage.mockResolvedValue({ id: 'assistant-message-1' });
    clearColumnCacheForTests();
  });

  it('uses recent conversation for a Writing Task 2 outline follow-up without technical fallback', async () => {
    repository.getRecentMessages.mockResolvedValue([
      { role: 'user', content: 'tip hoc ielts the nao' },
      { role: 'assistant', content: 'De hoc IELTS hieu qua, ban nen chia theo 4 ky nang.' },
    ]);
    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Duoc. Ban gui de Writing Task 2 cu the cho minh nhe. Sau do minh se lap dan y gom introduction, body 1, body 2 va conclusion.',
      suggestedLinks: [],
      usedDatabase: false,
      needsMoreContext: true,
      safety: {
        inventedContent: false,
        outOfScope: false,
        containsBandScore: false,
        containsWritingSpeakingGrading: false,
      },
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        sessionId: 'session-1',
        message: 'lap cho toi dan y cua writing part 2',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
    expect(result.dbLookupCalled).toBe(false);
    expect(result.aiResponseValid).toBe(true);
    expect(result.fallbackUsed).toBeFalsy();
    expect(result.finalResponseMode).toBe('ai');
    expect(result.answer).toContain('Writing Task 2');
    expect(result.answer).not.toContain('gap loi');
    expect(repository.getRecentMessages).toHaveBeenCalledWith('user-1', 'session-1', 100);
    expect(aiService.generateAssistantAnswer.mock.calls[0][0].userPrompt).toContain('Recent conversation:');
    expect(aiService.generateAssistantAnswer.mock.calls[0][0].userPrompt).toContain('tip hoc ielts the nao');
  });

  it('keeps strategy follow-up in IELTS_KNOWLEDGE when recent knowledge context exists', async () => {
    repository.getRecentMessages.mockResolvedValue([
      { role: 'user', content: 'Matching Headings làm sao?' },
      { role: 'assistant', content: 'Đọc topic sentence và tìm ý chính toàn đoạn.' },
    ]);
    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Bạn áp dụng bằng cách đọc nhanh đoạn, xác định main idea rồi đối chiếu heading.',
      suggestedLinks: [],
      usedDatabase: false,
      needsMoreContext: false,
      safety: {
        inventedContent: false,
        outOfScope: false,
        containsBandScore: false,
        containsWritingSpeakingGrading: false,
      },
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        sessionId: 'session-1',
        message: 'áp dụng phương pháp đó cho Reading',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
    expect(result.dbLookupCalled).toBe(false);
    expect(pool.query).not.toHaveBeenCalled();
    expect(aiService.generateAssistantAnswer).toHaveBeenCalledTimes(1);
  });

  it('keeps DB lookup follow-up in FIND_TEST and reuses previous Reading skill', async () => {
    repository.getRecentMessages.mockResolvedValue([
      { role: 'user', content: 'Cho tôi đề Reading mới nhất' },
      { role: 'assistant', content: 'Mình tìm thấy đề Reading mới nhất.' },
    ]);
    pool.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'is_published' }, { column_name: 'review_status' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'reading-other',
          title: 'IELTSZone Reading Mock Test Other',
          description: 'Another reading test',
          skill: 'reading',
          difficulty: 'intermediate',
          duration_minutes: 60,
        }],
      });
    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Mình tìm thấy một đề Reading khác trong hệ thống.',
      suggestedLinks: [],
      usedDatabase: true,
      needsMoreContext: false,
      safety: {
        inventedContent: false,
        outOfScope: false,
        containsBandScore: false,
        containsWritingSpeakingGrading: false,
      },
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        sessionId: 'session-1',
        message: 'đề khác đi',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.FIND_TEST);
    expect(result.dbLookupCalled).toBe(true);
    expect(pool.query.mock.calls[1][1]).toEqual(expect.arrayContaining(['reading']));
  });

  it('routes practice follow-up after knowledge context to FIND_TEST', async () => {
    repository.getRecentMessages.mockResolvedValue([
      { role: 'user', content: 'Matching Headings làm sao?' },
      { role: 'assistant', content: 'Đọc ý chính toàn đoạn trước khi chọn heading.' },
    ]);
    pool.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'is_published' }, { column_name: 'review_status' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'reading-practice',
          title: 'IELTSZone Reading Matching Headings Practice',
          description: 'Reading practice',
          skill: 'reading',
          difficulty: 'intermediate',
          duration_minutes: 60,
        }],
      });
    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Mình tìm thấy một đề Reading để bạn luyện cách này.',
      suggestedLinks: [],
      usedDatabase: true,
      needsMoreContext: false,
      safety: {
        inventedContent: false,
        outOfScope: false,
        containsBandScore: false,
        containsWritingSpeakingGrading: false,
      },
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        sessionId: 'session-1',
        message: 'cho tôi bài để luyện cách này',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.FIND_TEST);
    expect(result.dbLookupCalled).toBe(true);
    expect(pool.query.mock.calls[1][1]).toEqual(expect.arrayContaining(['reading']));
  });

  it('asks clarification for context-dependent practice follow-up without recent context', async () => {
    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'cho tôi bài để luyện cách này',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.CLARIFICATION);
    expect(result.answer).toContain('luyện kỹ năng');
    expect(result.dbLookupCalled).not.toBe(true);
    expect(pool.query).not.toHaveBeenCalled();
    expect(aiService.generateAssistantAnswer).not.toHaveBeenCalled();
  });

  it('answers English meaning requests through the AI provider', async () => {
    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: '"What are you doing?" nghia la "Ban dang lam gi?".',
      suggestedLinks: [],
      usedDatabase: false,
      needsMoreContext: false,
      safety: {
        inventedContent: false,
        outOfScope: false,
        containsBandScore: false,
        containsWritingSpeakingGrading: false,
      },
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'what are you doing la gi',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
    expect(result.dbLookupCalled).toBe(false);
    expect(aiService.generateAssistantAnswer).toHaveBeenCalledTimes(1);
    expect(result.answer).toContain('Ban dang lam gi');
  });

  it('answers general English grammar questions without retrieved chunks', async () => {
    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Although theo sau là mệnh đề; despite theo sau danh từ, V-ing hoặc cụm danh từ.',
      suggestedLinks: [],
      usedDatabase: false,
      needsMoreContext: false,
      safety: {
        inventedContent: false,
        outOfScope: false,
        containsBandScore: false,
        containsWritingSpeakingGrading: false,
      },
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'phân biệt although và despite',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
    expect(result.dbLookupCalled).toBe(false);
    expect(result.answer).toContain('Although');
    expect(aiService.generateAssistantAnswer).toHaveBeenCalledTimes(1);
    expect(aiService.generateAssistantAnswer.mock.calls[0][0].userPrompt).toContain('No retrieved IELTS knowledge.');
    expect(aiService.generateAssistantAnswer.mock.calls[0][0].userPrompt).toContain('"detectedTopic": "english_grammar"');
  });

  it('answers general English vocabulary questions without requiring static chunks', async () => {
    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Build vocabulary by learning words in phrases, reviewing with spaced repetition, and using new words in sentences.',
      suggestedLinks: [],
      usedDatabase: false,
      needsMoreContext: false,
      safety: {
        inventedContent: false,
        outOfScope: false,
        containsBandScore: false,
        containsWritingSpeakingGrading: false,
      },
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'how can I improve my vocabulary?',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
    expect(result.dbLookupCalled).toBe(false);
    expect(result.answer).toContain('vocabulary');
    expect(aiService.generateAssistantAnswer).toHaveBeenCalledTimes(1);
    expect(aiService.generateAssistantAnswer.mock.calls[0][0].userPrompt).toContain('No retrieved IELTS knowledge.');
    expect(aiService.generateAssistantAnswer.mock.calls[0][0].userPrompt).toContain('"detectedTopic": "english_vocabulary"');
  });

  it('answers IELTS term explanations through the AI provider', async () => {
    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Skimming trong IELTS Reading la doc luot de nam y chinh cua doan.',
      suggestedLinks: [],
      usedDatabase: false,
      needsMoreContext: false,
      safety: {
        inventedContent: false,
        outOfScope: false,
        containsBandScore: false,
        containsWritingSpeakingGrading: false,
      },
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'skimming la gi trong ielts',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
    expect(result.dbLookupCalled).toBe(false);
    expect(result.answer).toContain('Skimming');
  });

  it('asks for missing text on translation requests instead of technical fallback', async () => {
    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Ban gui cau can dich cho minh nhe, minh se dich va giai thich cach dung.',
      suggestedLinks: [],
      usedDatabase: false,
      needsMoreContext: true,
      safety: {
        inventedContent: false,
        outOfScope: false,
        containsBandScore: false,
        containsWritingSpeakingGrading: false,
      },
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'dich cau nay giup toi',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
    expect(result.dbLookupCalled).toBe(false);
    expect(result.answer).toContain('cau can dich');
    expect(result.answer).not.toContain('gap loi');
    expect(result.finalResponseMode).toBe('ai');
  });

  it('persists a preferred form of address without depending on the AI provider', async () => {
    const result = await handleChat({
      user: { id: 'user-1' },
      payload: {
        message: 'hãy gọi tôi là Siêu nhân Đạt',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(repository.createOrGetSession).toHaveBeenCalledWith('user-1', null);
    expect(repository.saveUserMessage).toHaveBeenCalledWith(
      'session-1',
      'hãy gọi tôi là Siêu nhân Đạt',
      'user-1'
    );
    expect(result.conversationId).toBe('session-1');
    expect(result.answer).toContain('Siêu nhân Đạt');
    expect(repository.setSessionPreference).toHaveBeenCalledWith({
      userId: 'user-1',
      sessionId: 'session-1',
      preferredAddress: 'Siêu nhân Đạt',
    });
    expect(aiService.generateAssistantAnswer).not.toHaveBeenCalled();
  });

  it('uses the remembered form of address on a later greeting in the same owned session', async () => {
    repository.getSessionPreference.mockResolvedValue({
      supported: true,
      preferredAddress: 'Siêu nhân Đạt',
    });
    repository.getRecentMessages.mockResolvedValue([
      { role: 'user', content: 'hãy gọi tôi là Siêu nhân Đạt' },
      { role: 'assistant', content: 'Được nhé, mình sẽ nhớ.' },
    ]);

    const result = await handleChat({
      user: { id: 'user-1' },
      payload: {
        sessionId: 'session-1',
        message: 'chào bạn',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(repository.createOrGetSession).toHaveBeenCalledWith('user-1', 'session-1');
    expect(result.answer).toContain('Chào Siêu nhân Đạt!');
    expect(aiService.generateAssistantAnswer).not.toHaveBeenCalled();
  });

  it('recalls the existing address instead of treating the word "gì" as a new name', async () => {
    repository.getSessionPreference.mockResolvedValue({
      supported: true,
      preferredAddress: 'Siêu nhân Đạt',
    });
    repository.getRecentMessages.mockResolvedValue([
      { role: 'user', content: 'hãy gọi tôi là Siêu nhân Đạt' },
      { role: 'assistant', content: 'Được nhé, mình sẽ nhớ.' },
    ]);

    const result = await handleChat({
      user: { id: 'user-1' },
      payload: {
        sessionId: 'session-1',
        message: 'Bạn đang gọi tôi là gì?',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.answer).toBe('Bạn đã dặn mình gọi bạn là Siêu nhân Đạt.');
    expect(result.answer).not.toContain('gọi bạn là gì.');
    expect(aiService.generateAssistantAnswer).not.toHaveBeenCalled();
  });

  it('keeps a structured address preference after it falls outside recent messages', async () => {
    repository.getSessionPreference.mockResolvedValue({
      supported: true,
      preferredAddress: 'Siêu nhân Đạt',
    });
    repository.getRecentMessages.mockResolvedValue(
      Array.from({ length: 20 }, (_, index) => ({
        role: index % 2 === 0 ? 'user' : 'assistant',
        content: `message ${index + 1}`,
      }))
    );

    const result = await handleChat({
      user: { id: 'user-1' },
      payload: {
        sessionId: 'session-1',
        message: 'hello',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.answer).toContain('Siêu nhân Đạt');
    expect(repository.getSessionPreference).toHaveBeenCalledWith('user-1', 'session-1');
  });

  it('clears the structured address preference without calling the provider', async () => {
    const result = await handleChat({
      user: { id: 'user-1' },
      payload: {
        sessionId: 'session-1',
        message: 'đừng gọi tôi như vậy nữa',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.answer).toContain('không dùng cách gọi đó nữa');
    expect(repository.setSessionPreference).toHaveBeenCalledWith({
      userId: 'user-1',
      sessionId: 'session-1',
      preferredAddress: null,
    });
    expect(aiService.generateAssistantAnswer).not.toHaveBeenCalled();
  });

  it('answers an English clear-preference request in English', async () => {
    const result = await handleChat({
      user: { id: 'user-1' },
      payload: {
        sessionId: 'session-1',
        message: 'stop calling me Captain Dat',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.answer).toBe('Got it. I will stop using that form of address.');
    expect(repository.setSessionPreference).toHaveBeenCalledWith({
      userId: 'user-1',
      sessionId: 'session-1',
      preferredAddress: null,
    });
  });

  it('injects the remembered preference into later English-learning answers', async () => {
    repository.getRecentMessages.mockResolvedValue([
      { role: 'user', content: 'gọi tôi là Siêu nhân Đạt' },
      { role: 'assistant', content: 'Mình sẽ nhớ cách gọi đó.' },
    ]);
    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Although introduces a clause, while despite is followed by a noun phrase.',
      suggestedLinks: [],
      usedDatabase: false,
      needsMoreContext: false,
      safety: {},
    }));

    await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        sessionId: 'session-1',
        message: 'phân biệt although và despite',
        context: { pageType: 'home', route: '/' },
      },
    });

    const userPrompt = aiService.generateAssistantAnswer.mock.calls[0][0].userPrompt;
    expect(userPrompt).toContain('"preferredAddress":"Siêu nhân Đạt"');
    expect(userPrompt).toContain('gọi tôi là Siêu nhân Đạt');
  });

  it('routes a short example follow-up from recent knowledge context', async () => {
    repository.getRecentMessages.mockResolvedValue([
      { role: 'user', content: 'Task 1 overview viết thế nào?' },
      { role: 'assistant', content: 'Overview nêu các đặc điểm nổi bật.' },
    ]);
    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Ví dụ: Overall, both categories increased, with A remaining the larger one.',
      suggestedLinks: [],
      usedDatabase: false,
      needsMoreContext: false,
      safety: {},
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        sessionId: 'session-1',
        message: 'cho ví dụ',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
    expect(result.answer).toContain('Ví dụ');
  });

  it('keeps the original topic through consecutive short follow-ups', async () => {
    repository.getRecentMessages.mockResolvedValue([
      { role: 'user', content: 'Task 1 overview viết thế nào?' },
      { role: 'assistant', content: 'Overview nêu các đặc điểm nổi bật.' },
      { role: 'user', content: 'cho ví dụ' },
      { role: 'assistant', content: 'Overall, both categories increased.' },
    ]);
    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Ví dụ khác: Overall, sales rose, while costs remained stable.',
      suggestedLinks: [],
      usedDatabase: false,
      needsMoreContext: false,
      safety: {},
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        sessionId: 'session-1',
        message: 'ví dụ khác',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
    expect(result.answer).toContain('Ví dụ khác');
  });

  it('uses both Skimming and Scanning turns when asked to combine the two', async () => {
    repository.getSessionPreference.mockResolvedValue({
      supported: true,
      preferredAddress: 'Siêu nhân Đạt',
    });
    repository.getRecentMessages.mockResolvedValue([
      { role: 'user', content: 'Skimming là gì?' },
      { role: 'assistant', content: 'Skimming là đọc lướt để nắm ý chính của đoạn.' },
      { role: 'user', content: 'Scanning là gì?' },
      { role: 'assistant', content: 'Scanning là quét nhanh để tìm thông tin cụ thể.' },
    ]);
    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Siêu nhân Đạt có thể skimming trước để định vị đoạn phù hợp, rồi scanning để tìm chi tiết cần thiết.',
      suggestedLinks: [],
      usedDatabase: false,
      needsMoreContext: false,
      safety: {
        inventedContent: false,
        outOfScope: false,
        containsBandScore: false,
        containsWritingSpeakingGrading: false,
      },
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        sessionId: 'session-1',
        message: 'kết hợp 2 cái này như thế nào?',
        context: { pageType: 'home', route: '/' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
    expect(result.grounding.usedSessionMemory).toBe(true);
    expect(result.answer).toContain('Siêu nhân Đạt');
    expect(pool.query).not.toHaveBeenCalled();
    const userPrompt = aiService.generateAssistantAnswer.mock.calls[0][0].userPrompt;
    expect(userPrompt).toContain('User: Skimming là gì?');
    expect(userPrompt).toContain('Assistant: Skimming là đọc lướt để nắm ý chính của đoạn.');
    expect(userPrompt).toContain('User: Scanning là gì?');
    expect(userPrompt).toContain('Assistant: Scanning là quét nhanh để tìm thông tin cụ thể.');
    expect(userPrompt).toContain('"preferredAddress":"Siêu nhân Đạt"');
  });

  it('uses knowledge history to find a grounded Reading test instead of library resources', async () => {
    repository.getSessionPreference.mockResolvedValue({
      supported: true,
      preferredAddress: 'Siêu nhân Đạt',
    });
    repository.getRecentMessages.mockResolvedValue([
      { role: 'user', content: 'Skimming là gì?' },
      { role: 'assistant', content: 'Skimming là đọc lướt để nắm ý chính của đoạn.' },
      { role: 'user', content: 'Scanning là gì?' },
      {
        role: 'assistant',
        content: 'Scanning là quét nhanh để tìm thông tin cụ thể. Nếu cần thêm bài tập để luyện phần này thì cứ bảo mình nhé!',
      },
    ]);
    pool.query
      .mockResolvedValueOnce({
        rows: [{ column_name: 'is_published' }, { column_name: 'review_status' }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'reading-practice-1',
          title: 'IELTSZone Reading Practice 1',
          description: 'Published Reading practice test',
          skill: 'reading',
          difficulty: 'intermediate',
          duration_minutes: 60,
        }],
      });
    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Được nè, Siêu nhân Đạt. Mình gợi ý IELTSZone Reading Practice 1 để luyện phối hợp skimming và scanning.',
      suggestedLinks: [],
      usedDatabase: true,
      needsMoreContext: false,
      safety: {
        inventedContent: false,
        outOfScope: false,
        containsBandScore: false,
        containsWritingSpeakingGrading: false,
      },
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        sessionId: 'session-1',
        message: 'tìm 1 đề phù hợp với mình nhé',
        context: { pageType: 'library', route: '/library' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.FIND_TEST);
    expect(result.dbLookupCalled).toBe(true);
    expect(result.grounding).toMatchObject({
      usedDatabase: true,
      usedSessionMemory: true,
      sourceTables: ['mock_tests'],
    });
    expect(result.answer).toContain('Siêu nhân Đạt');
    expect(result.answer).toContain('IELTSZone Reading Practice 1');
    expect(result.suggestedLinks[0]).toMatchObject({
      type: 'test',
      href: expect.stringContaining('/tests/reading-practice-1/reading'),
    });

    const queries = pool.query.mock.calls.map(([sql]) => sql);
    expect(queries.some((sql) => sql.includes('FROM mock_tests'))).toBe(true);
    expect(queries.some((sql) => sql.includes('FROM library_resources'))).toBe(false);
    const testQuery = pool.query.mock.calls.find(([sql]) => sql.includes('FROM mock_tests'));
    expect(testQuery[1]).toEqual(expect.arrayContaining(['reading']));

    const userPrompt = aiService.generateAssistantAnswer.mock.calls[0][0].userPrompt;
    expect(userPrompt).toContain('User: Skimming là gì?');
    expect(userPrompt).toContain('User: Scanning là gì?');
    expect(userPrompt).toContain('Nếu cần thêm bài tập để luyện phần này');
    expect(userPrompt).toContain('"preferredAddress":"Siêu nhân Đạt"');
    expect(userPrompt).toContain('IELTSZone Reading Practice 1');
  });
});
