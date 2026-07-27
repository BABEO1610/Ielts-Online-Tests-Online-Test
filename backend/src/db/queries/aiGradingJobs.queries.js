const TERMINAL_STATUSES = new Set(['completed', 'needs_review', 'failed']);

const one = async (db, sql, params) => (await db.query(sql, params)).rows[0] || null;

const lookupJobByIdempotency = (db, userId, idempotencyKey) => one(db,
   `SELECT * FROM ai_grading_jobs
   WHERE user_id = $1 AND idempotency_key = $2
   LIMIT 1`,
  [userId, idempotencyKey]);

const lookupOriginalByFingerprint = (db, userId, submissionType, fingerprint) => one(db,
  `SELECT * FROM ai_grading_jobs
   WHERE user_id = $1 AND submission_type = $2 AND input_fingerprint = $3
     AND retry_of_job_id IS NULL
   LIMIT 1`,
  [userId, submissionType, fingerprint]);

const lookupRootByGroup = (db, { submissionType, groupId, userId = null }) => one(db,
  `SELECT * FROM ai_grading_jobs
   WHERE submission_type = $1 AND group_id = $2 AND retry_of_job_id IS NULL
     AND deleted_at IS NULL AND ($3::uuid IS NULL OR user_id = $3)
   LIMIT 1`,
  [submissionType, groupId, userId]);

const insertRootJob = (db, input) => one(db,
  `INSERT INTO ai_grading_jobs (
     submission_type, group_id, user_id, idempotency_key, idempotency_expires_at,
     input_fingerprint, pipeline_version, scoring_config_sha256,
     calibration_bundle_sha256, max_attempts
   ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,2)
   RETURNING *`,
  [input.submissionType, input.groupId, input.userId, input.idempotencyKey,
    input.idempotencyExpiresAt, input.inputFingerprint, input.pipelineVersion,
    input.scoringConfigSha256, input.calibrationBundleSha256 || null]);

const countOriginalUsage = async (db, userId, utcDate) => {
  const row = await one(db,
    `SELECT COUNT(*)::integer AS count
     FROM ai_grading_jobs
     WHERE user_id = $1 AND retry_of_job_id IS NULL
       AND created_at >= (($2::date)::timestamp AT TIME ZONE 'UTC')
       AND created_at < ((($2::date + 1)::date)::timestamp AT TIME ZONE 'UTC')`,
    [userId, utcDate]);
  return row?.count || 0;
};

const claimNextJob = (db, { workerId, leaseSeconds = 90, submissionType = 'speaking' }) => one(db,
  `WITH candidate AS (
     SELECT id FROM ai_grading_jobs
     WHERE submission_type = $3 AND status IN ('queued','retry_wait') AND run_after <= NOW()
       AND attempt_count < max_attempts AND deleted_at IS NULL
       AND (lease_expires_at IS NULL OR lease_expires_at < NOW())
     ORDER BY run_after, created_at
     FOR UPDATE SKIP LOCKED
     LIMIT 1
   )
   UPDATE ai_grading_jobs AS job
   SET status = 'running', stage = 'validating_audio', attempt_count = attempt_count + 1,
       lease_owner = $1, lease_expires_at = NOW() + ($2 * INTERVAL '1 second'),
       lease_generation = lease_generation + 1,
       last_error_code = NULL, last_error_message = NULL, last_error_retryable = NULL
   FROM candidate WHERE job.id = candidate.id
   RETURNING job.*`,
  [workerId, leaseSeconds, submissionType]);

const heartbeatJob = (db, { jobId, workerId, generation, leaseSeconds = 90, stage }) => one(db,
  `UPDATE ai_grading_jobs
   SET lease_expires_at = NOW() + ($4 * INTERVAL '1 second'), stage = COALESCE($5, stage)
   WHERE id = $1 AND status = 'running' AND lease_owner = $2
     AND lease_generation = $3 AND lease_expires_at >= NOW()
   RETURNING *`,
  [jobId, workerId, generation, leaseSeconds, stage || null]);

const finishJob = (db, { jobId, workerId, generation, status, errorCode, errorMessage, retryable = false }) => {
  if (!TERMINAL_STATUSES.has(status)) throw new TypeError('Invalid terminal job status');
  return one(db,
    `UPDATE ai_grading_jobs
     SET status = $4::varchar, finished_at = NOW(), lease_owner = NULL, lease_expires_at = NULL,
         last_error_code = $5, last_error_message = $6,
         last_error_retryable = CASE WHEN $4::varchar = 'failed' THEN $7 ELSE last_error_retryable END
     WHERE id = $1 AND status = 'running' AND lease_owner = $2 AND lease_generation = $3
       AND lease_expires_at >= NOW()
     RETURNING *`,
    [jobId, workerId, generation, status, errorCode || null, errorMessage || null, Boolean(retryable)]);
};

const scheduleRetry = (db, input) => one(db,
  `UPDATE ai_grading_jobs
   SET status = 'retry_wait', run_after = $4, lease_owner = NULL, lease_expires_at = NULL,
       last_error_code = $5, last_error_message = $6, last_error_retryable = TRUE
   WHERE id = $1 AND status = 'running' AND lease_owner = $2 AND lease_generation = $3
     AND lease_expires_at >= NOW() AND attempt_count < max_attempts
   RETURNING *`,
  [input.jobId, input.workerId, input.generation, input.runAfter,
    input.errorCode, input.errorMessage || null]);

const getCanonicalJobForGroup = (db, { groupId, userId = null }) => one(db,
  `SELECT root.*,
          root.id AS root_job_id,
          child.id AS retry_job_id,
          COALESCE(child.id, root.id) AS canonical_job_id,
          COALESCE(child.status, root.status) AS canonical_status,
          COALESCE(child.stage, root.stage) AS canonical_stage,
          COALESCE(child.attempt_count, root.attempt_count) AS attempt_count,
          COALESCE(child.max_attempts, root.max_attempts) AS max_attempts,
          COALESCE(child.last_error_code, root.last_error_code) AS last_error_code,
          COALESCE(child.last_error_message, root.last_error_message) AS canonical_error_message,
          COALESCE(child.last_error_retryable, root.last_error_retryable) AS canonical_error_retryable,
          COALESCE(child.updated_at, root.updated_at) AS canonical_updated_at
   FROM ai_grading_jobs root
   LEFT JOIN ai_grading_jobs child ON child.retry_of_job_id = root.id AND child.deleted_at IS NULL
   WHERE root.group_id = $1 AND root.retry_of_job_id IS NULL AND root.deleted_at IS NULL
     AND ($2::uuid IS NULL OR root.user_id = $2)
   LIMIT 1`,
  [groupId, userId]);

const findRetryChild = (db, rootJobId) => one(db,
  `SELECT * FROM ai_grading_jobs
   WHERE retry_of_job_id = $1 LIMIT 1`, [rootJobId]);

const insertRetryChild = (db, { rootJobId, idempotencyKey, expiresAt }) => one(db,
  `INSERT INTO ai_grading_jobs (
     submission_type, group_id, user_id, idempotency_key, idempotency_expires_at,
     input_fingerprint, pipeline_version, scoring_config_sha256,
     calibration_bundle_sha256, retry_of_job_id, max_attempts
   )
   SELECT submission_type, group_id, user_id, $2, $3, input_fingerprint,
          pipeline_version, scoring_config_sha256, calibration_bundle_sha256, id, 1
   FROM ai_grading_jobs
    WHERE id = $1 AND retry_of_job_id IS NULL AND status = 'failed'
      AND deleted_at IS NULL
   ON CONFLICT (retry_of_job_id) WHERE retry_of_job_id IS NOT NULL DO NOTHING
   RETURNING *`,
  [rootJobId, idempotencyKey, expiresAt]);

module.exports = {
  lookupJobByIdempotency,
  lookupOriginalByFingerprint,
  lookupRootByGroup,
  insertRootJob,
  countOriginalUsage,
  claimNextJob,
  heartbeatJob,
  finishJob,
  scheduleRetry,
  getCanonicalJobForGroup,
  findRetryChild,
  insertRetryChild,
};
