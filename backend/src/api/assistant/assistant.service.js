const aiService = require('../../services/ai.service');
const repository = require('./assistant.repository');
const { evaluateGuardrails } = require('./assistant.guardrails');
const { ASSISTANT_INTENTS, detectIntent, normalizeText } = require('./assistant.intent');
const { buildContextInjection } = require('./assistant.context');
const { buildPrompt } = require('./assistant.prompts');
const { normalizeAssistantResponse } = require('./assistant.response');
const { MISSING_DATA_MESSAGE, selfCheckResponse } = require('./assistant.selfcheck');
const { resolveUserDisplayName } = require('./assistant.user-resolver');
const {
  ASSISTANT_ROLE,
  ASSISTANT_CONTEXT_RESULT_LIMIT,
  ASSISTANT_DISPLAY_RESULT_LIMIT,
  ERROR_CODES,
  ERROR_MESSAGES,
  createAssistantError,
} = require('./assistant.constants');

const buildErrorResult = (code, message = ERROR_MESSAGES[code]) => ({
  answer: null,
  suggestedLinks: [],
  conversationId: null,
  messageId: null,
  intent: null,
  code,
  message,
});

const buildSuccessResult = ({
  answer,
  suggestedLinks = [],
  linkMeta = null,
  conversationId = null,
  messageId = null,
  intent = null,
  fallbackUsed = false,
  finalResponseMode = null,
  aiResponseValid = null,
  aiResponseFormat = null,
  aiRetryUsed = false,
  fallbackReason = null,
  fallbackType = null,
  dbLookupCalled = null,
}) => ({
  answer,
  suggestedLinks,
  linkMeta,
  conversationId,
  messageId,
  intent,
  fallbackUsed,
  finalResponseMode,
  aiResponseValid,
  aiResponseFormat,
  aiRetryUsed,
  fallbackReason,
  fallbackType,
  dbLookupCalled,
  code: null,
});

const isLookupIntent = (intent) =>
  intent === ASSISTANT_INTENTS.FIND_TEST || intent === ASSISTANT_INTENTS.FIND_LESSON;

const ROUTING_MEMORY_LIMIT = 8;

const hasRoutingFollowUpCue = (message) => {
  const text = normalizeText(message);
  return [
    /\b(phuong phap|method|strategy|technique|cach)\s+(do|nay|this|that)\b/,
    /\b(ap dung|apply)\b.*\b(do|nay|this|that)\b/,
    /\b(de|bai|test)\s+khac\b/,
    /\b(another|other)\s+(test|one|practice)\b/,
    /\b(cho toi|cho minh|cho em|give me|show me)\b.*\b(bai|de|test|practice)\b.*\b(luyen|practice)\b.*\b(cach|method|strategy|technique)\s+(nay|do|this|that)\b/,
  ].some((pattern) => pattern.test(text));
};

const inferSkillFromMessage = (message) => {
  const text = normalizeText(message);
  const directSkill = ['reading', 'listening', 'writing', 'speaking'].find((skill) => text.includes(skill));
  if (directSkill) return directSkill;
  if (/\b(matching headings?|heading|headings|true false not given|tfng|skimming|scanning|passage)\b/.test(text)) {
    return 'reading';
  }
  if (/\b(section\s*[1-4]|distractor|nghe)\b/.test(text)) return 'listening';
  if (/\b(task\s*[12]|overview|essay)\b/.test(text)) return 'writing';
  if (/\b(part\s*[123]|cue card|fluency)\b/.test(text)) return 'speaking';
  return null;
};

const inferPreviousRoutingContext = (recentMessages = [], baseContext = {}) => {
  const lastUserMessage = [...recentMessages].reverse().find((item) => item.role === 'user' && item.content);
  if (!lastUserMessage) return {};

  const previousIntent = detectIntent({
    message: lastUserMessage.content,
    context: baseContext,
  });

  if (![
    ASSISTANT_INTENTS.IELTS_KNOWLEDGE,
    ASSISTANT_INTENTS.FIND_TEST,
    ASSISTANT_INTENTS.FIND_LESSON,
  ].includes(previousIntent)) {
    return {};
  }

  return {
    previousIntent,
    previousSkill: inferSkillFromMessage(lastUserMessage.content),
  };
};

const buildRoutingContext = async ({ user, payload, sessionId }) => {
  const baseContext = payload.context || {};
  if (!sessionId || !user?.id || !hasRoutingFollowUpCue(payload.message)) {
    return baseContext;
  }

  try {
    const recentMessages = await repository.getRecentMessages(user.id, sessionId, ROUTING_MEMORY_LIMIT);
    const previousRouting = inferPreviousRoutingContext(recentMessages, baseContext);
    return {
      ...baseContext,
      ...previousRouting,
      recentMessages,
    };
  } catch (error) {
    console.warn('[AssistantService] Routing memory read skipped:', error.message);
    return baseContext;
  }
};

const isEmptyLookupContext = (contextInjection) =>
  isLookupIntent(contextInjection.mode) && contextInjection.databaseResults.length === 0;

const limitDisplayLinks = (links = []) => links.slice(0, ASSISTANT_DISPLAY_RESULT_LIMIT);

const buildLinkMeta = (contextInjection, links = contextInjection.suggestedLinks || []) => {
  const totalMatched = contextInjection.debug?.contextRowCount ?? links.length;
  const displayedCount = Math.min(links.length, ASSISTANT_DISPLAY_RESULT_LIMIT);
  return {
    totalMatched,
    displayedCount,
    hasMore: totalMatched > displayedCount,
    allUrl: contextInjection.mode === ASSISTANT_INTENTS.FIND_LESSON ? '/library' : null,
  };
};

const getResultTitle = (item) => item.title || item.name || item.label || 'IELTS content';

const summarizeLookupResults = (items) => {
  const names = items.slice(0, 3).map(getResultTitle).join(', ');
  return items.length > 3 ? `${names}...` : names;
};

const buildLookupFallbackAnswer = (contextInjection) => {
  const items = contextInjection.databaseResults || [];
  const lookupMissing = Boolean(contextInjection.debug?.lookupMissing);
  if (items.length === 0) {
    if (contextInjection.mode === ASSISTANT_INTENTS.FIND_TEST && contextInjection.debug?.skillFilter) {
      return `Mình chưa tìm thấy đề ${contextInjection.debug.skillFilter} nào đang được publish trong hệ thống.`;
    }
    return MISSING_DATA_MESSAGE;
  }

  if (contextInjection.mode === ASSISTANT_INTENTS.FIND_TEST) {
    const skill = contextInjection.debug?.skillFilter || 'IELTS';
    if (lookupMissing) {
      let msg = `Mình chưa tìm thấy đề ${skill} khớp đúng yêu cầu, nhưng hệ thống đang có ${items.length} đề published/approved khác:\n\n`;
      items.slice(0, ASSISTANT_DISPLAY_RESULT_LIMIT).forEach((item, index) => {
        msg += `${index + 1}. ${item.title || 'Untitled'} - ${item.skill || 'Skill'}, ${item.difficulty || 'Difficulty'}\n`;
      });
      msg += '\nBạn muốn xem thử đề nào trong danh sách này không?';
      return msg;
    }
    let msg = `Mình tìm thấy ${items.length} đề ${skill} đang được publish trong hệ thống:\n\n`;
    items.slice(0, ASSISTANT_DISPLAY_RESULT_LIMIT).forEach((item, index) => {
      msg += `${index + 1}. ${item.title || 'Untitled'} — ${item.skill || 'Skill'}, ${item.difficulty || 'Difficulty'}\n`;
    });
    msg += '\nBạn muốn mở đề nào?';
    return msg;
  }
  
  if (contextInjection.mode === ASSISTANT_INTENTS.FIND_LESSON) {
    if (lookupMissing) {
      let msg = `Mình chưa tìm thấy tài liệu khớp đúng yêu cầu, nhưng thư viện đang có ${items.length} tài liệu published/approved khác:\n\n`;
      items.slice(0, ASSISTANT_DISPLAY_RESULT_LIMIT).forEach((item, index) => {
        msg += `${index + 1}. ${item.title || 'Untitled'} - ${item.resourceType || 'N/A'}, ${item.category || 'N/A'}\n`;
      });
      msg += '\nBạn có thể mở trang Library ở phần link gợi ý bên dưới.';
      return msg;
    }
    if (items.length === 1) {
      const item = items[0];
      return `Mình tìm thấy tài liệu '${item.title || 'Untitled'}' trong thư viện. Loại tài liệu: ${item.resourceType || 'N/A'}. Category: ${item.category || 'N/A'}.`;
    }
    let msg = `Mình tìm thấy ${items.length} tài liệu trong thư viện:\n\n`;
    items.slice(0, ASSISTANT_DISPLAY_RESULT_LIMIT).forEach((item, index) => {
      msg += `${index + 1}. ${item.title || 'Untitled'} — ${item.resourceType || 'N/A'}, ${item.category || 'N/A'}\n`;
    });
    msg += '\nBạn có thể mở trang Library ở phần link gợi ý bên dưới.';
    return msg;
  }
  
  return MISSING_DATA_MESSAGE;
};

const getFallbackAnswer = (contextInjection) => {
  if (isLookupIntent(contextInjection.mode)) return buildLookupFallbackAnswer(contextInjection);
  if (contextInjection.mode === ASSISTANT_INTENTS.POST_TEST_REVIEW) {
    return ERROR_MESSAGES[ERROR_CODES.MISSING_EXPLANATION];
  }
  if (contextInjection.mode === ASSISTANT_INTENTS.IELTS_KNOWLEDGE) {
    return 'Mình đang gặp lỗi khi tạo câu trả lời IELTS. Bạn thử hỏi lại giúp mình nhé.';
  }
  return 'Mình có thể hỗ trợ nội dung IELTS trên website như tìm test, lesson, study tips, navigation hoặc review đáp án sau khi nộp bài.';
};

const buildIeltsKnowledgeFallback = (message) => {
  return 'Mình đang gặp lỗi khi tạo câu trả lời IELTS. Bạn thử hỏi lại giúp mình nhé.';
  const text = String(message || '').toLowerCase();
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized.includes('overview') || normalized.includes('task 1')) {
    return [
      'Mình chưa gọi được AI lúc này, nhưng với IELTS Writing Task 1, overview nên viết như sau:',
      '1. Viết 1-2 câu sau phần introduction.',
      '2. Chỉ nêu xu hướng/đặc điểm nổi bật nhất, không đưa số liệu chi tiết.',
      '3. Với biểu đồ: nêu xu hướng tăng/giảm, nhóm cao/thấp, điểm khác biệt lớn.',
      '4. Với map/process: nêu thay đổi chính hoặc số bước chính.',
    ].join('\n');
  }
  if (normalized.includes('speaking') || normalized.includes('part 2')) {
    return [
      'Mình chưa gọi được AI lúc này, nhưng với IELTS Speaking Part 2:',
      '1. Bạn có 1 phút chuẩn bị và nên nói khoảng 1-2 phút.',
      '2. Dùng cue card để chia ý: who/what/when/where/why/how.',
      '3. Mở rộng bằng ví dụ cá nhân, cảm xúc và lý do.',
      '4. Đừng dừng quá sớm; nếu bí, hãy mô tả thêm bối cảnh hoặc so sánh.',
    ].join('\n');
  }
  if (text.includes('reading') || normalized.includes('true false not given') || normalized.includes('matching headings')) {
    return [
      'Mình chưa gọi được AI lúc này, nhưng đây là mẹo IELTS Reading an toàn để bạn áp dụng:',
      '1. Đọc câu hỏi trước, gạch keyword chính.',
      '2. Scan đoạn văn để tìm keyword/paraphrase, đừng đọc từng chữ từ đầu.',
      '3. Với True/False/Not Given, chỉ chọn True/False khi thông tin được xác nhận hoặc phủ định rõ trong bài.',
      '4. Với Matching Headings, đọc topic sentence và ý chính cả đoạn, không chọn chỉ vì một từ bị lặp lại.',
    ].join('\n');
  }
  return 'Mình chưa gọi được AI lúc này, nhưng bạn có thể hỏi lại theo kỹ năng cụ thể như Reading, Listening, Writing hoặc Speaking để mình đưa tips IELTS phù hợp.';
};

const isGenericAssistantAnswer = (answer) => {
  const text = String(answer || '').toLowerCase();
  return text.includes('mình có thể hỗ trợ nội dung ielts') ||
    text.includes('tim test, lesson') ||
    text.includes('tìm test, lesson') ||
    text.includes('review đáp án');
};

const emitAssistantDebug = (data) => {
  if (process.env.ASSISTANT_DEBUG === 'false') return;
  console.info('[AssistantDebug]', {
    message: data.message || null,
    route: data.route || null,
    pageType: data.pageType || null,
    userId: data.userId || null,
    userDisplayName: data.userDisplayName || null,
    userNameSource: data.userNameSource || null,
    userNameFallbackUsed: Boolean(data.userNameFallbackUsed),
    userNameFallbackReason: data.userNameFallbackReason || null,
    userNameDbErrorCode: data.userNameDbError?.code || null,
    userNameDbErrorMessage: data.userNameDbError?.message || null,
    ruleIntent: data.ruleIntent || null,
    classifierUsed: Boolean(data.classifierUsed),
    classifierIntent: data.classifierIntent || null,
    classifierConfidence: data.classifierConfidence || 0,
    classifierError: data.classifierError || null,
    finalIntent: data.finalIntent || null,
    detectedIntent: data.detectedIntent || null,
    detectedSkill: data.detectedSkill || null,
    detectedQuestionType: data.detectedQuestionType || null,
    detectedTopic: data.detectedTopic || null,
    selectedKnowledgeChunkIds: data.selectedKnowledgeChunkIds || [],
    retrievalScores: data.retrievalScores || [],
    usedKnowledgeBase: Boolean(data.usedKnowledgeBase),
    noMatch: Boolean(data.noMatch),
    totalInjectedKnowledgeChars: data.totalInjectedKnowledgeChars || 0,
    knowledgeError: data.knowledgeError || null,
    queryTable: data.queryTable || null,
    selectedColumns: data.selectedColumns || null,
    publishFilter: data.publishFilter || null,
    searchTerms: data.searchTerms || [],
    exactTitleMatch: Boolean(data.exactTitleMatch),
    fuzzyTitleMatch: Boolean(data.fuzzyTitleMatch),
    skillFilter: data.skillFilter || null,
    difficultyFilter: data.difficultyFilter || null,
    requestedQuantity: data.requestedQuantity || null,
    effectiveLimit: data.effectiveLimit || null,
    sortOrder: data.sortOrder || null,
    sortField: data.sortField || null,
    titleNumber: data.titleNumber || null,
    testNumber: data.testNumber || null,
    action: data.action || null,
    attemptId: data.attemptId || null,
    reviewMode: data.reviewMode || null,
    reviewFallbackReason: data.reviewFallbackReason || null,
    resourceTypeFilter: data.resourceTypeFilter || null,
    rowCount: data.rowCount || 0,
    dbRowCount: data.dbRowCount || 0,
    contextRowCount: data.contextRowCount || data.rowCount || 0,
    displayedRowCount: data.displayedRowCount || data.rowCount || 0,
    contextLimit: data.contextLimit || null,
    contextLimitApplied: Boolean(data.contextLimitApplied),
    lookupMissing: Boolean(data.lookupMissing),
    resultTitles: data.resultTitles || [],
    fallbackUsed: Boolean(data.fallbackUsed),
    fallbackReason: data.fallbackReason || null,
    classifierProviderCalled: Boolean(data.classifierProviderCalled),
    answerProviderCalled: Boolean(data.answerProviderCalled),
    dbLookupCalled: Boolean(data.dbLookupCalled),
    sessionMemoryCount: data.sessionMemoryCount || 0,
    aiResponseValid: data.aiResponseValid === null || data.aiResponseValid === undefined ? null : Boolean(data.aiResponseValid),
    aiResponseFormat: data.aiResponseFormat || null,
    aiRetryUsed: Boolean(data.aiRetryUsed),
    fallbackType: data.fallbackType || null,
    totalAiCalls: data.totalAiCalls || 0,
    finalResponseMode: data.finalResponseMode || 'safe_missing_data',
    'dbError.message': data.dbError?.message || null,
    'dbError.code': data.dbError?.code || null,
  });
};

const safeCreateSession = async (userId) => {
  try {
    return await repository.createOrGetSession(userId);
  } catch (error) {
    console.warn('[AssistantService] Session creation skipped:', error.message);
    return null;
  }
};

const safeSaveUserMessage = async (sessionId, message, userId) => {
  try {
    return await repository.saveUserMessage(sessionId, message, userId);
  } catch (error) {
    console.warn('[AssistantService] User message storage skipped:', error.message);
    return null;
  }
};

const safeSaveAssistantMessage = async (sessionId, answer, userId) => {
  try {
    return await repository.saveAssistantMessage(sessionId, answer, userId);
  } catch (error) {
    console.warn('[AssistantService] Assistant message storage skipped:', error.message);
    return null;
  }
};

const {
  buildGreetingResponse,
  buildClarificationResponse,
  buildSafeGradingResponse,
  buildOutOfScopeResponse,
} = require('./assistant.responses');

const buildImmediateIntentResult = (intent, userNameContext = null, user = null, message = '') => {
  if (intent === ASSISTANT_INTENTS.OUT_OF_SCOPE) {
    return buildSuccessResult({ answer: buildOutOfScopeResponse(), intent });
  }
  if (intent === ASSISTANT_INTENTS.GREETING) {
    return buildSuccessResult({
      answer: buildGreetingResponse({
        displayName: userNameContext?.displayName || 'bạn',
        isGuest: !user,
        message,
      }),
      intent,
      finalResponseMode: 'immediate',
    });
  }
  if (intent === ASSISTANT_INTENTS.CLARIFICATION) {
    return buildSuccessResult({ answer: buildClarificationResponse(message), intent });
  }
  if (intent === ASSISTANT_INTENTS.GRADING_REQUEST_SAFE_FEEDBACK) {
    return buildSuccessResult({ answer: buildSafeGradingResponse(), intent });
  }
  return null;
};

const buildGuardrailResult = ({ message, context }) => {
  const guardrail = evaluateGuardrails({ message, context });
  if (guardrail.blocked) return buildErrorResult(guardrail.code, guardrail.message);
  if (context.pageType === 'active-test') {
    return buildErrorResult(ERROR_CODES.ASSISTANT_DISABLED_DURING_TEST);
  }
  return null;
};

const buildImmediateContextResult = (contextInjection) => {
  if (contextInjection.directAnswer) {
    return buildSuccessResult({
      answer: contextInjection.directAnswer,
      suggestedLinks: limitDisplayLinks(contextInjection.suggestedLinks || []),
      linkMeta: buildLinkMeta(contextInjection),
      intent: contextInjection.mode,
      finalResponseMode: contextInjection.finalResponseMode || 'immediate',
      dbLookupCalled: Boolean(contextInjection.debug?.queryTable),
    });
  }
  if (contextInjection.errorCode) return buildErrorResult(contextInjection.errorCode);
  if (isLookupIntent(contextInjection.mode) && contextInjection.debug?.lookupMissing && contextInjection.databaseResults.length > 0) {
    return buildSuccessResult({
      answer: buildLookupFallbackAnswer(contextInjection),
      suggestedLinks: limitDisplayLinks(contextInjection.suggestedLinks || []),
      linkMeta: buildLinkMeta(contextInjection),
      intent: contextInjection.mode,
      fallbackUsed: true,
      finalResponseMode: 'safe_missing_data_with_suggestions',
      dbLookupCalled: Boolean(contextInjection.debug?.queryTable),
    });
  }
  if (isEmptyLookupContext(contextInjection)) {
    return buildSuccessResult({
      answer: buildLookupFallbackAnswer(contextInjection),
      intent: contextInjection.mode,
      finalResponseMode: 'safe_missing_data',
      dbLookupCalled: Boolean(contextInjection.debug?.queryTable),
    });
  }
  return null;
};

const normalizeAndSelfCheck = ({ rawAnswer, contextInjection, allowPlainText = false }) => {
  const normalized = normalizeAssistantResponse({
    rawText: rawAnswer,
    mode: contextInjection.mode,
    fallbackAnswer: getFallbackAnswer(contextInjection),
    fallbackLinks: contextInjection.suggestedLinks,
    allowPlainText,
  });
  const checked = selfCheckResponse({ response: normalized, contextInjection });
  if (isLookupIntent(contextInjection.mode) && contextInjection.databaseResults?.length && isGenericAssistantAnswer(checked.answer)) {
    return {
      ...checked,
      answer: buildLookupFallbackAnswer(contextInjection),
      suggestedLinks: limitDisplayLinks(contextInjection.suggestedLinks || []),
      linkMeta: buildLinkMeta(contextInjection),
      usedDatabase: true,
      needsMoreContext: false,
      fallbackUsed: true,
      finalResponseMode: 'deterministic_fallback'
    };
  }
  if (contextInjection.suggestedLinks?.length) {
    return {
      ...checked,
      suggestedLinks: limitDisplayLinks(contextInjection.suggestedLinks),
      linkMeta: buildLinkMeta(contextInjection),
      finalResponseMode: 'ai'
    };
  }
  return { ...checked, finalResponseMode: 'ai' };
};

const isInvalidKnowledgeResponse = (response, contextInjection) =>
  contextInjection.mode === ASSISTANT_INTENTS.IELTS_KNOWLEDGE &&
  response.aiResponseValid === false;

const buildAssistantUsageContext = ({ payload, contextInjection, user }) => {
  const pageType = payload.context?.pageType;
  const isReview = pageType === 'review'
    || pageType === 'result'
    || contextInjection?.mode === ASSISTANT_INTENTS.POST_TEST_REVIEW;
  return {
    userId: user?.id || user?.sub || null,
    feature: isReview ? 'explain_with_ai' : 'chatbot',
    entityType: isReview ? 'test_attempt' : 'chatbot_message',
    entityId: isReview ? (payload.context?.attemptId || null) : (payload.sessionId || null),
  };
};

const generateCheckedAnswer = async ({ payload, contextInjection }) => {
  const prompt = buildPrompt({ message: payload.message, contextInjection });
  const rawAnswer = await aiService.generateAssistantAnswer({
    mode: contextInjection.mode,
    message: payload.message,
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt,
    usageContext: buildAssistantUsageContext({ payload, contextInjection, user: payload.user }),
  });
  return normalizeAndSelfCheck({ rawAnswer, contextInjection });
};

const generateCheckedStreamAnswer = async ({ payload, contextInjection }) => {
  const prompt = buildPrompt({ message: payload.message, contextInjection });
  let streamedText = '';
  const rawAnswer = await aiService.streamAssistantAnswer({
    mode: contextInjection.mode,
    message: payload.message,
    systemPrompt: `${prompt.systemPrompt}\nReturn only final answer text for streaming.`,
    userPrompt: `${prompt.userPrompt}\n\nReturn only answer text. Do not wrap it in JSON.`,
    onDelta: (delta) => {
      streamedText += delta;
    },
    usageContext: buildAssistantUsageContext({ payload, contextInjection, user: payload.user }),
  });
  return normalizeAndSelfCheck({
    rawAnswer: rawAnswer || streamedText,
    contextInjection,
    allowPlainText: true,
  });
};

const generateKnowledgeRetryAnswer = async ({ payload, contextInjection }) => {
  const recentConversation = (contextInjection.sessionMemory || [])
    .map((item) => `${item.role === 'user' ? 'User' : 'Assistant'}: ${item.content}`)
    .join('\n') || 'No recent conversation.';
  const rawAnswer = await aiService.generateAssistantAnswer({
    mode: contextInjection.mode,
    message: payload.message,
    systemPrompt: [
      'You are an IELTS and English learning assistant.',
      'Answer directly in Vietnamese. Plain text is allowed; JSON is not required.',
      'Use recent conversation to understand follow-up questions.',
      'If the user asks for a Writing Task 2 outline without a concrete topic, ask for the topic instead of inventing an outline.',
      'If the user asks to translate/correct/paraphrase without providing text, ask them to send the text.',
      'Do not say generic capability text. Do not invent website data or official tests/answers.',
      'Bạn là IELTS Expert Assistant.',
      'Trả lời trực tiếp câu hỏi IELTS của học viên bằng tiếng Việt.',
      'Chỉ trả lời nội dung liên quan IELTS.',
      'Không cần JSON. Không nói chung chung kiểu "tôi có thể hỗ trợ".',
      'Không chấm band số, không bịa dữ liệu website hoặc đề/đáp án chính thức.',
    ].join('\n'),
    userPrompt: [
      'Recent conversation:',
      recentConversation,
      '',
      'Current student question:',
      payload.message,
    ].join('\n'),
    usageContext: buildAssistantUsageContext({ payload, contextInjection, user: payload.user }),
  });
  return normalizeAndSelfCheck({
    rawAnswer,
    contextInjection,
    allowPlainText: true,
  });
};

const buildAiResult = async ({ payload, contextInjection, useStream }) => {
  let response;
  let aiRetryUsed = false;
  let fallbackReason = null;
  let fallbackType = null;
  try {
    response = useStream
      ? await generateCheckedStreamAnswer({ payload, contextInjection })
      : await generateCheckedAnswer({ payload, contextInjection });

    if (isInvalidKnowledgeResponse(response, contextInjection)) {
      aiRetryUsed = true;
      fallbackReason = response.invalidReason || 'invalid_ai_response';
      response = await generateKnowledgeRetryAnswer({ payload, contextInjection });
      response = {
        ...response,
        finalResponseMode: response.aiResponseValid === false ? 'ai_fallback_error' : 'knowledge_answer',
      };
    }

    if (isInvalidKnowledgeResponse(response, contextInjection)) {
      fallbackType = 'ai_error_message';
      response = {
        answer: buildIeltsKnowledgeFallback(payload.message),
        suggestedLinks: [],
        fallbackUsed: true,
        finalResponseMode: 'ai_fallback_error',
        aiResponseValid: false,
        aiResponseFormat: response.aiResponseFormat,
        invalidReason: response.invalidReason || fallbackReason,
      };
    }
  } catch (error) {
    if (contextInjection.mode !== ASSISTANT_INTENTS.IELTS_KNOWLEDGE) throw error;
    fallbackReason = error.code || error.message || 'ai_provider_error';
    fallbackType = 'ai_error_message';
    response = {
      answer: buildIeltsKnowledgeFallback(payload.message),
      suggestedLinks: [],
      fallbackUsed: true,
      finalResponseMode: 'ai_fallback_error',
      aiResponseValid: false,
      aiResponseFormat: 'empty',
      invalidReason: fallbackReason,
    };
  }
  return {
    ...buildSuccessResult({
      answer: response.answer,
      suggestedLinks: limitDisplayLinks(response.suggestedLinks),
      linkMeta: response.linkMeta || buildLinkMeta(contextInjection, response.suggestedLinks || []),
      intent: contextInjection.mode,
      fallbackUsed: response.fallbackUsed,
      aiResponseValid: response.aiResponseValid,
      aiResponseFormat: response.aiResponseFormat,
      aiRetryUsed,
      fallbackReason: response.invalidReason || fallbackReason,
      fallbackType: fallbackType || (response.fallbackUsed ? 'deterministic_fallback' : null),
      dbLookupCalled: Boolean(contextInjection.debug?.queryTable),
    }),
    finalResponseMode: response.finalResponseMode
  };
};

const tracePipeline = ({
  payload,
  user,
  userNameContext,
  ruleIntent,
  classifierUsed,
  classifierResult,
  contextInjection,
  answerProviderCalled,
  fallbackUsed,
  finalResponseMode,
  aiResponseValid = null,
  aiResponseFormat = null,
  aiRetryUsed = false,
  fallbackReason = null,
  fallbackType = null,
}) => {
  const classifierProviderCalled = Boolean(classifierUsed);
  emitAssistantDebug({
    message: payload.message,
    route: payload.context.route,
    pageType: payload.context.pageType,
    userId: user?.id || user?.sub || null,
    userDisplayName: userNameContext?.displayName || null,
    userNameSource: userNameContext?.source || null,
    userNameFallbackUsed: userNameContext?.fallbackUsed,
    userNameFallbackReason: userNameContext?.fallbackReason,
    userNameDbError: userNameContext?.dbError,
    ruleIntent,
    classifierUsed,
    classifierIntent: classifierResult?.intent || null,
    classifierConfidence: classifierResult?.confidence || 0,
    classifierError: classifierResult?.error || null,
    finalIntent: classifierResult?.intent || ruleIntent,
    ...(contextInjection?.debug || {}),
    classifierProviderCalled,
    answerProviderCalled: Boolean(answerProviderCalled),
    dbLookupCalled: Boolean(contextInjection?.debug?.queryTable),
    sessionMemoryCount: contextInjection?.sessionMemory?.length || 0,
    aiResponseValid,
    aiResponseFormat,
    aiRetryUsed,
    fallbackType,
    totalAiCalls: (classifierProviderCalled ? 1 : 0) + (answerProviderCalled ? 1 : 0) + (aiRetryUsed ? 1 : 0),
    fallbackUsed,
    fallbackReason: fallbackReason || contextInjection?.debug?.fallbackReason,
    finalResponseMode,
  });
};

const runAssistantPipeline = async ({ user, payload, useStream = false }) => {
  const sessionId = payload.sessionId || null;
  const routingContext = await buildRoutingContext({ user, payload, sessionId });
  const originalIntent = detectIntent({ message: payload.message, context: routingContext });
  let intent = originalIntent;
  let classifierUsed = false;
  let classifierResult = null;
  let userNameContext = null;
  const getUserNameContext = async () => {
    if (!userNameContext) userNameContext = await resolveUserDisplayName(user);
    return userNameContext;
  };

  if (intent === ASSISTANT_INTENTS.UNKNOWN) {
    const { classifyScope } = require('./assistant.scope-classifier');
    classifierResult = await classifyScope(payload.message, {
      usageContext: {
        userId: user?.id || user?.sub || null,
        feature: ['review', 'result'].includes(payload.context?.pageType)
          ? 'explain_with_ai'
          : 'chatbot',
        entityType: ['review', 'result'].includes(payload.context?.pageType)
          ? 'test_attempt'
          : 'chatbot_message',
        entityId: payload.context?.attemptId || payload.sessionId || null,
      },
    });
    classifierUsed = true;
    intent = classifierResult.intent;
    
    if (classifierResult.error) {
      const intentResult = buildImmediateIntentResult(ASSISTANT_INTENTS.CLARIFICATION, userNameContext, user);
      tracePipeline({ payload, user, userNameContext, ruleIntent: originalIntent, classifierUsed, classifierResult, answerProviderCalled: false, finalResponseMode: 'classifier_error_clarification' });
      return intentResult;
    }
  }

  if (intent === ASSISTANT_INTENTS.GREETING) {
    userNameContext = await getUserNameContext();
  }

  const intentResult = buildImmediateIntentResult(intent, userNameContext, user, payload.message);
  if (intentResult) {
    tracePipeline({ payload, user, userNameContext, ruleIntent: originalIntent, classifierUsed, classifierResult, answerProviderCalled: false, finalResponseMode: 'immediate' });
    return intentResult;
  }

  const guardrailResult = buildGuardrailResult({ message: payload.message, context: payload.context });
  if (guardrailResult) {
    tracePipeline({ payload, user, userNameContext, ruleIntent: originalIntent, classifierUsed, classifierResult, answerProviderCalled: false, finalResponseMode: 'guardrail_blocked' });
    return { ...guardrailResult, intent };
  }

  const contextInjection = await buildContextInjection({
    intent,
    message: payload.message,
    context: routingContext,
    user,
    sessionId,
  });
  const contextResult = buildImmediateContextResult(contextInjection);
  if (contextResult) {
    tracePipeline({
      payload,
      user,
      userNameContext,
      ruleIntent: originalIntent,
      classifierUsed,
      classifierResult,
      contextInjection,
      answerProviderCalled: false,
      fallbackUsed: contextResult.fallbackUsed,
      finalResponseMode: contextResult.finalResponseMode || 'safe_missing_data'
    });
    return contextResult;
  }

  const result = await buildAiResult({ payload: { ...payload, user }, contextInjection, useStream });
  tracePipeline({
    payload,
    user,
    userNameContext,
    ruleIntent: originalIntent,
    classifierUsed,
    classifierResult,
    contextInjection,
    answerProviderCalled: true,
    fallbackUsed: result.fallbackUsed,
    finalResponseMode: result.finalResponseMode || 'ai',
    aiResponseValid: result.aiResponseValid,
    aiResponseFormat: result.aiResponseFormat,
    aiRetryUsed: result.aiRetryUsed,
    fallbackReason: result.fallbackReason,
    fallbackType: result.fallbackType,
  });
  return result;
};

const persistSuccessfulResult = async ({ user, payload, result }) => {
  if (result.code || !result.answer) return result;
  const sessionId = payload.sessionId || await safeCreateSession(user.id);
  await safeSaveUserMessage(sessionId, payload.message, user.id);
  const saved = await safeSaveAssistantMessage(sessionId, result.answer, user.id);
  return { ...result, conversationId: sessionId, messageId: saved?.id || null };
};

const handleChat = async ({ user, payload }) => {
  try {
    const sessionId = await safeCreateSession(user.id);
    const payloadWithSession = { ...payload, sessionId };
    const result = await runAssistantPipeline({ user, payload: payloadWithSession });
    return persistSuccessfulResult({ user, payload: payloadWithSession, result });
  } catch (error) {
    if (error.code && ERROR_MESSAGES[error.code]) {
      return buildErrorResult(error.code, error.message);
    }
    throw createAssistantError(ERROR_CODES.INTERNAL_ERROR);
  }
};

const handleChatStream = async ({ user, payload, onEvent }) => {
  try {
    const sessionId = await safeCreateSession(user.id);
    const payloadWithSession = { ...payload, sessionId };
    const result = await runAssistantPipeline({ user, payload: payloadWithSession, useStream: true });
    const savedResult = await persistSuccessfulResult({ user, payload: payloadWithSession, result });
    emitStreamResult({ onEvent, result: savedResult });
    return savedResult;
  } catch (error) {
    const result = buildErrorResult(error.code || ERROR_CODES.INTERNAL_ERROR, error.message);
    onEvent('assistant.error', result);
    return result;
  }
};

const emitStreamResult = ({ onEvent, result }) => {
  if (result.code) {
    onEvent('assistant.error', result);
    return;
  }
  onEvent('assistant.start', {
    conversationId: result.conversationId,
    intent: result.intent,
  });
  onEvent('assistant.delta', { delta: result.answer });
  onEvent('assistant.done', result);
};

const getHistory = async (userId) => {
  const rows = await repository.getHistory(userId);
  return rows.map((row) => ({
    id: row.id,
    role: row.role || ASSISTANT_ROLE.ASSISTANT,
    content: row.content || '',
    createdAt: row.created_at || null,
  }));
};

const rateMessage = async ({ userId, messageId, rating, reason }) => {
  const result = await repository.rateAssistantMessage({ userId, messageId, rating, reason });
  if (result.saved) return { success: true, messageId: result.messageId, rating, code: null };
  return {
    success: false,
    messageId,
    rating,
    code: result.reason === 'message_not_found_or_forbidden' ? ERROR_CODES.FORBIDDEN : ERROR_CODES.MISSING_CONTEXT,
    message: ERROR_MESSAGES[ERROR_CODES.MISSING_CONTEXT],
  };
};

module.exports = {
  handleChat,
  handleChatStream,
  getHistory,
  rateMessage,
  buildErrorResult,
  buildSuccessResult,
  runAssistantPipeline,
};
