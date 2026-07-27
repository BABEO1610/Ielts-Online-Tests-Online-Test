const crypto = require('node:crypto');
const AppError = require('../utils/AppError');
const { aiGradingConfig } = require('../config/aiGrading.config');
const { createObjectStorageAdapter } = require('../storage/objectStorage.adapter');
const { createAudioUploadToken, verifyAudioUploadToken } = require('../security/audioUploadToken');
const jobQueries = require('../db/queries/aiGradingJobs.queries');
const {
  CONTENT_TYPES,
  MAX_AUDIO_BYTES,
  buildFingerprint,
  lockAudioObjects,
  normalizeParts,
  normalizeUploadInput,
  requireIdempotencyKey,
  requireUuid,
} = require('./speakingSubmission.helpers');
const {
  insertSpeakingParts,
  reserveSpeakingJob,
  resolvePrompts,
} = require('./speakingSubmission.persistence');

const toAsyncJob = (job) => ({
  speaking_group_id: job.group_id,
  job_id: job.id,
  status: 'queued',
  stage: 'queued',
  status_url: `/api/v1/submissions/speaking/${job.group_id}/grading-status`,
  submitted_at: job.created_at,
});

class SpeakingSubmissionService {
  constructor({ pool, config = aiGradingConfig, storage, now = () => Date.now(), randomUUID = crypto.randomUUID } = {}) {
    this.pool = pool || require('../db/pool').pool;
    this.config = config;
    this.storage = storage || null;
    this.now = now;
    this.randomUUID = randomUUID;
  }

  assertEnabled() {
    if (!this.config.enabled) {
      throw new AppError('Chấm Speaking bất đồng bộ chưa được bật.', 503, 'AI_SPEAKING_DISABLED');
    }
  }

  getStorage() {
    if (!this.storage) this.storage = createObjectStorageAdapter(this.config.storage);
    return this.storage;
  }

  async createAudioUpload(userId, body) {
    this.assertEnabled();
    requireUuid(userId, 'user_id');
    const input = normalizeUploadInput(body);
    const objectKey = `quarantine/speaking/${userId}/${this.randomUUID()}.${input.extension}`;
    const signed = await this.getStorage().createSignedUpload({
      key: objectKey,
      contentType: input.contentType,
      contentLength: input.sizeBytes,
      checksumSha256: input.sha256,
      expiresInSeconds: this.config.storage.signedUploadTtlSeconds,
    });
    const uploadToken = createAudioUploadToken({
      user_id: userId,
      object_key: objectKey,
      part_number: input.partNumber,
      content_type: input.contentType,
      size_bytes: input.sizeBytes,
      sha256: input.sha256,
      duration_ms: input.durationMs,
    }, {
      ...this.config.uploadToken,
      now: this.now(),
    });
    return {
      upload_url: signed.uploadUrl,
      upload_token: uploadToken.token,
      required_headers: signed.requiredHeaders || {},
      upload_url_expires_at: signed.expiresAt,
      upload_token_expires_at: uploadToken.expiresAt,
      max_size_bytes: MAX_AUDIO_BYTES,
    };
  }

  verifyTokens(userId, parts, allowExpired) {
    try {
      return parts.map((part) => verifyAudioUploadToken(part.uploadToken, {
        keyring: this.config.uploadToken.keyring,
        now: this.now(),
        expectedUserId: userId,
        expectedPartNumber: part.partNumber,
        allowExpired,
      }));
    } catch (error) {
      if (error.errorCode) throw new AppError(error.message, error.statusCode || 400, error.errorCode);
      throw error;
    }
  }

  async preflightObjects(uploads) {
    if (new Set(uploads.map((upload) => upload.object_key)).size !== uploads.length) {
      throw new AppError('Mỗi Part phải dùng một tệp âm thanh riêng.', 400, 'DUPLICATE_AUDIO_OBJECT');
    }
    const stats = await Promise.all(uploads.map((upload) => this.getStorage().statObject({ key: upload.object_key })));
    stats.forEach((stat, index) => {
      const upload = uploads[index];
      if (!stat) throw new AppError(`Chưa tìm thấy tệp âm thanh Part ${upload.part_number}.`, 422, 'AUDIO_UPLOAD_NOT_FOUND');
      if (Number(stat.size) !== upload.size_bytes) {
        throw new AppError(`Kích thước tệp Part ${upload.part_number} không khớp.`, 422, 'AUDIO_SIZE_MISMATCH');
      }
      const actualType = String(stat.contentType || '').split(';')[0].toLowerCase();
      if (actualType && CONTENT_TYPES.get(actualType)?.normalized !== upload.content_type) {
        throw new AppError(`MIME của Part ${upload.part_number} không khớp.`, 422, 'AUDIO_TYPE_MISMATCH');
      }
    });
  }

  async withTransaction(work) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const value = await work(client);
      await client.query('COMMIT');
      return value;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async persistAiSubmission(client, input) {
    const { userId, testId, parts, uploads, key } = input;
    await lockAudioObjects(client, uploads);
    const prompts = await resolvePrompts(client, testId, parts);
    const groupId = this.randomUUID();
    const expiresAt = new Date(this.now() + this.config.idempotencyTtlSeconds * 1000).toISOString();
    const reservation = await reserveSpeakingJob({
      client, userId, key, testId, prompts, uploads, groupId, expiresAt,
      config: this.config, now: this.now(),
    });
    if (reservation.kind === 'duplicate') {
      throw new AppError('Bài này đã được gửi chấm bằng một khóa khác.', 409, 'DUPLICATE_GRADING_REQUEST');
    }
    if (reservation.kind === 'reserved') {
      await insertSpeakingParts({
        db: client, userId, testId, groupId, prompts, uploads, grader: 'ai',
      });
    }
    return { ...toAsyncJob(reservation.value), replayed: reservation.kind === 'replay' };
  }

  async replayCommitted(job, { userId, testId, parts, uploads }) {
    const result = await this.pool.query(
      `SELECT test_id, part_number, source_prompt_id, audio_storage_key,
              declared_audio_sha256, audio_size_bytes, declared_duration_ms
       FROM speaking_submissions
       WHERE speaking_group_id = $1 AND user_id = $2 AND deleted_at IS NULL
       ORDER BY part_number`, [job.group_id, userId]);
    const matches = result.rows.length === 3 && result.rows.every((row, index) => (
      Number(row.part_number) === index + 1
      && row.test_id === testId
      && row.source_prompt_id === parts[index].promptId
      && row.audio_storage_key === uploads[index].object_key
      && row.declared_audio_sha256 === uploads[index].sha256
      && Number(row.audio_size_bytes) === uploads[index].size_bytes
      && Number(row.declared_duration_ms) === uploads[index].duration_ms
    ));
    if (!matches) throw new AppError('Idempotency-Key đã dùng cho yêu cầu khác.', 409, 'IDEMPOTENCY_KEY_REUSED');
    return { ...toAsyncJob(job), replayed: true };
  }

  async submitFullSpeaking({ userId, testId, grader, parts, idempotencyKey }) {
    this.assertEnabled();
    requireUuid(userId, 'user_id');
    const normalizedTestId = requireUuid(testId, 'test_id');
    if (grader !== 'ai') throw new AppError('grader phải là ai cho endpoint này.', 400, 'INVALID_FIELD');
    const key = requireIdempotencyKey(idempotencyKey);
    const normalizedParts = normalizeParts(parts);
    const fastReplay = await jobQueries.lookupJobByIdempotency(this.pool, userId, key);
    if (fastReplay && new Date(fastReplay.idempotency_expires_at).getTime() <= this.now()) {
      throw new AppError('Cửa sổ phát lại đã hết hạn.', 410, 'IDEMPOTENCY_WINDOW_EXPIRED');
    }
    const uploads = this.verifyTokens(userId, normalizedParts, Boolean(fastReplay));
    if (fastReplay) return this.replayCommitted(fastReplay, {
      userId, testId: normalizedTestId, parts: normalizedParts, uploads,
    });
    await this.preflightObjects(uploads);
    return this.withTransaction((client) => this.persistAiSubmission(client, {
      userId, testId: normalizedTestId, parts: normalizedParts, uploads, key,
    }));
  }

  async persistTutorSubmission(client, input) {
    const { userId, testId, parts, uploads, groupId } = input;
    await lockAudioObjects(client, uploads);
    const prompts = await resolvePrompts(client, testId, parts);
    const inserted = await insertSpeakingParts({
      db: client, userId, testId, groupId, prompts, uploads, grader: 'tutor',
    });
    return { speaking_group_id: groupId, status: 'pending', parts: inserted };
  }

  async submitTutorSpeaking({ userId, testId, parts }) {
    this.assertEnabled();
    requireUuid(userId, 'user_id');
    const normalizedTestId = requireUuid(testId, 'test_id');
    const normalizedParts = normalizeParts(parts);
    const uploads = this.verifyTokens(userId, normalizedParts, false);
    await this.preflightObjects(uploads);
    const groupId = this.randomUUID();
    return this.withTransaction((client) => this.persistTutorSubmission(client, {
      userId, testId: normalizedTestId, parts: normalizedParts, uploads, groupId,
    }));
  }

  async assertGroupAccess(groupId, user) {
    const result = await this.pool.query(
      `SELECT MIN(user_id::text) AS owner_id,
              BOOL_AND(assigned_tutor_id = $2::uuid) AS assigned_to_tutor
       FROM speaking_submissions
       WHERE speaking_group_id = $1 AND deleted_at IS NULL
       HAVING COUNT(*) > 0`, [groupId, user.role === 'tutor' ? user.id : null]);
    const group = result.rows[0];
    if (!group) throw new AppError('Không tìm thấy bài Speaking.', 404, 'SPEAKING_GROUP_NOT_FOUND');
    const allowed = user.role === 'admin'
      || (user.role === 'student' && group.owner_id === user.id)
      || (user.role === 'tutor' && group.assigned_to_tutor === true);
    if (!allowed) throw new AppError('Bạn không có quyền xem bài Speaking này.', 403, 'AUTH_PERM_001');
  }

  async getStatus(groupId, user) {
    requireUuid(groupId, 'speakingGroupId');
    await this.assertGroupAccess(groupId, user);
    const job = await jobQueries.getCanonicalJobForGroup(this.pool, {
      groupId,
      userId: user.role === 'student' ? user.id : null,
    });
    if (!job) throw new AppError('Không tìm thấy grading job.', 404, 'GRADING_JOB_NOT_FOUND');
    const terminal = ['completed', 'needs_review', 'failed'].includes(job.canonical_status);
    // A learner gets one manual recovery attempt after every terminal failure,
    // including a non-retryable infrastructure/configuration failure. The
    // child-job uniqueness constraint still prevents repeated retries.
    const canRetry = !job.retry_job_id && job.canonical_status === 'failed';
    let result = null;
    if (job.canonical_status === 'completed' || (job.canonical_status === 'needs_review' && user.role !== 'student')) {
      const report = await this.pool.query(
        `SELECT id, feedback_json, generated_at FROM ai_grading_reports
         WHERE grading_job_id = $1 AND deleted_at IS NULL
           AND status IN ('completed','needs_review') LIMIT 1`, [job.canonical_job_id]);
      const reportRow = report.rows[0];
      const stored = reportRow?.feedback_json?.public_result || reportRow?.feedback_json?.review_result || null;
      result = stored ? { report_id: reportRow.id, ...stored, generated_at: stored.generated_at || reportRow.generated_at } : null;
    }
    return {
      speaking_group_id: groupId,
      job_id: job.canonical_job_id,
      status: job.canonical_status,
      stage: job.canonical_stage,
      attempt_count: job.attempt_count,
      max_attempts: job.max_attempts,
      is_terminal: terminal,
      can_retry: canRetry,
      result,
      updated_at: job.canonical_updated_at,
    };
  }

  async retry({ groupId, userId, idempotencyKey }) {
    const { SpeakingGradingRetryService } = require('./speakingGradingRetry.service');
    return new SpeakingGradingRetryService({
      pool: this.pool,
      config: this.config,
      now: this.now,
    }).retry({ groupId, userId, idempotencyKey });
  }
}

let defaultService;
const getSpeakingSubmissionService = () => {
  if (!defaultService) defaultService = new SpeakingSubmissionService();
  return defaultService;
};

module.exports = {
  SpeakingSubmissionService,
  getSpeakingSubmissionService,
  normalizeUploadInput,
  normalizeParts,
  buildFingerprint,
  lockAudioObjects,
};
