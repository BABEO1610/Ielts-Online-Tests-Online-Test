-- ============================================================
-- Migration 015: Restore Missing Tables & Columns
-- Created: 2026-06-23
-- Reason: DB was reset. This migration restores all tables/columns
--         referenced in services/queries but absent from prior migrations.
-- ============================================================

-- ─────────────────────────────────────────────
-- STEP 1: Add missing ENUMs (idempotent)
-- ─────────────────────────────────────────────

DO $$
BEGIN
    -- difficulty enum (used in mock_tests, missing from 001)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty') THEN
        CREATE TYPE difficulty AS ENUM ('beginner', 'intermediate', 'advanced');
    END IF;

    -- test_mode enum (used in test_attempts)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'test_mode') THEN
        CREATE TYPE test_mode AS ENUM ('timed', 'untimed');
    END IF;

    -- submission_status enum (used in writing/speaking submissions)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_status') THEN
        CREATE TYPE submission_status AS ENUM ('pending', 'ai_graded', 'tutor_graded', 'reviewed');
    END IF;

    -- grader_type enum (used in writing/speaking submissions)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grader_type') THEN
        CREATE TYPE grader_type AS ENUM ('ai', 'tutor');
    END IF;

    -- oauth_provider enum (used in oauth_accounts and user_sessions)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'oauth_provider') THEN
        CREATE TYPE oauth_provider AS ENUM ('google', 'facebook', 'github');
    END IF;

    -- review_status enum (used in mock_tests, library_resources - migration 011)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
        CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;

    -- resource_type enum (used in library_resources - migration 012)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_type') THEN
        CREATE TYPE resource_type AS ENUM ('pdf', 'audio', 'video', 'other');
    END IF;
END $$;

-- Add new log_action enum values if they don't exist yet
ALTER TYPE log_action ADD VALUE IF NOT EXISTS 'test_reviewed';
ALTER TYPE log_action ADD VALUE IF NOT EXISTS 'resource_reviewed';
ALTER TYPE log_action ADD VALUE IF NOT EXISTS 'change_reverted';

-- ─────────────────────────────────────────────
-- STEP 2: oauth_accounts table
-- Referenced in users.queries.js (upsertGoogleUser)
-- NOT present in any migration file!
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS oauth_accounts (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider            oauth_provider  NOT NULL,
    provider_user_id    VARCHAR(255)    NOT NULL,
    provider_email      VARCHAR(255),
    access_token        TEXT,
    refresh_token       TEXT,
    token_expires_at    TIMESTAMPTZ,
    raw_profile         JSONB,
    linked_at           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_provider_uid ON oauth_accounts(provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_user          ON oauth_accounts(user_id);

DROP TRIGGER IF EXISTS trg_oauth_accounts_updated_at ON oauth_accounts;
CREATE TRIGGER trg_oauth_accounts_updated_at
    BEFORE UPDATE ON oauth_accounts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- STEP 3: Fix password_history column discrepancy
-- migration 004 used "hash" but SDD + pwd.queries.js use "hash" too (OK)
-- BUT changed_from_ip is NOT NULL in 004 — relax it here since IP may be absent
-- ─────────────────────────────────────────────
ALTER TABLE password_history
    ALTER COLUMN changed_from_ip DROP NOT NULL;

-- ─────────────────────────────────────────────
-- STEP 4: test_attempts table
-- Referenced in submission.service.js (submitObjectiveTest)
-- NOT present in any migration file (shared_context.md has it)!
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_attempts (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_id      UUID        NOT NULL REFERENCES mock_tests(id) ON DELETE CASCADE,
    mode         test_mode   NOT NULL DEFAULT 'timed',
    started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    band_score   NUMERIC(3,1) CHECK (band_score BETWEEN 0 AND 9),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attempts_user ON test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test ON test_attempts(test_id);

-- ─────────────────────────────────────────────
-- STEP 5: question_answers table
-- Referenced in submission.service.js (submitObjectiveTest, getSubmissionResult)
-- NOT present in any migration file!
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS question_answers (
    id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id   UUID    NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
    question_id  UUID    NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    given_answer TEXT,
    is_correct   BOOLEAN,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_question_answers_attempt ON question_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_question_answers_question ON question_answers(question_id);

-- ─────────────────────────────────────────────
-- STEP 6: writing_submissions table
-- Referenced in submission.service.js (submitWriting, getFeedback)
-- NOT present in any migration file!
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS writing_submissions (
    id            UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_id       UUID              REFERENCES mock_tests(id) ON DELETE SET NULL,
    task_number   SMALLINT          CHECK (task_number IN (1, 2)),
    prompt_text   TEXT,
    response_text TEXT              NOT NULL,
    file_url      TEXT,
    grader        grader_type,
    status        submission_status NOT NULL DEFAULT 'pending',
    submitted_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    created_at    TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_writing_user   ON writing_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_writing_status ON writing_submissions(status);

-- ─────────────────────────────────────────────
-- STEP 7: speaking_submissions table
-- Referenced in submission.service.js (submitSpeaking, getFeedback)
-- NOT present in any migration file (003_speaking_attempts.sql is .bak)!
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS speaking_submissions (
    id           UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_id      UUID              REFERENCES mock_tests(id) ON DELETE SET NULL,
    part_number  SMALLINT          CHECK (part_number IN (1, 2, 3)),
    prompt_text  TEXT,
    audio_url    TEXT              NOT NULL,
    transcript   TEXT,
    grader       grader_type,
    status       submission_status NOT NULL DEFAULT 'pending',
    submitted_at TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_speaking_user   ON speaking_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_speaking_status ON speaking_submissions(status);

-- ─────────────────────────────────────────────
-- STEP 8: speaking_attempts + speaking_attempt_answers
-- Referenced in submission.service.js (createAttempt)
-- Was in 003_speaking_attempts.sql.bak — never actually applied!
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS speaking_attempts (
    id           UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_id      UUID              REFERENCES mock_tests(id) ON DELETE SET NULL,
    status       VARCHAR(30)       NOT NULL DEFAULT 'in_progress',
    -- Values: 'in_progress' | 'submitted' | 'ai_graded' | 'tutor_graded' | 'reviewed'
    grader       grader_type,
    submitted_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_speaking_attempts_user_status
    ON speaking_attempts(user_id, status);

DROP TRIGGER IF EXISTS trg_speaking_attempts_updated_at ON speaking_attempts;
CREATE TRIGGER trg_speaking_attempts_updated_at
    BEFORE UPDATE ON speaking_attempts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS speaking_attempt_answers (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id       UUID          NOT NULL REFERENCES speaking_attempts(id) ON DELETE CASCADE,
    part_number      SMALLINT      NOT NULL CHECK (part_number IN (1, 2, 3)),
    question_index   SMALLINT      NOT NULL,
    audio_url        TEXT          NOT NULL,
    temp_s3_key      TEXT,
    duration_seconds SMALLINT,
    status           VARCHAR(20)   NOT NULL DEFAULT 'uploaded',
    -- Values: 'uploading' | 'uploaded' | 'failed'
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (attempt_id, part_number, question_index)
);

CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt
    ON speaking_attempt_answers(attempt_id, part_number, question_index);

-- ─────────────────────────────────────────────
-- STEP 9: ai_grading_reports table
-- Referenced in submission.service.js (getFeedback)
-- The SDD has "ai_feedback_reports" but service queries "ai_grading_reports"
-- with columns: submission_id, submission_type
-- Creating the actual table the code expects:
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_grading_reports (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id       UUID        NOT NULL,   -- FK to writing_submissions OR speaking_submissions
    submission_type     VARCHAR(20) NOT NULL CHECK (submission_type IN ('writing', 'speaking')),
    band_score          NUMERIC(3,1),
    task_achievement_score NUMERIC(3,1),
    coherence_score     NUMERIC(3,1),
    lexical_score       NUMERIC(3,1),
    grammar_score       NUMERIC(3,1),
    fluency_score       NUMERIC(3,1),
    pronunciation_score NUMERIC(3,1),
    error_highlights    JSONB,
    suggestions         TEXT,
    raw_ai_response     JSONB,
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_grading_submission
    ON ai_grading_reports(submission_id, submission_type);

-- ─────────────────────────────────────────────
-- STEP 10: tutor_grading_reports table
-- Referenced in submission.service.js (getFeedback)
-- The SDD has "tutor_feedback_reports" but service queries "tutor_grading_reports"
-- with columns: submission_id, submission_type
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tutor_grading_reports (
    id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id               UUID        REFERENCES users(id) ON DELETE SET NULL,
    submission_id          UUID        NOT NULL,   -- FK to writing_submissions OR speaking_submissions
    submission_type        VARCHAR(20) NOT NULL CHECK (submission_type IN ('writing', 'speaking')),
    band_score             NUMERIC(3,1),
    task_achievement_score NUMERIC(3,1),
    coherence_score        NUMERIC(3,1),
    lexical_score          NUMERIC(3,1),
    grammar_score          NUMERIC(3,1),
    fluency_score          NUMERIC(3,1),
    pronunciation_score    NUMERIC(3,1),
    written_feedback       TEXT,
    audio_feedback_url     TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutor_grading_submission
    ON tutor_grading_reports(submission_id, submission_type);

DROP TRIGGER IF EXISTS trg_tutor_grading_reports_updated_at ON tutor_grading_reports;
CREATE TRIGGER trg_tutor_grading_reports_updated_at
    BEFORE UPDATE ON tutor_grading_reports
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- STEP 11: audit_logs undo columns
-- Migration 011_patch_audit_logs_undo.sql adds these — ensure they exist
-- (Idempotent via ADD COLUMN IF NOT EXISTS)
-- ─────────────────────────────────────────────
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS can_undo   BOOLEAN   NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS undone_at  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS undone_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS undo_log_id UUID REFERENCES audit_logs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_undone_at ON audit_logs(undone_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_can_undo  ON audit_logs(can_undo);

-- ─────────────────────────────────────────────
-- STEP 12: mock_tests review_status + submitted_at + audio_url columns
-- From migrations 011_add_content_review + 013_add_listening_audio_support
-- ─────────────────────────────────────────────
ALTER TABLE mock_tests
    ADD COLUMN IF NOT EXISTS review_status review_status NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS submitted_at  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS audio_url     TEXT;

CREATE INDEX IF NOT EXISTS idx_mock_tests_review_status ON mock_tests(review_status);

-- ─────────────────────────────────────────────
-- STEP 13: library_resources review_status + category columns
-- From migrations 011_add_content_review + 012_create_library_resources
-- ─────────────────────────────────────────────
ALTER TABLE library_resources
    ADD COLUMN IF NOT EXISTS review_status review_status NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS category      VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_library_resources_review_status ON library_resources(review_status);
CREATE INDEX IF NOT EXISTS idx_library_category ON library_resources(category);

-- ─────────────────────────────────────────────
-- STEP 14: question_blocks.content column
-- From migration 014_add_block_content.sql
-- ─────────────────────────────────────────────
ALTER TABLE question_blocks
    ADD COLUMN IF NOT EXISTS content TEXT;

-- ─────────────────────────────────────────────
-- STEP 15: questions extra columns
-- From migration 009: block_id, correct_answers
-- ─────────────────────────────────────────────
ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS block_id       UUID REFERENCES question_blocks(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS correct_answers JSONB;

-- Make question_text and correct_answer nullable (they can be null for blocks)
ALTER TABLE questions
    ALTER COLUMN question_text  DROP NOT NULL,
    ALTER COLUMN correct_answer DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_questions_block ON questions(block_id);

-- ─────────────────────────────────────────────
-- STEP 16: user_sessions oauth columns + last_active_at
-- From migration 010_patch_sessions_add_oauth.sql
-- ─────────────────────────────────────────────
ALTER TABLE user_sessions
    ADD COLUMN IF NOT EXISTS is_oauth       BOOLEAN       NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS oauth_provider oauth_provider,
    ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ   NOT NULL DEFAULT NOW();

-- Rebuild view v_active_sessions to include oauth + user info
DROP VIEW IF EXISTS v_active_sessions CASCADE;
CREATE VIEW v_active_sessions AS
SELECT
    s.id,
    s.user_id,
    u.email,
    u.full_name,
    s.ip_address,
    s.user_agent,
    s.is_oauth,
    s.oauth_provider,
    s.last_active_at,
    s.expires_at,
    s.session_token,
    s.created_at
FROM user_sessions s
JOIN users u ON u.id = s.user_id
WHERE s.revoked_at IS NULL
  AND s.expires_at > NOW();

-- ─────────────────────────────────────────────
-- STEP 17: library_resources trigger
-- ─────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_library_resources_updated_at'
    ) THEN
        CREATE TRIGGER trg_library_resources_updated_at
            BEFORE UPDATE ON library_resources
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END;
$$;

-- ─────────────────────────────────────────────
-- STEP 18: email_verified_at column on users
-- SDD schema has it but migration 002 does not!
-- ─────────────────────────────────────────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- ─────────────────────────────────────────────
-- DONE
-- ─────────────────────────────────────────────
