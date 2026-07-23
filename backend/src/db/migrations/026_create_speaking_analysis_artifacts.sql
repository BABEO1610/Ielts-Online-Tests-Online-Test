CREATE TABLE IF NOT EXISTS speaking_analysis_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speaking_submission_id UUID NOT NULL REFERENCES speaking_submissions(id),
  source_job_id UUID NOT NULL REFERENCES ai_grading_jobs(id),
  audio_sha256 CHAR(64) NOT NULL CHECK (audio_sha256 ~ '^[0-9a-f]{64}$'),
  schema_version SMALLINT NOT NULL DEFAULT 1 CHECK (schema_version > 0),
  pipeline_version VARCHAR(80) NOT NULL CHECK (length(trim(pipeline_version)) > 0),
  scoring_config_sha256 CHAR(64) NOT NULL CHECK (scoring_config_sha256 ~ '^[0-9a-f]{64}$'),
  status VARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','complete','partial','failed')),
  language_code VARCHAR(16) NOT NULL DEFAULT 'en',
  asr_transcript TEXT,
  display_transcript TEXT,
  asr_uncertainty_json JSONB,
  provider_manifest_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  component_status_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  words_json JSONB,
  segments_json JSONB,
  audio_quality_json JSONB,
  fluency_metrics_json JSONB,
  pronunciation_evidence_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalized_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_speaking_artifact_terminal CHECK (
    (status = 'processing' AND finalized_at IS NULL) OR
    (status IN ('complete','partial','failed') AND finalized_at IS NOT NULL)
  ),
  CONSTRAINT chk_speaking_artifact_json_sizes CHECK (
    pg_column_size(provider_manifest_json) <= 32768 AND
    pg_column_size(component_status_json) <= 32768 AND
    (words_json IS NULL OR pg_column_size(words_json) <= 1048576) AND
    (segments_json IS NULL OR pg_column_size(segments_json) <= 524288) AND
    (audio_quality_json IS NULL OR pg_column_size(audio_quality_json) <= 131072) AND
    (fluency_metrics_json IS NULL OR pg_column_size(fluency_metrics_json) <= 262144) AND
    (pronunciation_evidence_json IS NULL OR pg_column_size(pronunciation_evidence_json) <= 2097152)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_speaking_artifact_config
  ON speaking_analysis_artifacts(speaking_submission_id, audio_sha256, scoring_config_sha256);
CREATE INDEX IF NOT EXISTS idx_speaking_artifact_job_status
  ON speaking_analysis_artifacts(source_job_id, status)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_speaking_artifact_submission
  ON speaking_analysis_artifacts(speaking_submission_id, created_at DESC)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_speaking_analysis_artifacts_updated_at ON speaking_analysis_artifacts;
CREATE TRIGGER trg_speaking_analysis_artifacts_updated_at
  BEFORE UPDATE ON speaking_analysis_artifacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Legacy transcript rows deliberately remain display-only. No synthetic job/artifact is created.
