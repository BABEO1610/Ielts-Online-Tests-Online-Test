const crypto = require('node:crypto');
const AppError = require('../utils/AppError');
const { aiGradingConfig } = require('../config/aiGrading.config');
const { createObjectStorageAdapter } = require('../storage/objectStorage.adapter');
const { AudioNormalizerService } = require('../media/audioNormalizer.service');
const { ExistingProviderTranscriberAdapter } = require('../ai/transcriber.adapter');
const { createSpeechEvidenceAdapter } = require('../ai/speechEvidence.adapter');
const { GeminiSpeakingRubricScorer } = require('../ai/speakingRubricScorer.adapter');

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

class SpeakingTutorPrelimService {
  constructor({ pool, config = aiGradingConfig, storage, normalizer, transcriber, speechEvidence, scorer } = {}) {
    this.pool = pool || require('../db/pool').pool;
    this.config = config;
    this.storage = storage || createObjectStorageAdapter(config.storage);
    this.normalizer = normalizer || new AudioNormalizerService();
    this.transcriber = transcriber || new ExistingProviderTranscriberAdapter();
    this.speechEvidence = speechEvidence
      || createSpeechEvidenceAdapter(config.provider?.manifest?.speech_evidence_provider);
    this.scorer = scorer || new GeminiSpeakingRubricScorer();
  }

  async loadParts(groupOrPartId) {
    const { rows } = await this.pool.query(
      `WITH target AS (
         SELECT speaking_group_id FROM speaking_submissions
         WHERE (id::text = $1 OR speaking_group_id::text = $1) AND deleted_at IS NULL
         ORDER BY part_number LIMIT 1
       )
       SELECT ss.*, mt.title AS test_title
       FROM speaking_submissions ss
       JOIN target ON target.speaking_group_id = ss.speaking_group_id
       LEFT JOIN mock_tests mt ON mt.id = ss.test_id
       WHERE ss.deleted_at IS NULL ORDER BY ss.part_number`,
      [groupOrPartId]
    );
    if (rows.length !== 3 || rows.some((part, index) => Number(part.part_number) !== index + 1)) {
      throw new AppError('Bài Speaking không đủ ba Part.', 422, 'SPEAKING_GROUP_INCOMPLETE');
    }
    return rows;
  }

  async loadAudio(part) {
    if (!part.audio_storage_key) {
      throw new AppError('Bài tutor cần audio private để AI phân tích.', 422, 'SPEAKING_AUDIO_REQUIRED');
    }
    const source = await this.storage.downloadObject({ key: part.audio_storage_key });
    if (!source) throw new AppError('Không tìm thấy audio Speaking.', 422, 'AUDIO_OBJECT_MISSING');
    if (part.declared_audio_sha256 && sha256(source) !== part.declared_audio_sha256) {
      throw new AppError('Checksum audio không hợp lệ.', 422, 'AUDIO_SHA256_MISMATCH');
    }
    return source;
  }

  async analyzePart(part, context) {
    const source = await this.loadAudio(part);
    const normalized = await this.normalizer.normalize(source);
    const usageContext = {
      userId: context.userId,
      feature: 'tutor_ai_reference',
      entityType: 'speaking_submission',
      entityId: part.id,
    };
    const transcription = await this.transcriber.transcribe({
      audioBuffer: normalized.buffer,
      contentType: normalized.contentType,
      usageContext,
    });
    const speech = await this.speechEvidence.analyze({
      audioBuffer: normalized.buffer,
      contentType: normalized.contentType,
      asrTranscript: transcription.asrTranscript,
      languageCode: 'en',
      usageContext,
    });
    if (speech.status !== 'sufficient') {
      throw new AppError('Audio không đủ để tạo bản nháp bốn tiêu chí.', 422, 'SPEAKING_AUDIO_EVIDENCE_INSUFFICIENT');
    }
    return {
      id: `preview-${part.id}`,
      part_number: Number(part.part_number),
      status: 'complete',
      asr_transcript: transcription.asrTranscript,
      display_transcript: transcription.displayTranscript || transcription.asrTranscript,
      audio_quality_json: normalized.quality || {},
      fluency_metrics_json: speech.fluencyMetrics,
      pronunciation_evidence_json: speech.pronunciationEvidence,
    };
  }

  async run(groupOrPartId, context) {
    const parts = await this.loadParts(groupOrPartId);
    const artifacts = await Promise.all(parts.map((part) => this.analyzePart(part, context)));
    return this.scorer.score({
      artifacts,
      parts,
      job: {
        id: parts[0].speaking_group_id,
        user_id: parts[0].user_id,
        pipeline_version: this.config.pipelineVersion,
      },
    });
  }
}

let defaultService;
const getSpeakingTutorPrelimService = () => {
  if (!defaultService) defaultService = new SpeakingTutorPrelimService();
  return defaultService;
};

module.exports = { SpeakingTutorPrelimService, getSpeakingTutorPrelimService };
