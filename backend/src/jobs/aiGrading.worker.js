const crypto = require('node:crypto');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const { aiGradingConfig } = require('../config/aiGrading.config');
const { createObjectStorageAdapter } = require('../storage/objectStorage.adapter');
const { loadCalibrationBundle, calibrationGate } = require('../ai/calibration/calibration.loader');
const { GeminiSpeakingRubricScorer } = require('../ai/speakingRubricScorer.adapter');
const jobQueries = require('../db/queries/aiGradingJobs.queries');
const { SpeakingEvidenceService } = require('../services/speakingEvidence.service');
const { SpeakingGradingService } = require('../services/speakingGrading.service');
const { recordAiStageMetric, sanitizeDiagnostic } = require('../services/aiUsage.service');

const NON_RETRYABLE_CONFIG_CODES = new Set([
  'AI_NOT_CONFIGURED',
  'TRANSCRIBER_UNAVAILABLE',
  'MEDIA_TOOL_UNAVAILABLE',
  'CALIBRATION_BUNDLE_MISSING',
  'CALIBRATION_SIGNATURE_REQUIRED',
  'CALIBRATION_SIGNATURE_INVALID',
  'CALIBRATION_DIGEST_MISMATCH',
  'CALIBRATION_SCHEMA_INVALID',
  'CALIBRATION_BINDING_MISMATCH',
  'SPEAKING_EVIDENCE_INVALID',
  'SPEAKING_FULL_AUDIO_REQUIRED',
  'SPEAKING_BAND_RELEASE_GATED',
]);
const NON_RETRYABLE_CODES = new Set([
  'AUDIO_SHA256_MISMATCH',
  'AUDIO_OBJECT_CHANGED',
  'AUDIO_OBJECT_MISSING',
  'AUDIO_FORMAT_INVALID',
  'AUDIO_DURATION_EXCEEDED',
  'AUDIO_DURATION_MISMATCH',
  'AUDIO_SILENT',
  'AUDIO_SIZE_INVALID',
  'ARTIFACT_TERMINAL_FAILED',
  'SPEAKING_EVIDENCE_TOO_LARGE',
  'SPEAKING_AUDIO_EVIDENCE_INSUFFICIENT',
  'SPEAKING_SCORER_UNAVAILABLE',
]);

const errorCode = (error) => error.errorCode || error.code || 'SPEAKING_WORKER_FAILED';
const isRetryable = (error) => {
  const code = errorCode(error);
  if (NON_RETRYABLE_CONFIG_CODES.has(code) || NON_RETRYABLE_CODES.has(code)
    || error.retryable === false) return false;
  if (error.retryable === true) return true;
  return [429, 502, 503, 504].includes(Number(error.statusCode));
};

class AiGradingWorker {
  constructor({
    pool,
    config = aiGradingConfig,
    storage,
    evidenceService,
    gradingService,
    scorer = null,
    workerId = `speaking-${process.pid}-${crypto.randomUUID()}`,
    now = () => Date.now(),
    random = Math.random,
  } = {}) {
    this.pool = pool || require('../db/pool').pool;
    this.config = config;
    this.storage = storage || createObjectStorageAdapter(config.storage);
    this.evidence = evidenceService || new SpeakingEvidenceService({
      pool: this.pool,
      storage: this.storage,
      config,
    });
    this.grading = gradingService || new SpeakingGradingService({
      pool: this.pool,
      allowBandPublication: config.publishSpeakingBands || config.estimatedSpeakingBands,
    });
    this.scorer = scorer || (config.estimatedSpeakingBands
      ? new GeminiSpeakingRubricScorer()
      : null);
    this.workerId = workerId;
    this.now = now;
    this.random = random;
  }

  async heartbeat(job, stage) {
    const active = await jobQueries.heartbeatJob(this.pool, {
      jobId: job.id,
      workerId: this.workerId,
      generation: job.lease_generation,
      leaseSeconds: this.config.workerLeaseSeconds,
      stage,
    });
    if (!active) throw new AppError('Worker lease không còn hợp lệ.', 409, 'STALE_WORKER_LEASE');
  }

  async withLeaseHeartbeat(job, stage, operation) {
    await this.heartbeat(job, stage);
    let heartbeatError = null;
    let heartbeatInFlight = null;
    const intervalMs = Math.max(1000, Math.floor(this.config.workerLeaseSeconds * 1000 / 3));
    const timer = setInterval(() => {
      if (heartbeatInFlight) return;
      heartbeatInFlight = this.heartbeat(job, stage)
        .catch((error) => { heartbeatError = error; })
        .finally(() => { heartbeatInFlight = null; });
    }, intervalMs);
    timer.unref?.();
    let value;
    let operationError = null;
    try {
      value = await operation();
    } catch (error) {
      operationError = error;
    } finally {
      clearInterval(timer);
      if (heartbeatInFlight) await heartbeatInFlight;
    }
    if (heartbeatError) throw heartbeatError;
    if (operationError) throw operationError;
    return value;
  }

  async getParts(job) {
    const result = await this.pool.query(
      `SELECT * FROM speaking_submissions
       WHERE speaking_group_id = $1 AND user_id = $2 AND deleted_at IS NULL
       ORDER BY part_number`, [job.group_id, job.user_id]);
    if (result.rows.length !== 3 || result.rows.some((part, index) => part.part_number !== index + 1 || !part.audio_storage_key)) {
      throw new AppError('Speaking job không có đúng ba audio Part.', 422, 'SPEAKING_GROUP_INCOMPLETE');
    }
    return result.rows;
  }

  async loadGate(job) {
    if (!job.calibration_bundle_sha256) {
      return {
        bundle: null,
        gate: {
          allowed: this.config.estimatedSpeakingBands === true,
          reason: this.config.estimatedSpeakingBands
            ? 'AI_ESTIMATED_BANDS_ENABLED'
            : 'AI_ESTIMATED_BANDS_DISABLED',
        },
      };
    }
    const bundle = await loadCalibrationBundle({
      bundlePath: this.config.calibrationBundlePath,
      expectedSha256: job.calibration_bundle_sha256,
      expectedScoringConfigSha256: job.scoring_config_sha256,
      publicKey: this.config.calibrationPublicKey,
      signature: this.config.calibrationSignature,
    });
    return { bundle, gate: calibrationGate({
      publishEnabled: this.config.publishSpeakingBands,
      bundle,
      scoringConfigSha256: job.scoring_config_sha256,
    }) };
  }

  async analyzeParts(job, parts) {
    const artifacts = [];
    for (const part of parts) {
      const artifact = await this.withLeaseHeartbeat(job, 'analyzing', () => this.evidence.processPart({
        submission: part,
        job,
        workerId: this.workerId,
        generation: job.lease_generation,
      }));
      artifacts.push({ ...artifact, part_number: part.part_number, prompt_text: part.prompt_text });
    }
    return artifacts;
  }

  async tryFullAudio(job, parts, artifacts, bundle, gate) {
    if (!gate.allowed || !artifacts.every((artifact) => artifact.status === 'complete') || !this.scorer) return null;
    const candidate = await this.withLeaseHeartbeat(job, 'scoring', () => this.scorer.score({
      artifacts, parts, calibrationBundle: bundle, job,
    }));
    await this.heartbeat(job, 'finalizing');
    return this.grading.finalizeCompleted({
      job, workerId: this.workerId, generation: job.lease_generation,
      result: {
        ...candidate.result,
        calibration_version: bundle?.version
          || this.config.speakingEstimateVersion
          || 'ai-estimated-v1',
      },
      provider: {
        ...candidate.provider,
        modelName: this.config.provider?.model,
      },
    });
  }

  async processJob(job) {
    const parts = await this.getParts(job);
    const artifacts = await this.analyzeParts(job, parts);
    await this.heartbeat(job, 'scoring');
    const { bundle, gate } = await this.loadGate(job);
    if (!artifacts.every((artifact) => artifact.status === 'complete')) {
      throw new AppError(
        'Audio không đủ bằng chứng để chấm đầy đủ bốn tiêu chí.',
        422,
        'SPEAKING_AUDIO_EVIDENCE_INSUFFICIENT'
      );
    }
    if (!gate.allowed) {
      throw new AppError(
        'Chấm điểm Speaking ước tính chưa được bật.',
        503,
        'SPEAKING_BAND_RELEASE_GATED'
      );
    }
    if (!this.scorer) {
      throw new AppError('Speaking scorer chưa được cấu hình.', 503, 'SPEAKING_SCORER_UNAVAILABLE');
    }
    const fullAudio = await this.tryFullAudio(job, parts, artifacts, bundle, gate);
    return fullAudio;
  }

  async handleFailure(job, error) {
    const code = errorCode(error);
    if (code === 'STALE_WORKER_LEASE') return { status: 'stale' };
    const retryable = isRetryable(error);
    if (retryable && job.attempt_count < job.max_attempts) {
      const base = this.config.retryBaseSeconds * (2 ** Math.max(0, job.attempt_count - 1));
      const jitter = Math.floor(base * 0.25 * this.random());
      const scheduled = await jobQueries.scheduleRetry(this.pool, {
        jobId: job.id,
        workerId: this.workerId,
        generation: job.lease_generation,
        runAfter: new Date(this.now() + (base + jitter) * 1000).toISOString(),
        errorCode: code,
        errorMessage: sanitizeDiagnostic(error.message, 500),
      });
      if (!scheduled) return { status: 'stale' };
      return { status: 'retry_wait' };
    }
    await this.grading.finalizeFailed({
      job, workerId: this.workerId, generation: job.lease_generation,
      provider: {
        errorCode: code,
        errorMessage: sanitizeDiagnostic(error.message, 500),
        retryable,
      },
    });
    return { status: 'failed' };
  }

  async runOnce() {
    if (!this.config.enabled) return { status: 'disabled' };
    const job = await jobQueries.claimNextJob(this.pool, {
      workerId: this.workerId,
      leaseSeconds: this.config.workerLeaseSeconds,
      submissionType: 'speaking',
    });
    if (!job) return { status: 'idle' };
    const startedAt = this.now();
    logger.info('Claimed AI grading job', { jobId: job.id, stage: job.stage, attempt: job.attempt_count });
    this.recordMetric(job, { outcome: 'claimed' });
    try {
      const finalized = await this.processJob(job);
      this.recordMetric(job, {
        stage: 'finalizing',
        outcome: ['completed', 'needs_review'].includes(finalized?.status) ? finalized.status : 'completed',
        durationMs: this.now() - startedAt,
      });
      return { status: 'terminal', jobId: job.id };
    } catch (error) {
      logger.warn('AI grading job processing failed', { jobId: job.id, stage: job.stage, errorCode: errorCode(error) });
      const handled = await this.handleFailure(job, error);
      this.recordMetric(job, {
        outcome: handled.status,
        durationMs: this.now() - startedAt,
        errorCode: errorCode(error),
      });
      return handled;
    }
  }

  recordMetric(job, details) {
    recordAiStageMetric({
      jobId: job.id,
      stage: details.stage || job.stage,
      provider: this.config.provider?.name,
      model: this.config.provider?.model,
      attempt: job.attempt_count,
      ...details,
    });
  }
}

module.exports = { AiGradingWorker, errorCode, isRetryable };
