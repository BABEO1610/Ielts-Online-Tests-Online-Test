const crypto = require('node:crypto');
const AppError = require('../utils/AppError');
const artifactQueries = require('../db/queries/speakingAnalysis.queries');
const { AudioNormalizerService } = require('../media/audioNormalizer.service');
const { ExistingProviderTranscriberAdapter } = require('../ai/transcriber.adapter');
const { createSpeechEvidenceAdapter } = require('../ai/speechEvidence.adapter');
const { aiGradingConfig } = require('../config/aiGrading.config');

const digest = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const jsonBytes = (value) => value === null || value === undefined ? 0 : Buffer.byteLength(JSON.stringify(value));
const usageContext = (job, submission, entityType) => ({
  userId: job.user_id,
  feature: 'speaking_grading',
  entityType,
  entityId: submission.id,
});

const assertEvidenceSize = (evidence) => {
  const limits = {
    providerManifest: 32768,
    componentStatus: 32768,
    words: 1048576,
    segments: 524288,
    audioQuality: 131072,
    fluencyMetrics: 262144,
    pronunciationEvidence: 2097152,
  };
  for (const [key, limit] of Object.entries(limits)) {
    if (jsonBytes(evidence[key]) > limit) throw new AppError(`Evidence ${key} vượt giới hạn.`, 422, 'SPEAKING_EVIDENCE_TOO_LARGE');
  }
};

class SpeakingEvidenceService {
  constructor({ pool, storage, normalizer, transcriber, speechEvidence, config = aiGradingConfig } = {}) {
    this.pool = pool || require('../db/pool').pool;
    this.storage = storage;
    this.normalizer = normalizer || new AudioNormalizerService();
    this.transcriber = transcriber || new ExistingProviderTranscriberAdapter();
    this.speechEvidence = speechEvidence
      || createSpeechEvidenceAdapter(config.provider?.manifest?.speech_evidence_provider);
  }

  async assertLeaseAndSaveDigest({ submission, job, workerId, generation, audioSha256 }) {
    const result = await this.pool.query(
      `UPDATE speaking_submissions AS submission
       SET audio_sha256 = $5
       WHERE submission.id = $1 AND submission.audio_storage_key = $2
         AND EXISTS (
           SELECT 1 FROM ai_grading_jobs job
           WHERE job.id = $3 AND job.status = 'running' AND job.lease_owner = $4
             AND job.lease_generation = $6 AND job.lease_expires_at >= NOW()
             AND job.group_id = submission.speaking_group_id
             AND job.user_id = submission.user_id
         )
       RETURNING submission.id`,
      [submission.id, submission.audio_storage_key, job.id, workerId, audioSha256, generation]);
    if (!result.rows[0]) throw new AppError('Worker lease không còn hợp lệ.', 409, 'STALE_WORKER_LEASE');
  }

  async loadVerifiedSource({ submission, job, workerId, generation }) {
    if (!this.storage) throw new AppError('Object storage chưa được cấu hình.', 503, 'STORAGE_NOT_CONFIGURED');
    const object = await this.storage.statObject({ key: submission.audio_storage_key });
    if (!object) throw new AppError('Không tìm thấy audio đã bind.', 422, 'AUDIO_OBJECT_MISSING');
    if (Number(object.size) !== Number(submission.audio_size_bytes)) {
      throw new AppError('Kích thước audio đã thay đổi sau khi bind.', 422, 'AUDIO_OBJECT_CHANGED');
    }
    const sourceBuffer = await this.storage.downloadObject({ key: submission.audio_storage_key });
    const audioSha256 = digest(sourceBuffer);
    if (audioSha256 !== submission.declared_audio_sha256) {
      throw new AppError('Checksum audio không khớp khai báo.', 422, 'AUDIO_SHA256_MISMATCH');
    }
    await this.assertLeaseAndSaveDigest({ submission, job, workerId, generation, audioSha256 });
    return { sourceBuffer, audioSha256 };
  }

  async normalizeAudio(sourceBuffer, submission) {
    const normalized = await this.normalizer.normalize(sourceBuffer);
    const declaredDuration = Number(submission.declared_duration_ms);
    const durationTolerance = Math.max(3000, declaredDuration * 0.1);
    if (Number.isFinite(declaredDuration)
      && Math.abs(normalized.durationMs - declaredDuration) > durationTolerance) {
      throw new AppError('Thời lượng audio thực tế không khớp metadata upload.', 422, 'AUDIO_DURATION_MISMATCH');
    }
    return normalized;
  }

  async getProcessingArtifact(cacheKey, job, normalized) {
    let artifact = await artifactQueries.insertProcessingArtifact(this.pool, {
      ...cacheKey,
      sourceJobId: job.id,
      pipelineVersion: job.pipeline_version,
      providerManifest: { media: normalized.providerManifest },
      componentStatus: { media: { status: 'complete' } },
    });
    if (!artifact) artifact = await artifactQueries.getArtifactByConfig(this.pool, cacheKey);
    if (!artifact) throw new AppError('Không thể tạo evidence artifact.', 409, 'ARTIFACT_CONFLICT');
    if (artifact.status === 'failed') throw new AppError('Evidence artifact đã thất bại.', 422, 'ARTIFACT_TERMINAL_FAILED');
    return artifact;
  }

  async collectEvidence(normalized, job, submission) {
    const transcription = await this.transcriber.transcribe({
      audioBuffer: normalized.buffer,
      contentType: normalized.contentType,
      languageCode: 'en',
      usageContext: usageContext(job, submission, 'speaking_submission'),
    });
    if (!transcription.asrTranscript) throw new AppError('Provider trả transcript rỗng.', 502, 'TRANSCRIPT_EMPTY');
    const speech = await this.speechEvidence.analyze({
      audioBuffer: normalized.buffer,
      contentType: normalized.contentType,
      asrTranscript: transcription.asrTranscript,
      languageCode: 'en',
      usageContext: usageContext(job, submission, 'speaking_submission_audio_evidence'),
    });
    const fullSpeech = speech.status === 'sufficient';
    const evidence = {
      providerManifest: {
        media: normalized.providerManifest,
        transcription: transcription.providerManifest,
        speech_evidence: speech.providerManifest,
      },
      componentStatus: {
        media: { status: 'complete' },
        transcription: { status: 'complete', uncertainty: transcription.uncertainty ? 'reported' : 'unavailable' },
        ...speech.componentStatus,
      },
      words: transcription.words,
      segments: transcription.segments,
      audioQuality: normalized.quality,
      fluencyMetrics: speech.fluencyMetrics,
      pronunciationEvidence: speech.pronunciationEvidence,
    };
    assertEvidenceSize(evidence);
    return { evidence, fullSpeech, transcription };
  }

  async finalizeEvidence({ artifact, job, workerId, generation, collected }) {
    const { evidence, fullSpeech, transcription } = collected;
    const finalized = await artifactQueries.finalizeArtifact(this.pool, {
      artifactId: artifact.id,
      jobId: job.id,
      workerId,
      generation,
      status: fullSpeech ? 'complete' : 'partial',
      languageCode: 'en',
      asrTranscript: transcription.asrTranscript,
      displayTranscript: transcription.displayTranscript || transcription.asrTranscript,
      asrUncertainty: transcription.uncertainty,
      ...evidence,
    });
    if (!finalized) throw new AppError('Worker lease đã hết trước khi lưu evidence.', 409, 'STALE_WORKER_LEASE');
    return finalized;
  }

  async processPart({ submission, job, workerId, generation }) {
    const source = await this.loadVerifiedSource({ submission, job, workerId, generation });
    const cacheKey = {
      submissionId: submission.id,
      sourceJobId: job.id,
      audioSha256: source.audioSha256,
      scoringConfigSha256: job.scoring_config_sha256,
    };
    const reusable = await artifactQueries.getReusableArtifact(this.pool, cacheKey);
    if (reusable) return reusable;
    const normalized = await this.normalizeAudio(source.sourceBuffer, submission);
    const artifact = await this.getProcessingArtifact(cacheKey, job, normalized);
    if (['complete', 'partial'].includes(artifact.status)) return artifact;
    const collected = await this.collectEvidence(normalized, job, submission);
    return this.finalizeEvidence({ artifact, job, workerId, generation, collected });
  }
}

module.exports = { SpeakingEvidenceService, assertEvidenceSize };
