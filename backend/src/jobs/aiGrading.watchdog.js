class AiGradingWatchdog {
  constructor({ pool, retryDelaySeconds = 5, random = Math.random } = {}) {
    this.pool = pool || require('../db/pool').pool;
    this.retryDelaySeconds = retryDelaySeconds;
    this.random = random;
  }

  async recoverOne() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `WITH expired AS (
           SELECT id FROM ai_grading_jobs
           WHERE submission_type = 'speaking' AND status = 'running'
             AND lease_expires_at < NOW() AND deleted_at IS NULL
           ORDER BY lease_expires_at FOR UPDATE SKIP LOCKED LIMIT 1
         )
         UPDATE ai_grading_jobs job
         SET status = CASE WHEN attempt_count < max_attempts THEN 'queued' ELSE 'failed' END,
             run_after = CASE WHEN attempt_count < max_attempts
               THEN NOW() + (($1::double precision
                 * POWER(2, LEAST(GREATEST(job.attempt_count - 1, 0), 5))
                 * (1 + $2::double precision)) * INTERVAL '1 second') ELSE run_after END,
             finished_at = CASE WHEN attempt_count >= max_attempts THEN NOW() ELSE NULL END,
             lease_owner = NULL, lease_expires_at = NULL,
             last_error_code = 'WORKER_LEASE_EXPIRED',
             last_error_message = 'Worker lease expired before finalization',
             last_error_retryable = TRUE
         FROM expired WHERE job.id = expired.id
         RETURNING job.*`, [this.retryDelaySeconds, Math.max(0, Math.min(1, this.random())) * 0.25]);
      const job = result.rows[0] || null;
      if (job?.status === 'failed') {
        await client.query(
          `UPDATE speaking_submissions SET status = 'grading_failed', updated_at = NOW()
           WHERE speaking_group_id = $1 AND deleted_at IS NULL`, [job.group_id]);
      }
      await client.query('COMMIT');
      return job;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = { AiGradingWatchdog };
