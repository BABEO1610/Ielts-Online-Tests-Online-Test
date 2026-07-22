const logger = require('../utils/logger');

const ALLOWED_FEATURES = new Set([
  'writing_grading',
  'speaking_grading',
  'tutor_ai_reference',
  'chatbot',
  'explain_with_ai',
  'unknown',
]);
const ALLOWED_STAGES = new Set(['queued', 'validating_audio', 'analyzing', 'scoring', 'calibrating', 'finalizing']);
const ALLOWED_OUTCOMES = new Set(['claimed', 'completed', 'needs_review', 'failed', 'retry_wait', 'stale']);

const toSafeInt = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
};

const normalizeAiUsageMetadata = (metadata) => {
  const meta = metadata || {};
  const promptTokens = toSafeInt(meta.promptTokenCount ?? meta.prompt_tokens);
  const completionTokens = toSafeInt(meta.candidatesTokenCount ?? meta.completion_tokens);
  const thinkingTokens = toSafeInt(meta.thoughtsTokenCount ?? meta.thinking_tokens);
  const cachedTokens = toSafeInt(meta.cachedContentTokenCount ?? meta.cached_tokens);
  const explicitTotal = meta.totalTokenCount ?? meta.total_tokens;
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

const normalizeOpenAiUsageMetadata = (usage) => {
  const u = usage || {};
  return {
    promptTokenCount: u.prompt_tokens,
    candidatesTokenCount: u.completion_tokens,
    totalTokenCount: u.total_tokens,
    cachedContentTokenCount: u.prompt_tokens_details?.cached_tokens,
  };
};

const sanitizeFeature = (feature) => (
  ALLOWED_FEATURES.has(feature) ? feature : 'unknown'
);

const truncate = (value, maxLength) => {
  if (!value) return null;
  return String(value).slice(0, maxLength);
};

const sanitizeDiagnostic = (value, maxLength = 500) => {
  if (!value) return null;
  return String(value)
    .replace(/https?:\/\/\S+/gi, '[redacted-url]')
    .replace(/quarantine\/speaking\/\S+/gi, '[redacted-object]')
    .replace(/(transcript|audio|signed[_ -]?url)\s*[:=]\s*[^,;\n]+/gi, '$1=[redacted]')
    .replace(/(prompt|response[_ -]?text|student[_ -]?answer|writing[_ -]?response)\s*[:=]\s*[^,;\n]+/gi, '$1=[redacted]')
    .replace(/\b[A-Za-z0-9_-]{100,}\b/g, '[redacted-token]')
    .replace(/[\r\n\t]+/g, ' ')
    .slice(0, maxLength);
};

const recordAiStageMetric = (payload = {}) => {
  const metric = {
    jobId: payload.jobId || null,
    stage: ALLOWED_STAGES.has(payload.stage) ? payload.stage : 'queued',
    provider: truncate(payload.provider || 'unknown', 40),
    model: truncate(payload.model, 80),
    outcome: ALLOWED_OUTCOMES.has(payload.outcome) ? payload.outcome : 'failed',
    attempt: toSafeInt(payload.attempt),
    durationMs: toSafeInt(payload.durationMs),
    errorCode: truncate(payload.errorCode, 80),
  };
  logger.info('AI grading stage metric', metric);
  return metric;
};

const buildAiUsageValues = (payload, usage, feature) => [
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
  sanitizeDiagnostic(payload.errorMessage || payload.error_message, 500),
  payload.latencyMs === null || payload.latencyMs === undefined ? null : toSafeInt(payload.latencyMs),
];

const insertAiUsageLog = async (values) => {
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
};

const recordAiUsageLog = async (payload = {}) => {
  const usage = normalizeAiUsageMetadata(payload.usageMetadata);
  const feature = sanitizeFeature(payload.feature);

  try {
    await insertAiUsageLog(buildAiUsageValues(payload, usage, feature));
  } catch (error) {
    logger.warn('AI usage logging skipped', {
      feature,
      provider: payload.provider || 'gemini',
      error: sanitizeDiagnostic(error.message, 200),
    });
  }
};

module.exports = {
  normalizeAiUsageMetadata,
  normalizeOpenAiUsageMetadata,
  recordAiUsageLog,
  recordAiStageMetric,
  sanitizeDiagnostic,
};
