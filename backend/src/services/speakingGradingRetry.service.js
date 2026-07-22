const AppError = require('../utils/AppError');
const { aiGradingConfig } = require('../config/aiGrading.config');
const jobQueries = require('../db/queries/aiGradingJobs.queries');
const { requireIdempotencyKey, requireUuid } = require('./speakingSubmission.helpers');

const toAsyncJob = (job) => ({
  speaking_group_id: job.group_id,
  job_id: job.id,
  status: 'queued',
  stage: 'queued',
  status_url: `/api/v1/submissions/speaking/${job.group_id}/grading-status`,
  submitted_at: job.created_at,
});

const retryAlreadyCreated = (job) => {
  const error = new AppError('Bài này đã dùng lượt retry thủ công.', 409, 'RETRY_ALREADY_CREATED');
  error.details = { job_id: job.id, speaking_group_id: job.group_id };
  return error;
};

class SpeakingGradingRetryService {
  constructor({ pool, config = aiGradingConfig, now = () => Date.now() } = {}) {
    this.pool = pool || require('../db/pool').pool;
    this.config = config;
    this.now = now;
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

  async retryLocked(client, { groupId, userId, key }) {
    const rootResult = await client.query(
      `SELECT * FROM ai_grading_jobs
       WHERE group_id = $1 AND user_id = $2 AND submission_type = 'speaking'
         AND retry_of_job_id IS NULL AND deleted_at IS NULL
       FOR UPDATE`, [groupId, userId]);
    const root = rootResult.rows[0];
    if (!root) throw new AppError('Không tìm thấy grading job.', 404, 'GRADING_JOB_NOT_FOUND');
    const byKey = await jobQueries.lookupJobByIdempotency(client, userId, key);
    if (byKey) return this.replay(root, byKey);
    const existing = await jobQueries.findRetryChild(client, root.id);
    if (existing) throw retryAlreadyCreated(existing);
    const child = await jobQueries.insertRetryChild(client, {
      rootJobId: root.id,
      idempotencyKey: key,
      expiresAt: new Date(this.now() + this.config.idempotencyTtlSeconds * 1000).toISOString(),
    });
    if (!child) throw new AppError('Job chưa đủ điều kiện retry.', 409, 'GRADING_NOT_RETRYABLE');
    await this.resetGroup(client, { groupId, userId });
    return { ...toAsyncJob(child), replayed: false };
  }

  async resetGroup(client, { groupId, userId }) {
    const result = await client.query(
      `UPDATE speaking_submissions
       SET status = 'pending', grader = 'ai', updated_at = NOW()
       WHERE speaking_group_id = $1 AND user_id = $2
         AND status = 'grading_failed' AND deleted_at IS NULL
       RETURNING id`, [groupId, userId]);
    if (result.rows.length !== 3) {
      throw new AppError('Trạng thái group không hợp lệ để retry.', 409, 'GRADING_NOT_RETRYABLE');
    }
  }

  replay(root, job) {
    if (new Date(job.idempotency_expires_at).getTime() <= this.now()) {
      throw new AppError('Cửa sổ phát lại đã hết hạn.', 410, 'IDEMPOTENCY_WINDOW_EXPIRED');
    }
    if (job.retry_of_job_id !== root.id) {
      throw new AppError('Idempotency-Key đã dùng cho yêu cầu khác.', 409, 'IDEMPOTENCY_KEY_REUSED');
    }
    return { ...toAsyncJob(job), replayed: true };
  }

  async retry({ groupId, userId, idempotencyKey }) {
    if (!this.config.enabled) {
      throw new AppError('Chấm Speaking bất đồng bộ chưa được bật.', 503, 'AI_SPEAKING_DISABLED');
    }
    const normalizedGroupId = requireUuid(groupId, 'speakingGroupId');
    const normalizedUserId = requireUuid(userId, 'user_id');
    const key = requireIdempotencyKey(idempotencyKey);
    return this.withTransaction((client) => this.retryLocked(client, {
      groupId: normalizedGroupId, userId: normalizedUserId, key,
    }));
  }
}

let defaultService;
const getSpeakingGradingRetryService = () => {
  if (!defaultService) defaultService = new SpeakingGradingRetryService();
  return defaultService;
};

module.exports = {
  SpeakingGradingRetryService,
  getSpeakingGradingRetryService,
  requireIdempotencyKey,
  toAsyncJob,
};
