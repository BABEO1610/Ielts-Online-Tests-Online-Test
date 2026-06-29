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
  getHistory: jest.fn(),
  rateAssistantMessage: jest.fn(),
}));

const aiService = require('../../../src/services/ai.service');
const repository = require('../../../src/api/assistant/assistant.repository');
const { pool } = require('../../../src/db/pool');
const { ASSISTANT_INTENTS } = require('../../../src/api/assistant/assistant.intent');
const { clearColumnCacheForTests } = require('../../../src/api/assistant/assistant.context');
const { runAssistantPipeline } = require('../../../src/api/assistant/assistant.service');

describe('Assistant service pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockReset();
    pool.query.mockResolvedValue({ rows: [] });
    repository.getRecentMessages.mockResolvedValue([]);
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
      answer: 'Mình tìm thấy 1 đề Reading cũ nhất.',
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
    expect(result.answer).toContain('gặp lỗi khi tạo câu trả lời IELTS');
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
    expect(result.answer).toContain('IELTS');
    expect(result.finalResponseMode).toBe('ai_fallback_error');
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
    expect(result.answer).toContain('gặp lỗi');
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
});

describe('Assistant service multi-turn and English-learning runtime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockReset();
    pool.query.mockResolvedValue({ rows: [] });
    repository.getRecentMessages.mockResolvedValue([]);
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
    expect(repository.getRecentMessages).toHaveBeenCalledWith('user-1', 'session-1', 8);
    expect(aiService.generateAssistantAnswer.mock.calls[0][0].userPrompt).toContain('Recent conversation:');
    expect(aiService.generateAssistantAnswer.mock.calls[0][0].userPrompt).toContain('tip hoc ielts the nao');
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
});
