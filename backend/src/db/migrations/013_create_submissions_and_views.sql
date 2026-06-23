-- 013_create_submissions_and_views.sql

-- ─────────────────────────────────────────────
-- 10. TEST ATTEMPTS
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

-- ─────────────────────────────────────────────
-- 11. QUESTION ANSWERS
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

-- ─────────────────────────────────────────────
-- 12. WRITING SUBMISSIONS
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

-- ─────────────────────────────────────────────
-- 13. SPEAKING SUBMISSIONS
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

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attempts_user           ON test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test           ON test_attempts(test_id);

CREATE INDEX IF NOT EXISTS idx_writing_user            ON writing_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_writing_status          ON writing_submissions(status);

CREATE INDEX IF NOT EXISTS idx_speaking_user           ON speaking_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_speaking_status         ON speaking_submissions(status);

-- ─────────────────────────────────────────────
-- Tutor grading queue (TUT-01) VIEW
-- ─────────────────────────────────────────────
-- Removed view definition v_tutor_grading_queue (now handled by UNION in service)
-- CREATE OR REPLACE VIEW v_tutor_grading_queue AS
-- SELECT 'writing' AS submission_type,
--        ws.id     AS submission_id,
--        ws.user_id AS student_id,
--        u.full_name AS student_name,
--        ws.submitted_at,
--        ws.status,
--        ws.grader
-- FROM writing_submissions ws
-- JOIN users u ON u.id = ws.user_id
-- WHERE ws.status = 'pending' AND ws.grader = 'tutor'
-- UNION ALL
-- SELECT 'speaking',
--        ss.id,
--        ss.user_id,
--        u.full_name,
--        ss.submitted_at,
--        ss.status,
--        ss.grader
-- FROM speaking_submissions ss
-- JOIN users u ON u.id = ss.user_id
-- WHERE ss.status = 'pending' AND ss.grader = 'tutor';
