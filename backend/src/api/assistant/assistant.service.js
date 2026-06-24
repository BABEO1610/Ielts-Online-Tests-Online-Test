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
}) => ({
  answer,
  suggestedLinks,
  conversationId,
  messageId,
  intent,
  code: null,
});

const isLookupIntent = (intent) =>
  intent === ASSISTANT_INTENTS.FIND_TEST || intent === ASSISTANT_INTENTS.FIND_LESSON;

const isEmptyLookupContext = (contextInjection) =>
  isLookupIntent(contextInjection.mode) && contextInjection.databaseResults.length === 0;

const getResultTitle = (item) => item.title || item.name || item.label || 'nội dung IELTS';

const summarizeLookupResults = (items) => {
  const names = items.slice(0, 3).map(getResultTitle).join(', ');
  return items.length > 3 ? `${names}...` : names;
};

const buildLookupFallbackAnswer = (contextInjection) => {
  const items = contextInjection.databaseResults || [];
  if (items.length === 0) return MISSING_DATA_MESSAGE;

  const summary = summarizeLookupResults(items);
  if (contextInjection.mode === ASSISTANT_INTENTS.FIND_TEST) {
    return `Mình tìm thấy ${items.length} đề phù hợp trong hệ thống: ${summary}. Bạn có thể mở các link gợi ý bên dưới.`;
  }
  return `Mình tìm thấy ${items.length} tài liệu phù hợp trong thư viện: ${summary}. Bạn có thể mở các link gợi ý bên dưới.`;
};

const getFallbackAnswer = (contextInjection) => {
  if (isLookupIntent(contextInjection.mode)) return buildLookupFallbackAnswer(contextInjection);
  if (contextInjection.mode === ASSISTANT_INTENTS.POST_TEST_REVIEW) {
    return ERROR_MESSAGES[ERROR_CODES.MISSING_EXPLANATION];
  }
  return 'Mình có thể hỗ trợ nội dung IELTS trên website như tìm test, lesson, study tips, navigation hoặc review đáp án sau khi nộp bài.';
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

const buildImmediateIntentResult = (intent) => {
  if (intent === ASSISTANT_INTENTS.OUT_OF_SCOPE) {
    return buildSuccessResult({ answer: ERROR_MESSAGES[ERROR_CODES.OUT_OF_SCOPE], intent });
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
  return selfCheckResponse({ response: normalized, contextInjection });
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
  return buildSuccessResult({
    answer: response.answer,
    suggestedLinks: response.suggestedLinks,
    intent: contextInjection.mode,
  });
};

const runAssistantPipeline = async ({ user, payload, useStream = false }) => {
  const intent = detectIntent({ message: payload.message, context: payload.context });
  const intentResult = buildImmediateIntentResult(intent);
  if (intentResult) return intentResult;

  const guardrailResult = buildGuardrailResult({ message: payload.message, context: payload.context });
  if (guardrailResult) return { ...guardrailResult, intent };

  const contextInjection = await buildContextInjection({
    intent,
    message: payload.message,
    context: payload.context,
    user,
    sessionId: null,
  });
  const contextResult = buildImmediateContextResult(contextInjection);
  if (contextResult) return contextResult;

  return buildAiResult({ payload, contextInjection, useStream });
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
