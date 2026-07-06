const logger = require('../utils/logger');

const ALLOWED_FEATURES = new Set([
  'writing_grading',
  'speaking_grading',
  'tutor_ai_reference',
  'chatbot',
  'explain_with_ai',
  'unknown',
]);

const toSafeInt = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
};

const normalizeAiUsageMetadata = (metadata = {}) => {
  const promptTokens = toSafeInt(metadata.promptTokenCount ?? metadata.prompt_tokens);
  const completionTokens = toSafeInt(metadata.candidatesTokenCount ?? metadata.completion_tokens);
  const thinkingTokens = toSafeInt(metadata.thoughtsTokenCount ?? metadata.thinking_tokens);
  const cachedTokens = toSafeInt(metadata.cachedContentTokenCount ?? metadata.cached_tokens);
  const explicitTotal = metadata.totalTokenCount ?? metadata.total_tokens;
  const totalTokens = explicitTotal === undefined || explicitTotal === null
    ? promptTokens + completionTokens + thinkingTokens + cachedTokens
    : toSafeInt(explicitTotal);

  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    thinking_tokens: thinkingTokens,
    cached_tokens: cachedTokens,
    total_tokens: totalTokens,
  };
};

const normalizeOpenAiUsageMetadata = (usage = {}) => ({
  promptTokenCount: usage.prompt_tokens,
  candidatesTokenCount: usage.completion_tokens,
  totalTokenCount: usage.total_tokens,
  cachedContentTokenCount: usage.prompt_tokens_details?.cached_tokens,
});

const sanitizeFeature = (feature) => (
  ALLOWED_FEATURES.has(feature) ? feature : 'unknown'
);

const truncate = (value, maxLength) => {
  if (!value) return null;
  return String(value).slice(0, maxLength);
};

const recordAiUsageLog = async (payload = {}) => {
  const usage = normalizeAiUsageMetadata(payload.usageMetadata);
  const feature = sanitizeFeature(payload.feature);
  const values = [
    payload.userId || payload.user_id || null,
    feature,
    payload.provider || 'gemini',
    payload.model || null,
    payload.responseId || payload.response_id || null,
    payload.entityType || payload.entity_type || null,
    payload.entityId || payload.entity_id || null,
    usage.prompt_tokens,
    usage.completion_tokens,
    usage.thinking_tokens,
    usage.cached_tokens,
    usage.total_tokens,
    payload.success !== false,
    truncate(payload.errorCode || payload.error_code, 120),
    truncate(payload.errorMessage || payload.error_message, 500),
    payload.latencyMs === null || payload.latencyMs === undefined ? null : toSafeInt(payload.latencyMs),
  ];

  try {
    const { pool } = require('../db/pool');
    await pool.query(
      `INSERT INTO ai_usage_logs (
        user_id, feature, provider, model, response_id, entity_type, entity_id,
        prompt_tokens, completion_tokens, thinking_tokens, cached_tokens, total_tokens,
        success, error_code, error_message, latency_ms
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15, $16
      )`,
      values
    );
  } catch (error) {
    logger.warn('AI usage logging skipped', {
      feature,
      provider: payload.provider || 'gemini',
      error: error.message,
    });
  }
};

module.exports = {
  normalizeAiUsageMetadata,
  normalizeOpenAiUsageMetadata,
  recordAiUsageLog,
};
