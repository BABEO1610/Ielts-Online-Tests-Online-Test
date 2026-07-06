-- 021_writing_group_feedback_refactor.sql
-- UP
-- Backward-compatible support for grouped Writing submissions.
-- No DROP/DELETE/TRUNCATE. Existing rows remain intact.

ALTER TABLE writing_submissions
  ADD COLUMN IF NOT EXISTS word_count INTEGER;

ALTER TABLE writing_submissions
  ADD COLUMN IF NOT EXISTS ai_status VARCHAR(20) NOT NULL DEFAULT 'pending';

ALTER TABLE writing_submissions
  ADD COLUMN IF NOT EXISTS tutor_status VARCHAR(20) NOT NULL DEFAULT 'pending';

ALTER TABLE writing_submissions
  ADD COLUMN IF NOT EXISTS overall_ai_band NUMERIC(3,1);

ALTER TABLE writing_submissions
  ADD COLUMN IF NOT EXISTS overall_tutor_band NUMERIC(3,1);

ALTER TABLE writing_submissions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE writing_submissions
SET word_count = array_length(regexp_split_to_array(trim(response_text), '\s+'), 1)
WHERE word_count IS NULL
  AND response_text IS NOT NULL
  AND trim(response_text) <> '';

UPDATE writing_submissions
SET word_count = 0
WHERE word_count IS NULL;

CREATE INDEX IF NOT EXISTS idx_writing_submissions_ai_status
  ON writing_submissions(ai_status);

CREATE INDEX IF NOT EXISTS idx_writing_submissions_tutor_status
  ON writing_submissions(tutor_status);

ALTER TABLE ai_grading_reports
  ADD COLUMN IF NOT EXISTS task_number SMALLINT CHECK (task_number IN (1, 2));

ALTER TABLE ai_grading_reports
  ADD COLUMN IF NOT EXISTS writing_group_id UUID;

CREATE INDEX IF NOT EXISTS idx_ai_grading_writing_group
  ON ai_grading_reports(writing_group_id, task_number)
  WHERE submission_type = 'writing';

CREATE TABLE IF NOT EXISTS tutor_feedback_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  writing_submission_id UUID REFERENCES writing_submissions(id) ON DELETE CASCADE,
  speaking_submission_id UUID REFERENCES speaking_submissions(id) ON DELETE CASCADE,
  task_number SMALLINT CHECK (task_number IN (1, 2)),
  band_score NUMERIC(3,1),
  task_achievement_score NUMERIC(3,1),
  coherence_score NUMERIC(3,1),
  lexical_score NUMERIC(3,1),
  grammar_score NUMERIC(3,1),
  fluency_score NUMERIC(3,1),
  pronunciation_score NUMERIC(3,1),
  written_feedback TEXT,
  audio_feedback_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (writing_submission_id IS NOT NULL OR speaking_submission_id IS NOT NULL)
);

ALTER TABLE tutor_feedback_reports
  ADD COLUMN IF NOT EXISTS task_number SMALLINT CHECK (task_number IN (1, 2));

ALTER TABLE tutor_feedback_reports
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_tutor_feedback_writing_submission
  ON tutor_feedback_reports(writing_submission_id);

CREATE INDEX IF NOT EXISTS idx_tutor_feedback_speaking_submission
  ON tutor_feedback_reports(speaking_submission_id);

-- DOWN (manual rollback if needed; keep commented because the project runner executes whole files)
-- DROP INDEX IF EXISTS idx_tutor_feedback_speaking_submission;
-- DROP INDEX IF EXISTS idx_tutor_feedback_writing_submission;
-- DROP TABLE IF EXISTS tutor_feedback_reports;
-- DROP INDEX IF EXISTS idx_ai_grading_writing_group;
-- ALTER TABLE ai_grading_reports DROP COLUMN IF EXISTS writing_group_id;
-- ALTER TABLE ai_grading_reports DROP COLUMN IF EXISTS task_number;
-- DROP INDEX IF EXISTS idx_writing_submissions_tutor_status;
-- DROP INDEX IF EXISTS idx_writing_submissions_ai_status;
-- ALTER TABLE writing_submissions DROP COLUMN IF EXISTS updated_at;
-- ALTER TABLE writing_submissions DROP COLUMN IF EXISTS overall_tutor_band;
-- ALTER TABLE writing_submissions DROP COLUMN IF EXISTS overall_ai_band;
-- ALTER TABLE writing_submissions DROP COLUMN IF EXISTS tutor_status;
-- ALTER TABLE writing_submissions DROP COLUMN IF EXISTS ai_status;
-- ALTER TABLE writing_submissions DROP COLUMN IF EXISTS word_count;
