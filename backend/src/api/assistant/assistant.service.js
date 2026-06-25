const aiService = require('../../services/ai.service');
const repository = require('./assistant.repository');
const { evaluateGuardrails } = require('./assistant.guardrails');
const { ASSISTANT_INTENTS, detectIntent } = require('./assistant.intent');
const { buildContextInjection } = require('./assistant.context');
const { buildPrompt } = require('./assistant.prompts');
const { normalizeAssistantResponse } = require('./assistant.response');
const { MISSING_DATA_MESSAGE, selfCheckResponse } = require('./assistant.selfcheck');
const {
  ASSISTANT_ROLE,
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
  conversationId = null,
  messageId = null,
  intent = null,
  fallbackUsed = false,
}) => ({
  answer,
  suggestedLinks,
  conversationId,
  messageId,
  intent,
  fallbackUsed,
  code: null,
});

const isLookupIntent = (intent) =>
  intent === ASSISTANT_INTENTS.FIND_TEST || intent === ASSISTANT_INTENTS.FIND_LESSON;

const isEmptyLookupContext = (contextInjection) =>
  isLookupIntent(contextInjection.mode) && contextInjection.databaseResults.length === 0;

const getResultTitle = (item) => item.title || item.name || item.label || 'IELTS content';

const summarizeLookupResults = (items) => {
  const names = items.slice(0, 3).map(getResultTitle).join(', ');
  return items.length > 3 ? `${names}...` : names;
};

const buildLookupFallbackAnswer = (contextInjection) => {
  const items = contextInjection.databaseResults || [];
  if (items.length === 0) return MISSING_DATA_MESSAGE;

  if (contextInjection.mode === ASSISTANT_INTENTS.FIND_TEST) {
    const skill = contextInjection.debug?.skillFilter || 'IELTS';
    let msg = `Mình tìm thấy ${items.length} đề ${skill} đang được publish trong hệ thống:\n\n`;
    items.slice(0, 5).forEach((item, index) => {
      msg += `${index + 1}. ${item.title || 'Untitled'} — ${item.skill || 'Skill'}, ${item.difficulty || 'Difficulty'}\n`;
    });
    msg += '\nBạn muốn mở đề nào?';
    return msg;
  }
  
  if (contextInjection.mode === ASSISTANT_INTENTS.FIND_LESSON) {
    if (items.length === 1) {
      const item = items[0];
      return `Mình tìm thấy tài liệu '${item.title || 'Untitled'}' trong thư viện. Loại tài liệu: ${item.resourceType || 'N/A'}. Category: ${item.category || 'N/A'}.`;
    }
    let msg = `Mình tìm thấy ${items.length} tài liệu trong thư viện:\n\n`;
    items.slice(0, 5).forEach((item, index) => {
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
  return 'Mình có thể hỗ trợ nội dung IELTS trên website như tìm test, lesson, study tips, navigation hoặc review đáp án sau khi nộp bài.';
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
    ruleIntent: data.ruleIntent || null,
    classifierUsed: Boolean(data.classifierUsed),
    classifierIntent: data.classifierIntent || null,
    classifierConfidence: data.classifierConfidence || 0,
    classifierError: data.classifierError || null,
    finalIntent: data.finalIntent || null,
    queryTable: data.queryTable || null,
    selectedColumns: data.selectedColumns || null,
    publishFilter: data.publishFilter || null,
    searchTerms: data.searchTerms || [],
    exactTitleMatch: Boolean(data.exactTitleMatch),
    fuzzyTitleMatch: Boolean(data.fuzzyTitleMatch),
    skillFilter: data.skillFilter || null,
    resourceTypeFilter: data.resourceTypeFilter || null,
    rowCount: data.rowCount || 0,
    resultTitles: data.resultTitles || [],
    fallbackUsed: Boolean(data.fallbackUsed),
    fallbackReason: data.fallbackReason || null,
    classifierProviderCalled: Boolean(data.classifierProviderCalled),
    answerProviderCalled: Boolean(data.answerProviderCalled),
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

const buildImmediateIntentResult = (intent) => {
  if (intent === ASSISTANT_INTENTS.OUT_OF_SCOPE) {
    return buildSuccessResult({ answer: buildOutOfScopeResponse(), intent });
  }
  if (intent === ASSISTANT_INTENTS.GREETING) {
    return buildSuccessResult({ answer: buildGreetingResponse(), intent });
  }
  if (intent === ASSISTANT_INTENTS.CLARIFICATION) {
    return buildSuccessResult({ answer: buildClarificationResponse(), intent });
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
      suggestedLinks: contextInjection.suggestedLinks || [],
      intent: contextInjection.mode,
    });
  }
  if (contextInjection.errorCode) return buildErrorResult(contextInjection.errorCode);
  if (isEmptyLookupContext(contextInjection)) {
    return buildSuccessResult({ answer: MISSING_DATA_MESSAGE, intent: contextInjection.mode });
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
      suggestedLinks: contextInjection.suggestedLinks || [],
      usedDatabase: true,
      needsMoreContext: false,
      fallbackUsed: true,
      finalResponseMode: 'deterministic_fallback'
    };
  }
  if (contextInjection.suggestedLinks?.length) {
    return {
      ...checked,
      suggestedLinks: contextInjection.suggestedLinks,
      finalResponseMode: 'ai'
    };
  }
  return { ...checked, finalResponseMode: 'ai' };
};

const generateCheckedAnswer = async ({ payload, contextInjection }) => {
  const prompt = buildPrompt({ message: payload.message, contextInjection });
  const rawAnswer = await aiService.generateAssistantAnswer({
    mode: contextInjection.mode,
    message: payload.message,
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt,
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
  });
  return normalizeAndSelfCheck({
    rawAnswer: rawAnswer || streamedText,
    contextInjection,
    allowPlainText: true,
  });
};

const buildAiResult = async ({ payload, contextInjection, useStream }) => {
  const response = useStream
    ? await generateCheckedStreamAnswer({ payload, contextInjection })
    : await generateCheckedAnswer({ payload, contextInjection });
  return {
    ...buildSuccessResult({
      answer: response.answer,
      suggestedLinks: response.suggestedLinks,
      intent: contextInjection.mode,
      fallbackUsed: response.fallbackUsed,
    }),
    finalResponseMode: response.finalResponseMode
  };
};

const tracePipeline = ({ payload, ruleIntent, classifierUsed, classifierResult, contextInjection, answerProviderCalled, fallbackUsed, finalResponseMode }) => {
  const classifierProviderCalled = Boolean(classifierUsed);
  emitAssistantDebug({
    message: payload.message,
    route: payload.context.route,
    pageType: payload.context.pageType,
    ruleIntent,
    classifierUsed,
    classifierIntent: classifierResult?.intent || null,
    classifierConfidence: classifierResult?.confidence || 0,
    classifierError: classifierResult?.error || null,
    finalIntent: classifierResult?.intent || ruleIntent,
    ...(contextInjection?.debug || {}),
    classifierProviderCalled,
    answerProviderCalled: Boolean(answerProviderCalled),
    totalAiCalls: (classifierProviderCalled ? 1 : 0) + (answerProviderCalled ? 1 : 0),
    fallbackUsed,
    finalResponseMode,
  });
};

const runAssistantPipeline = async ({ user, payload, useStream = false }) => {
  const originalIntent = detectIntent({ message: payload.message, context: payload.context });
  let intent = originalIntent;
  let classifierUsed = false;
  let classifierResult = null;

  if (intent === ASSISTANT_INTENTS.UNKNOWN) {
    const { classifyScope } = require('./assistant.scope-classifier');
    classifierResult = await classifyScope(payload.message);
    classifierUsed = true;
    intent = classifierResult.intent;
    
    if (classifierResult.error) {
      const intentResult = buildImmediateIntentResult(ASSISTANT_INTENTS.CLARIFICATION);
      tracePipeline({ payload, ruleIntent: originalIntent, classifierUsed, classifierResult, answerProviderCalled: false, finalResponseMode: 'classifier_error_clarification' });
      return intentResult;
    }
  }

  const intentResult = buildImmediateIntentResult(intent);
  if (intentResult) {
    tracePipeline({ payload, ruleIntent: originalIntent, classifierUsed, classifierResult, answerProviderCalled: false, finalResponseMode: 'immediate' });
    return intentResult;
  }

  const guardrailResult = buildGuardrailResult({ message: payload.message, context: payload.context });
  if (guardrailResult) {
    tracePipeline({ payload, ruleIntent: originalIntent, classifierUsed, classifierResult, answerProviderCalled: false, finalResponseMode: 'guardrail_blocked' });
    return { ...guardrailResult, intent };
  }

  const contextInjection = await buildContextInjection({
    intent,
    message: payload.message,
    context: payload.context,
    user,
    sessionId: null,
  });
  const contextResult = buildImmediateContextResult(contextInjection);
  if (contextResult) {
    tracePipeline({ payload, ruleIntent: originalIntent, classifierUsed, classifierResult, contextInjection, answerProviderCalled: false, finalResponseMode: 'safe_missing_data' });
    return contextResult;
  }

  const result = await buildAiResult({ payload, contextInjection, useStream });
  tracePipeline({
    payload,
    ruleIntent: originalIntent,
    classifierUsed,
    classifierResult,
    contextInjection,
    answerProviderCalled: true,
    fallbackUsed: result.fallbackUsed,
    finalResponseMode: result.finalResponseMode || 'ai'
  });
  return result;
};

const persistSuccessfulResult = async ({ user, payload, result }) => {
  if (result.code || !result.answer) return result;
  const sessionId = await safeCreateSession(user.id);
  await safeSaveUserMessage(sessionId, payload.message, user.id);
  const saved = await safeSaveAssistantMessage(sessionId, result.answer, user.id);
  return { ...result, conversationId: sessionId, messageId: saved?.id || null };
};

const handleChat = async ({ user, payload }) => {
  try {
    const result = await runAssistantPipeline({ user, payload });
    return persistSuccessfulResult({ user, payload, result });
  } catch (error) {
    if (error.code && ERROR_MESSAGES[error.code]) {
      return buildErrorResult(error.code, error.message);
    }
    throw createAssistantError(ERROR_CODES.INTERNAL_ERROR);
  }
};

const handleChatStream = async ({ user, payload, onEvent }) => {
  try {
    const result = await runAssistantPipeline({ user, payload, useStream: true });
    const savedResult = await persistSuccessfulResult({ user, payload, result });
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
