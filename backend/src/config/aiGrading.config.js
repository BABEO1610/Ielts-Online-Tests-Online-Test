const crypto = require('node:crypto');

const TRUE = new Set(['1', 'true', 'yes', 'on']);
const HEX_64 = /^[0-9a-f]{64}$/;

const bool = (value, fallback = false) => value === undefined
  ? fallback
  : TRUE.has(String(value).trim().toLowerCase());

const int = (value, fallback, name) => {
  const parsed = value === undefined ? fallback : Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
};

const parseKeyring = (value) => {
  if (!value) return {};
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('AUDIO_UPLOAD_TOKEN_KEYS_JSON must be valid JSON');
  }
  for (const [kid, encoded] of Object.entries(parsed)) {
    if (!kid || Buffer.from(encoded, 'base64').length !== 32) {
      throw new Error('Every audio upload token key must be 32-byte base64');
    }
  }
  return parsed;
};

const digestManifest = (manifest) => crypto
  .createHash('sha256')
  .update(JSON.stringify(manifest))
  .digest('hex');

const getTranscriptionBinding = (env, providerModel) => {
  if (env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      model: env.AI_TRANSCRIPTION_MODEL?.startsWith('whisper')
        ? env.AI_TRANSCRIPTION_MODEL : 'whisper-1',
    };
  }
  return {
    provider: 'gemini',
    model: env.AI_TRANSCRIPTION_MODEL?.startsWith('gemini')
      ? env.AI_TRANSCRIPTION_MODEL : providerModel,
  };
};

const buildSpeakingManifest = (env, pipelineVersion, providerName, providerModel) => ({
  pipeline_version: pipelineVersion,
  rubric_provider: providerName,
  rubric_model: providerModel,
  transcription_provider: getTranscriptionBinding(env, providerModel).provider,
  transcription_model: getTranscriptionBinding(env, providerModel).model,
  speech_evidence_provider: env.AI_SPEECH_EVIDENCE_PROVIDER || 'unconfigured',
  media_version: env.AI_MEDIA_NORMALIZER_VERSION || 'audio-v1',
  feature_schema_version: env.AI_SPEAKING_FEATURE_SCHEMA_VERSION || 'speaking-evidence-v1',
});

const readTtls = (env) => ({
  signedUploadTtlSeconds: int(env.AUDIO_SIGNED_UPLOAD_TTL_SECONDS, 300, 'AUDIO_SIGNED_UPLOAD_TTL_SECONDS'),
  signedDownloadTtlSeconds: int(env.AUDIO_SIGNED_DOWNLOAD_TTL_SECONDS, 300, 'AUDIO_SIGNED_DOWNLOAD_TTL_SECONDS'),
  uploadTokenTtlSeconds: int(env.AUDIO_UPLOAD_TOKEN_TTL_SECONDS, 300, 'AUDIO_UPLOAD_TOKEN_TTL_SECONDS'),
  quarantineMinAgeSeconds: int(env.AUDIO_QUARANTINE_MIN_AGE_SECONDS, 86400, 'AUDIO_QUARANTINE_MIN_AGE_SECONDS'),
});

const validateConfig = (input) => {
  if (!HEX_64.test(input.scoringConfigSha256)) throw new Error('AI_SCORING_CONFIG_SHA256 must be lowercase SHA-256');
  if (!HEX_64.test(input.writingScoringConfigSha256)) throw new Error('AI_WRITING_SCORING_CONFIG_SHA256 must be lowercase SHA-256');
  if (input.calibrationBundleSha256 && !HEX_64.test(input.calibrationBundleSha256)) {
    throw new Error('AI_CALIBRATION_BUNDLE_SHA256 must be lowercase SHA-256');
  }
  if (input.enabled && (!input.activeKid || !input.keyring[input.activeKid])) throw new Error('An active audio upload token key is required');
  if (input.enabled && input.providerName !== 'gemini') throw new Error('Current grading adapter only supports the pinned Gemini provider');
  // if (input.enabled && input.production && input.storageProvider !== 's3') throw new Error('Production async Speaking storage must use S3');
  if (input.enabled && input.production && /latest/i.test(input.providerModel)) throw new Error('Production AI model aliases must be pinned');
  if (input.ttls.quarantineMinAgeSeconds <= Math.max(input.ttls.signedUploadTtlSeconds, input.ttls.uploadTokenTtlSeconds) + 300) {
    throw new Error('AUDIO_QUARANTINE_MIN_AGE_SECONDS must exceed upload/token TTL plus clock skew');
  }
};

const buildStorageConfig = (env, storageProvider, ttls) => Object.freeze({
  provider: storageProvider,
  bucket: env.SPEAKING_AUDIO_BUCKET || env.SUPABASE_SPEAKING_BUCKET || 'speaking-audio',
  region: env.AWS_REGION || null,
  endpoint: env.S3_ENDPOINT || null,
  signedUploadTtlSeconds: ttls.signedUploadTtlSeconds,
  signedDownloadTtlSeconds: ttls.signedDownloadTtlSeconds,
  quarantineMinAgeSeconds: ttls.quarantineMinAgeSeconds,
  cleanupBatchSize: int(env.AUDIO_CLEANUP_BATCH_SIZE, 100, 'AUDIO_CLEANUP_BATCH_SIZE'),
  cleanupIntervalSeconds: int(env.AUDIO_CLEANUP_INTERVAL_SECONDS, 3600, 'AUDIO_CLEANUP_INTERVAL_SECONDS'),
});

const freezeConfig = (env, value) => Object.freeze({
  enabled: value.enabled,
  publishSpeakingBands: bool(env.AI_SPEAKING_PUBLISH_BANDS) && Boolean(value.calibrationBundleSha256),
  estimatedSpeakingBands: bool(env.AI_SPEAKING_ESTIMATED_BANDS_ENABLED),
  speakingEstimateVersion: env.AI_SPEAKING_ESTIMATION_VERSION || 'ai-estimated-v1',
  pipelineVersion: value.pipelineVersion,
  scoringConfigSha256: value.scoringConfigSha256,
  writingPipelineVersion: value.writingPipelineVersion,
  writingScoringConfigSha256: value.writingScoringConfigSha256,
  calibrationBundleSha256: value.calibrationBundleSha256,
  calibrationBundlePath: env.AI_CALIBRATION_BUNDLE_PATH || null,
  calibrationPublicKey: env.AI_CALIBRATION_PUBLIC_KEY || null,
  calibrationSignature: env.AI_CALIBRATION_SIGNATURE || null,
  idempotencyTtlSeconds: int(env.AI_IDEMPOTENCY_TTL_SECONDS, 86400, 'AI_IDEMPOTENCY_TTL_SECONDS'),
  dailyQuota: int(env.AI_DAILY_GRADING_QUOTA, 10, 'AI_DAILY_GRADING_QUOTA'),
  workerLeaseSeconds: int(env.AI_WORKER_LEASE_SECONDS, 120, 'AI_WORKER_LEASE_SECONDS'),
  workerPollMs: int(env.AI_WORKER_POLL_MS, 1000, 'AI_WORKER_POLL_MS'),
  retryBaseSeconds: int(env.AI_RETRY_BASE_SECONDS, 15, 'AI_RETRY_BASE_SECONDS'),
  storage: buildStorageConfig(env, value.storageProvider, value.ttls),
  provider: Object.freeze({ name: value.providerName, model: value.providerModel, manifest: value.manifest }),
  uploadToken: Object.freeze({
    activeKid: value.activeKid,
    keyring: Object.freeze(value.keyring),
    ttlSeconds: value.ttls.uploadTokenTtlSeconds,
  }),
});

const loadAiGradingConfig = (env = process.env) => {
  const enabled = bool(env.AI_SPEAKING_ASYNC_ENABLED);
  const production = env.NODE_ENV === 'production';
  const providerName = env.AI_GRADING_PROVIDER || 'gemini';
  const providerModel = env.AI_GRADING_MODEL || 'gemini-3.6-flash';
  const storageProvider = env.OBJECT_STORAGE_PROVIDER || (production ? 's3' : 'supabase');
  const pipelineVersion = env.AI_SPEAKING_PIPELINE_VERSION || 'speaking-v1';
  const writingPipelineVersion = env.AI_WRITING_PIPELINE_VERSION || 'writing-v1';
  const manifest = buildSpeakingManifest(env, pipelineVersion, providerName, providerModel);
  const scoringConfigSha256 = env.AI_SCORING_CONFIG_SHA256 || digestManifest(manifest);
  const writingScoringConfigSha256 = env.AI_WRITING_SCORING_CONFIG_SHA256 || digestManifest({
    pipeline_version: writingPipelineVersion,
    provider: providerName,
    model: providerModel,
    prompt_family: 'ielts-writing-v1',
  });
  const calibrationBundleSha256 = env.AI_CALIBRATION_BUNDLE_SHA256 || null;
  const keyring = parseKeyring(env.AUDIO_UPLOAD_TOKEN_KEYS_JSON);
  const activeKid = env.AUDIO_UPLOAD_TOKEN_ACTIVE_KID || null;
  const ttls = readTtls(env);
  validateConfig({
    enabled, production, storageProvider, providerName, providerModel, scoringConfigSha256,
    writingScoringConfigSha256, calibrationBundleSha256, activeKid, keyring, ttls,
  });

  return freezeConfig(env, {
    enabled, providerName, providerModel, storageProvider, pipelineVersion,
    writingPipelineVersion, manifest, scoringConfigSha256, writingScoringConfigSha256,
    calibrationBundleSha256, keyring, activeKid, ttls,
  });
};

const aiGradingConfig = loadAiGradingConfig();

module.exports = { aiGradingConfig, loadAiGradingConfig };
