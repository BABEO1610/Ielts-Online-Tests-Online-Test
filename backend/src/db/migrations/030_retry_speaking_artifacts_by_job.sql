-- A manual retry is a new analysis attempt, even when it uses the same audio.
-- Keep artifacts immutable and scoped to the job that produced them so its
-- transcript and audio evidence cannot be accidentally reused by a retry job.
DROP INDEX IF EXISTS uq_speaking_artifact_config;

CREATE UNIQUE INDEX IF NOT EXISTS uq_speaking_artifact_job_config
  ON speaking_analysis_artifacts(
    speaking_submission_id,
    audio_sha256,
    scoring_config_sha256,
    source_job_id
  );
