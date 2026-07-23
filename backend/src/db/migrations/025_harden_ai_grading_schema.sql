-- Production-safe queue/private-audio hardening. No legacy row is deleted.

ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'grading_failed';

ALTER TABLE speaking_submissions
  ADD COLUMN IF NOT EXISTS audio_storage_key TEXT,
  ADD COLUMN IF NOT EXISTS declared_audio_sha256 CHAR(64),
  ADD COLUMN IF NOT EXISTS audio_sha256 CHAR(64),
  ADD COLUMN IF NOT EXISTS audio_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS declared_duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS source_prompt_id UUID,
  ADD COLUMN IF NOT EXISTS prompt_snapshot_sha256 CHAR(64),
  ADD COLUMN IF NOT EXISTS assigned_tutor_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE speaking_submissions ALTER COLUMN audio_url DROP NOT NULL;

UPDATE speaking_submissions
SET speaking_group_id = gen_random_uuid()
WHERE speaking_group_id IS NULL;

UPDATE speaking_submissions
SET assigned_tutor_at = COALESCE(submitted_at, created_at, NOW())
WHERE assigned_tutor_id IS NOT NULL AND assigned_tutor_at IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM speaking_submissions
    WHERE speaking_group_id IS NOT NULL AND part_number IS NOT NULL
    GROUP BY speaking_group_id, part_number HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate speaking_group_id/part_number rows must be reviewed before migration';
  END IF;
END $$;

ALTER TABLE speaking_submissions ALTER COLUMN speaking_group_id SET NOT NULL;
ALTER TABLE speaking_submissions
  ADD CONSTRAINT chk_speaking_audio_location CHECK (audio_storage_key IS NOT NULL OR audio_url IS NOT NULL) NOT VALID,
  ADD CONSTRAINT chk_speaking_declared_sha CHECK (declared_audio_sha256 IS NULL OR declared_audio_sha256 ~ '^[0-9a-f]{64}$') NOT VALID,
  ADD CONSTRAINT chk_speaking_verified_sha CHECK (audio_sha256 IS NULL OR audio_sha256 ~ '^[0-9a-f]{64}$') NOT VALID,
  ADD CONSTRAINT chk_speaking_audio_size CHECK (audio_size_bytes IS NULL OR audio_size_bytes BETWEEN 1 AND 52428800) NOT VALID,
  ADD CONSTRAINT chk_speaking_duration CHECK (declared_duration_ms IS NULL OR declared_duration_ms > 0) NOT VALID,
  ADD CONSTRAINT chk_speaking_prompt_sha CHECK (prompt_snapshot_sha256 IS NULL OR prompt_snapshot_sha256 ~ '^[0-9a-f]{64}$') NOT VALID,
  ADD CONSTRAINT chk_speaking_tutor_assignment CHECK ((assigned_tutor_id IS NULL) = (assigned_tutor_at IS NULL)) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS uq_speaking_group_part
  ON speaking_submissions(speaking_group_id, part_number)
  WHERE part_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_speaking_audio_storage_key
  ON speaking_submissions(audio_storage_key)
  WHERE audio_storage_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_speaking_active_group
  ON speaking_submissions(speaking_group_id)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_speaking_submissions_updated_at ON speaking_submissions;
CREATE TRIGGER trg_speaking_submissions_updated_at
  BEFORE UPDATE ON speaking_submissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS ai_grading_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_type VARCHAR(20) NOT NULL CHECK (submission_type IN ('writing', 'speaking')),
  group_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  idempotency_key VARCHAR(128) NOT NULL CHECK (length(trim(idempotency_key)) BETWEEN 16 AND 128),
  idempotency_expires_at TIMESTAMPTZ NOT NULL,
  input_fingerprint CHAR(64) NOT NULL CHECK (input_fingerprint ~ '^[0-9a-f]{64}$'),
  pipeline_version VARCHAR(80) NOT NULL CHECK (length(trim(pipeline_version)) > 0),
  scoring_config_sha256 CHAR(64) NOT NULL CHECK (scoring_config_sha256 ~ '^[0-9a-f]{64}$'),
  calibration_bundle_sha256 CHAR(64) CHECK (calibration_bundle_sha256 IS NULL OR calibration_bundle_sha256 ~ '^[0-9a-f]{64}$'),
  status VARCHAR(32) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','retry_wait','completed','needs_review','failed')),
  stage VARCHAR(32) NOT NULL DEFAULT 'queued' CHECK (stage IN ('queued','validating_audio','analyzing','scoring','calibrating','finalizing')),
  attempt_count SMALLINT NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts SMALLINT NOT NULL DEFAULT 2 CHECK (max_attempts IN (1,2)),
  lease_generation INTEGER NOT NULL DEFAULT 0 CHECK (lease_generation >= 0),
  run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lease_owner VARCHAR(128),
  lease_expires_at TIMESTAMPTZ,
  last_error_code VARCHAR(80),
  last_error_message TEXT,
  last_error_retryable BOOLEAN,
  retry_of_job_id UUID REFERENCES ai_grading_jobs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_ai_job_attempt_budget CHECK (attempt_count <= max_attempts),
  CONSTRAINT chk_ai_job_generation CHECK (
    (retry_of_job_id IS NULL AND max_attempts = 2) OR
    (retry_of_job_id IS NOT NULL AND max_attempts = 1)
  ),
  CONSTRAINT chk_ai_job_retry_wait CHECK (status <> 'retry_wait' OR (max_attempts = 2 AND attempt_count = 1)),
  CONSTRAINT chk_ai_job_terminal CHECK (
    (status IN ('completed','needs_review','failed') AND finished_at IS NOT NULL AND lease_owner IS NULL AND lease_expires_at IS NULL) OR
    (status NOT IN ('completed','needs_review','failed') AND finished_at IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_job_idempotency ON ai_grading_jobs(user_id, idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_job_root_fingerprint
  ON ai_grading_jobs(user_id, submission_type, input_fingerprint)
  WHERE retry_of_job_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_job_root_group
  ON ai_grading_jobs(submission_type, group_id)
  WHERE retry_of_job_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_job_retry_child
  ON ai_grading_jobs(retry_of_job_id)
  WHERE retry_of_job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_job_claim
  ON ai_grading_jobs(status, run_after, lease_expires_at, created_at)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_job_owner_group
  ON ai_grading_jobs(user_id, group_id, created_at DESC)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_ai_grading_jobs_updated_at ON ai_grading_jobs;
CREATE TRIGGER trg_ai_grading_jobs_updated_at
  BEFORE UPDATE ON ai_grading_jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE ai_grading_reports
  ADD COLUMN IF NOT EXISTS speaking_group_id UUID,
  ADD COLUMN IF NOT EXISTS grading_job_id UUID REFERENCES ai_grading_jobs(id),
  ADD COLUMN IF NOT EXISTS pipeline_version VARCHAR(80),
  ADD COLUMN IF NOT EXISTS calibration_version VARCHAR(80),
  ADD COLUMN IF NOT EXISTS evidence_mode VARCHAR(32),
  ADD COLUMN IF NOT EXISTS requires_human_review BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE ai_grading_reports
  ADD CONSTRAINT chk_ai_report_evidence_mode CHECK (evidence_mode IS NULL OR evidence_mode IN ('full_audio','partial_audio','transcript_only')) NOT VALID,
  ADD CONSTRAINT chk_ai_report_status CHECK (status IS NULL OR status IN ('completed','needs_review','failed')) NOT VALID,
  ADD CONSTRAINT chk_ai_report_speaking_overall CHECK (
    submission_type <> 'speaking' OR grading_job_id IS NULL OR
    ((computed_band IS NULL AND band_score IS NULL) OR computed_band = band_score)
  ) NOT VALID,
  ADD CONSTRAINT chk_ai_report_job_projection CHECK (
    submission_type <> 'speaking' OR grading_job_id IS NULL OR
    (speaking_group_id IS NOT NULL AND pipeline_version IS NOT NULL AND evidence_mode IS NOT NULL)
  ) NOT VALID,
  ADD CONSTRAINT chk_ai_report_review_overall CHECK (
    submission_type <> 'speaking' OR grading_job_id IS NULL OR
    (evidence_mode NOT IN ('partial_audio','transcript_only') AND requires_human_review IS FALSE) OR
    (band_score IS NULL AND computed_band IS NULL AND requires_human_review IS TRUE)
  ) NOT VALID,
  ADD CONSTRAINT chk_ai_report_transcript_unscored CHECK (
    submission_type <> 'speaking' OR grading_job_id IS NULL OR evidence_mode <> 'transcript_only' OR
    (num_nonnulls(task_achievement_score, coherence_score, lexical_score, grammar_score,
                  fluency_score, pronunciation_score, band_score, computed_band) = 0)
  ) NOT VALID,
  ADD CONSTRAINT chk_ai_report_partial_shape CHECK (
    submission_type <> 'speaking' OR grading_job_id IS NULL OR evidence_mode <> 'partial_audio' OR
    (num_nonnulls(fluency_score, lexical_score, grammar_score, pronunciation_score) < 4 AND
     (num_nonnulls(fluency_score, lexical_score, grammar_score, pronunciation_score) = 0 OR calibration_version IS NOT NULL))
  ) NOT VALID,
  ADD CONSTRAINT chk_ai_report_full_shape CHECK (
    submission_type <> 'speaking' OR grading_job_id IS NULL OR evidence_mode <> 'full_audio' OR
    (status = 'completed' AND requires_human_review IS FALSE AND calibration_version IS NOT NULL AND
     num_nonnulls(fluency_score, lexical_score, grammar_score, pronunciation_score, band_score, computed_band) = 6)
  ) NOT VALID,
  ADD CONSTRAINT chk_ai_report_speaking_band_steps CHECK (
    submission_type <> 'speaking' OR grading_job_id IS NULL OR
    ((fluency_score IS NULL OR (fluency_score BETWEEN 0 AND 9 AND fluency_score * 2 = TRUNC(fluency_score * 2))) AND
     (lexical_score IS NULL OR (lexical_score BETWEEN 0 AND 9 AND lexical_score * 2 = TRUNC(lexical_score * 2))) AND
     (grammar_score IS NULL OR (grammar_score BETWEEN 0 AND 9 AND grammar_score * 2 = TRUNC(grammar_score * 2))) AND
     (pronunciation_score IS NULL OR (pronunciation_score BETWEEN 0 AND 9 AND pronunciation_score * 2 = TRUNC(pronunciation_score * 2))) AND
     (band_score IS NULL OR (band_score BETWEEN 0 AND 9 AND band_score * 2 = TRUNC(band_score * 2))) AND
     (computed_band IS NULL OR (computed_band BETWEEN 0 AND 9 AND computed_band * 2 = TRUNC(computed_band * 2))))
  ) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_report_grading_job
  ON ai_grading_reports(grading_job_id)
  WHERE grading_job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_report_speaking_group
  ON ai_grading_reports(speaking_group_id, generated_at DESC)
  WHERE submission_type = 'speaking' AND deleted_at IS NULL;

ALTER TABLE tutor_feedback_reports
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE tutor_feedback_reports
  ADD CONSTRAINT chk_tutor_feedback_one_submission CHECK (
    num_nonnulls(writing_submission_id, speaking_submission_id) = 1
  ) NOT VALID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM tutor_feedback_reports
    WHERE speaking_submission_id IS NOT NULL AND deleted_at IS NULL
    GROUP BY speaking_submission_id HAVING COUNT(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM tutor_feedback_reports
    WHERE writing_submission_id IS NOT NULL AND deleted_at IS NULL
    GROUP BY writing_submission_id HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate active tutor feedback rows must be reviewed before migration';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tutor_feedback_active_speaking
  ON tutor_feedback_reports(speaking_submission_id)
  WHERE speaking_submission_id IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tutor_feedback_active_writing
  ON tutor_feedback_reports(writing_submission_id)
  WHERE writing_submission_id IS NOT NULL AND deleted_at IS NULL;
