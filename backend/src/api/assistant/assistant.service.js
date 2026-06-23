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

const immediateResponseForContext = (contextInjection) => {
  if (contextInjection.errorCode) {
    return buildErrorResult(contextInjection.errorCode);
  }

  if (
    (contextInjection.mode === ASSISTANT_INTENTS.FIND_TEST ||
      contextInjection.mode === ASSISTANT_INTENTS.FIND_LESSON) &&
    contextInjection.databaseResults.length === 0
  ) {
    return buildSuccessResult({
      answer: MISSING_DATA_MESSAGE,
      suggestedLinks: [],
      intent: contextInjection.mode,
    });
  }

  if (contextInjection.mode === ASSISTANT_INTENTS.OUT_OF_SCOPE) {
    return buildErrorResult(ERROR_CODES.OUT_OF_SCOPE);
  }

  return null;
};

const buildFallbackAnswer = (contextInjection) => {
  if (contextInjection.mode === ASSISTANT_INTENTS.FIND_TEST || contextInjection.mode === ASSISTANT_INTENTS.FIND_LESSON) {
    return MISSING_DATA_MESSAGE;
  }

  if (contextInjection.mode === ASSISTANT_INTENTS.POST_TEST_REVIEW) {
    return ERROR_MESSAGES[ERROR_CODES.MISSING_EXPLANATION];
  }

  if (contextInjection.mode === ASSISTANT_INTENTS.GREETING) {
    return 'Chào bạn! Mình có thể hỗ trợ tìm test, lesson, study tips, navigation hoặc giải thích đáp án sau khi bạn nộp bài.';
  }

  return 'Mình có thể hỗ trợ nội dung IELTS trên website như tìm test, lesson, study tips, navigation hoặc review đáp án sau khi nộp bài.';
};

const finalizeAiResponse = ({ rawAnswer, contextInjection, allowPlainText = false }) => {
  const normalized = normalizeAssistantResponse({
    rawText: rawAnswer,
    mode: contextInjection.mode,
    fallbackAnswer: buildFallbackAnswer(contextInjection),
    fallbackLinks: contextInjection.suggestedLinks,
    allowPlainText,
  });

  return selfCheckResponse({
    response: normalized,
    contextInjection,
  });
};

const buildPipelineContext = async ({ user, payload, sessionId }) => {
  const intent = detectIntent({
    message: payload.message,
    context: payload.context,
  });

  const guardrail = evaluateGuardrails({
    message: payload.message,
    context: payload.context,
  });

  if (guardrail.blocked) {
    return {
      blockedResult: buildErrorResult(guardrail.code, guardrail.message),
      intent,
    };
  }

  if (payload.context.pageType === 'active-test') {
    return {
      blockedResult: buildErrorResult(ERROR_CODES.ASSISTANT_DISABLED_DURING_TEST),
      intent,
    };
  }

  const contextInjection = await buildContextInjection({
    intent,
    message: payload.message,
    context: payload.context,
    user,
    sessionId,
  });

  return {
    intent,
    contextInjection,
    blockedResult: immediateResponseForContext(contextInjection),
  };
};

const generateResponse = async ({ payload, contextInjection }) => {
  const prompt = buildPrompt({
    message: payload.message,
    contextInjection,
  });

  const rawAnswer = await aiService.generateAssistantAnswer({
    mode: contextInjection.mode,
    message: payload.message,
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt,
  });

  return finalizeAiResponse({ rawAnswer, contextInjection });
};

const handleChat = async ({ user, payload }) => {
  const sessionId = await safeCreateSession(user.id);
  await safeSaveUserMessage(sessionId, payload.message, user.id);

  try {
    const pipeline = await buildPipelineContext({ user, payload, sessionId });
    if (pipeline.blockedResult) {
      if (!pipeline.blockedResult.code && pipeline.blockedResult.answer) {
        const saved = await safeSaveAssistantMessage(sessionId, pipeline.blockedResult.answer, user.id);
        return {
          ...pipeline.blockedResult,
          conversationId: sessionId,
          messageId: saved?.id || null,
          intent: pipeline.intent,
        };
      }
      return pipeline.blockedResult;
    }

    const response = await generateResponse({
      payload,
      contextInjection: pipeline.contextInjection,
    });
    const saved = await safeSaveAssistantMessage(sessionId, response.answer, user.id);

    return buildSuccessResult({
      answer: response.answer,
      suggestedLinks: response.suggestedLinks,
      conversationId: sessionId,
      messageId: saved?.id || null,
      intent: pipeline.intent,
    });
  } catch (error) {
    if (error.code && ERROR_MESSAGES[error.code]) {
      return buildErrorResult(error.code, error.message);
    }

    throw createAssistantError(ERROR_CODES.INTERNAL_ERROR);
  }
};

const handleChatStream = async ({ user, payload, onEvent }) => {
  const sessionId = await safeCreateSession(user.id);
  await safeSaveUserMessage(sessionId, payload.message, user.id);

  const pipeline = await buildPipelineContext({ user, payload, sessionId });
  if (pipeline.blockedResult) {
    if (pipeline.blockedResult.code) {
      onEvent('assistant.error', pipeline.blockedResult);
      return pipeline.blockedResult;
    }

    const saved = await safeSaveAssistantMessage(sessionId, pipeline.blockedResult.answer, user.id);
    const result = {
      ...pipeline.blockedResult,
      conversationId: sessionId,
      messageId: saved?.id || null,
      intent: pipeline.intent,
    };
    onEvent('assistant.start', { conversationId: sessionId, intent: pipeline.intent });
    onEvent('assistant.delta', { delta: result.answer });
    onEvent('assistant.done', result);
    return result;
  }

  const prompt = buildPrompt({
    message: payload.message,
    contextInjection: pipeline.contextInjection,
  });

  onEvent('assistant.start', {
    conversationId: sessionId,
    intent: pipeline.intent,
  });

  let streamedText = '';
  const rawAnswer = await aiService.streamAssistantAnswer({
    mode: pipeline.contextInjection.mode,
    message: payload.message,
    systemPrompt: `${prompt.systemPrompt}\nFor this streaming response, return only the final answer text, not JSON.`,
    userPrompt: `${prompt.userPrompt}\n\nStreaming output rule: return only answer text. Do not wrap it in JSON.`,
    onDelta: (delta) => {
      streamedText += delta;
      onEvent('assistant.delta', { delta });
    },
  });

  const response = finalizeAiResponse({
    rawAnswer: rawAnswer || streamedText,
    contextInjection: pipeline.contextInjection,
    allowPlainText: true,
  });
  const saved = await safeSaveAssistantMessage(sessionId, response.answer, user.id);

  const result = buildSuccessResult({
    answer: response.answer,
    suggestedLinks: response.suggestedLinks,
    conversationId: sessionId,
    messageId: saved?.id || null,
    intent: pipeline.intent,
  });

  onEvent('assistant.done', result);
  return result;
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
  const result = await repository.rateAssistantMessage({
    userId,
    messageId,
    rating,
    reason,
  });

  if (!result.saved) {
    return {
      success: false,
      messageId,
      rating,
      code: result.reason === 'message_not_found_or_forbidden' ? ERROR_CODES.FORBIDDEN : ERROR_CODES.MISSING_CONTEXT,
      message:
        result.reason === 'rating_column_missing'
          ? 'Schema hiện tại chưa có cột rating cho chatbot_messages. Cần thêm migration nhỏ sau khi inspect Supabase schema.'
          : ERROR_MESSAGES[ERROR_CODES.MISSING_CONTEXT],
    };
  }

  return {
    success: true,
    messageId: result.messageId,
    rating,
    code: null,
  };
};

module.exports = {
  handleChat,
  handleChatStream,
  getHistory,
  rateMessage,
  buildErrorResult,
  buildSuccessResult,
};
