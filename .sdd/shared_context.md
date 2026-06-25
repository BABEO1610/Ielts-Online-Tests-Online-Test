
DB Schema
```-- ============================================================
--  IELTS Platform - PostgreSQL Database Schema
--  Derived from User Stories: Guest, Student, Tutor, Admin, AI
--  v2: Added Auth features (OAuth, sessions, password management)
-- ============================================================

-- ─────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────
CREATE TYPE user_role         AS ENUM ('user', 'student', 'tutor', 'admin');
CREATE TYPE account_status    AS ENUM ('pending', 'active', 'inactive', 'banned');
CREATE TYPE skill_type        AS ENUM ('reading', 'listening', 'writing', 'speaking');
CREATE TYPE difficulty        AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE test_mode         AS ENUM ('timed', 'untimed');
CREATE TYPE submission_status AS ENUM ('pending', 'ai_graded', 'tutor_graded', 'reviewed');
CREATE TYPE grader_type       AS ENUM ('ai', 'tutor');
CREATE TYPE oauth_provider    AS ENUM ('google', 'facebook', 'github');  -- mở rộng sau
CREATE TYPE password_change_reason AS ENUM (
    'user_initiated',       -- người dùng tự đổi
    'reset_via_email',      -- đổi sau forgot password
    'forced_default',       -- đổi password mặc định sau đăng ký
    'admin_reset'           -- admin reset cho user
);
CREATE TYPE log_action AS ENUM (
    'user_created', 'user_updated', 'role_changed',
    'user_deactivated', 'user_deleted',
    'test_created', 'test_updated', 'test_deleted',
    'answer_key_updated', 'resource_uploaded', 'resource_deleted',
    'login', 'logout', 'login_failed',
    'password_changed', 'password_reset_requested',
    'oauth_linked', 'oauth_unlinked'
);

-- ─────────────────────────────────────────────
-- 1. USERS
-- ─────────────────────────────────────────────
-- Thay đổi v2:
--   + password_hash  → nullable (user đăng nhập OAuth thuần không có password)
--   + must_change_password → bắt user đổi pass mặc định sau đăng ký
--   + last_login_at  → theo dõi hoạt động
--   + failed_login_attempts + locked_until → chống brute-force
-- ─────────────────────────────────────────────
CREATE TABLE users (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
email                   VARCHAR(255)    NOT NULL UNIQUE,
    password_hash           TEXT,           -- NULL nếu chỉ dùng OAuth
    role                    user_role       NOT NULL DEFAULT 'student',
    status                  account_status  NOT NULL DEFAULT 'pending',
    full_name               VARCHAR(255),
    avatar_url              TEXT,
    target_band_score       NUMERIC(3,1)    CHECK (target_band_score BETWEEN 0 AND 9),
    email_verified_at       TIMESTAMPTZ,
    -- Auth security
    must_change_password    BOOLEAN         NOT NULL DEFAULT FALSE,
    last_login_at           TIMESTAMPTZ,
    failed_login_attempts   SMALLINT        NOT NULL DEFAULT 0,
    locked_until            TIMESTAMPTZ,    -- tạm khóa khi đăng nhập sai quá nhiều
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 2. EMAIL VERIFICATION TOKENS
-- ─────────────────────────────────────────────
CREATE TABLE email_verification_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT        NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 3. PASSWORD RESET TOKENS  (Forgot Password)
-- ─────────────────────────────────────────────
-- Thay đổi v2: thêm ip_address để audit
-- ─────────────────────────────────────────────
CREATE TABLE password_reset_tokens (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           TEXT        NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    used_at         TIMESTAMPTZ,
    requested_from  INET,       -- IP gửi yêu cầu reset
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 4. PASSWORD CHANGE HISTORY  (NEW - v2)
-- ─────────────────────────────────────────────
-- Lưu lịch sử hash mật khẩu cũ để:
--   - Ngăn người dùng dùng lại mật khẩu cũ (thường block 3-5 lần gần nhất)
--   - Audit khi nào đổi, vì lý do gì
-- ─────────────────────────────────────────────
CREATE TABLE password_history (
id              UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID                    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash   TEXT                    NOT NULL,
    reason          password_change_reason  NOT NULL,
    changed_from_ip INET,
    created_at      TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 5. OAUTH ACCOUNTS  (NEW - v2, Google login...)
-- ─────────────────────────────────────────────
-- Một user có thể liên kết nhiều provider (Google + Facebook)
-- Luồng:
--   Lần đầu login Google → tạo user mới → insert oauth_accounts
--   Lần sau            → tìm oauth_accounts theo (provider, provider_user_id) → lấy user
-- ─────────────────────────────────────────────
CREATE TABLE oauth_accounts (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider            oauth_provider  NOT NULL,
    provider_user_id    VARCHAR(255)    NOT NULL,   -- ID trả về từ Google/Facebook
    provider_email      VARCHAR(255),               -- email từ provider (có thể khác email chính)
    access_token        TEXT,                       -- lưu nếu cần gọi API của provider
    refresh_token       TEXT,
    token_expires_at    TIMESTAMPTZ,
    raw_profile         JSONB,                      -- toàn bộ profile JSON từ provider
    linked_at           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_user_id)             -- mỗi tài khoản provider chỉ link 1 lần
);

-- ─────────────────────────────────────────────
-- 6. USER SESSIONS  (NEW - v2)
-- ─────────────────────────────────────────────
-- Quản lý phiên đăng nhập:
--   - Hỗ trợ "đăng xuất tất cả thiết bị"
--   - Biết user đang login trên thiết bị nào
--   - Revoke token cụ thể khi cần
-- ─────────────────────────────────────────────
CREATE TABLE user_sessions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token   TEXT        NOT NULL UNIQUE,    -- JWT jti hoặc opaque token
    ip_address      INET,
    user_agent      TEXT,                           -- browser / device info
    is_oauth        BOOLEAN     NOT NULL DEFAULT FALSE,
oauth_provider  oauth_provider,                 -- provider nếu login bằng OAuth
    last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,                    -- NULL = còn hợp lệ
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 7. CONTACT FORM SUBMISSIONS
-- ─────────────────────────────────────────────
CREATE TABLE contact_submissions (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    subject     VARCHAR(500),
    message     TEXT         NOT NULL,
    resolved    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 8. MOCK TESTS
-- ─────────────────────────────────────────────
CREATE TABLE mock_tests (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title            VARCHAR(500) NOT NULL,
    description      TEXT,
    skill            skill_type  NOT NULL,
    difficulty       difficulty  NOT NULL DEFAULT 'intermediate',
    duration_minutes INT,
    is_published     BOOLEAN     NOT NULL DEFAULT FALSE,
    publish_at       TIMESTAMPTZ,
    created_by       UUID        REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 9. QUESTIONS
-- ─────────────────────────────────────────────
CREATE TABLE questions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id         UUID        NOT NULL REFERENCES mock_tests(id) ON DELETE CASCADE,
    question_order  INT         NOT NULL,
    question_text   TEXT        NOT NULL,
    options         JSONB,
    correct_answer  TEXT        NOT NULL,
    explanation     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (test_id, question_order)
);

-- ─────────────────────────────────────────────
-- 10. TEST ATTEMPTS
-- ─────────────────────────────────────────────
CREATE TABLE test_attempts (
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
CREATE TABLE question_answers (
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
CREATE TABLE writing_submissions (
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
CREATE TABLE speaking_submissions (
    id                UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_id           UUID              REFERENCES mock_tests(id) ON DELETE SET NULL,
    part_number       SMALLINT          CHECK (part_number IN (1, 2, 3)),
    prompt_text       TEXT,
    audio_url         TEXT              NOT NULL,
    transcript        TEXT,
    grader            grader_type,
    status            submission_status NOT NULL DEFAULT 'pending',
    speaking_group_id UUID,
    submitted_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    created_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 14. AI FEEDBACK REPORTS
-- ─────────────────────────────────────────────
CREATE TABLE ai_feedback_reports (
    id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    writing_submission_id  UUID        REFERENCES writing_submissions(id) ON DELETE CASCADE,
    speaking_submission_id UUID        REFERENCES speaking_submissions(id) ON DELETE CASCADE,
    band_score             NUMERIC(3,1),
    task_achievement_score NUMERIC(3,1),
    coherence_score        NUMERIC(3,1),
    lexical_score          NUMERIC(3,1),
    grammar_score          NUMERIC(3,1),
    fluency_score          NUMERIC(3,1),
    pronunciation_score    NUMERIC(3,1),
    error_highlights       JSONB,
    suggestions            TEXT,
    raw_ai_response        JSONB,
    generated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT one_submission CHECK (
        (writing_submission_id IS NULL) != (speaking_submission_id IS NULL)
    )
);

-- ─────────────────────────────────────────────
-- 15. TUTOR FEEDBACK REPORTS
-- ─────────────────────────────────────────────
CREATE TABLE tutor_feedback_reports (
    id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id               UUID        NOT NULL REFERENCES users(id),
    writing_submission_id  UUID        REFERENCES writing_submissions(id) ON DELETE CASCADE,
    speaking_submission_id UUID        REFERENCES speaking_submissions(id) ON DELETE CASCADE,
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
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT one_submission_tutor CHECK (
        (writing_submission_id IS NULL) != (speaking_submission_id IS NULL)
    )
);

-- ─────────────────────────────────────────────
-- 16. TUTOR PRIVATE NOTES
-- ─────────────────────────────────────────────
CREATE TABLE tutor_student_notes (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 17. DOCUMENT LIBRARY
-- ─────────────────────────────────────────────
CREATE TYPE resource_type AS ENUM ('pdf', 'audio', 'video', 'other');

CREATE TABLE library_resources (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(500)  NOT NULL,
    description     TEXT,
    resource_type   resource_type NOT NULL,
    file_url        TEXT          NOT NULL,
    file_size_bytes BIGINT,
    uploaded_by     UUID          REFERENCES users(id) ON DELETE SET NULL,
    is_published    BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 18. AI CHATBOT SESSIONS & MESSAGES
-- ─────────────────────────────────────────────
CREATE TABLE chatbot_sessions (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at   TIMESTAMPTZ
);

CREATE TABLE chatbot_messages (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID        NOT NULL REFERENCES chatbot_sessions(id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT        NOT NULL,
    tokens_used INT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 19. "EXPLAIN WITH AI" REQUESTS
-- ─────────────────────────────────────────────
CREATE TABLE ai_explain_requests (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id       UUID        NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    tutor_explanation TEXT,
    ai_response       TEXT,
    tokens_used       INT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 20. AUDIT / ACTIVITY LOGS
-- ─────────────────────────────────────────────
CREATE TABLE audit_logs (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
    action       log_action  NOT NULL,
    target_table VARCHAR(100),
    target_id    UUID,
    old_value    JSONB,
new_value    JSONB,
    ip_address   INET,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 21. PLATFORM METRICS SNAPSHOTS
-- ─────────────────────────────────────────────
CREATE TABLE platform_metrics_snapshots (
    id                UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date     DATE  NOT NULL UNIQUE,
    total_users       INT   NOT NULL DEFAULT 0,
    active_tests      INT   NOT NULL DEFAULT 0,
    ai_calls_total    INT   NOT NULL DEFAULT 0,
    ai_tokens_total   BIGINT NOT NULL DEFAULT 0,
    new_registrations INT   NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX idx_users_email             ON users(email);
CREATE INDEX idx_users_role_status       ON users(role, status);
CREATE INDEX idx_users_locked_until      ON users(locked_until) WHERE locked_until IS NOT NULL;

CREATE INDEX idx_oauth_provider_uid      ON oauth_accounts(provider, provider_user_id);
CREATE INDEX idx_oauth_user              ON oauth_accounts(user_id);

CREATE INDEX idx_sessions_token          ON user_sessions(session_token);
CREATE INDEX idx_sessions_user           ON user_sessions(user_id);
CREATE INDEX idx_sessions_active         ON user_sessions(user_id, expires_at)
    WHERE revoked_at IS NULL;

CREATE INDEX idx_pwd_history_user        ON password_history(user_id, created_at DESC);

CREATE INDEX idx_reset_tokens_user       ON password_reset_tokens(user_id);

CREATE INDEX idx_mock_tests_skill        ON mock_tests(skill);
CREATE INDEX idx_mock_tests_publish      ON mock_tests(publish_at) WHERE NOT is_published;

CREATE INDEX idx_questions_test          ON questions(test_id, question_order);

CREATE INDEX idx_attempts_user           ON test_attempts(user_id);
CREATE INDEX idx_attempts_test           ON test_attempts(test_id);

CREATE INDEX idx_writing_user            ON writing_submissions(user_id);
CREATE INDEX idx_writing_status          ON writing_submissions(status);

CREATE INDEX idx_speaking_user           ON speaking_submissions(user_id);
CREATE INDEX idx_speaking_status         ON speaking_submissions(status);
CREATE INDEX idx_speaking_submissions_group ON speaking_submissions(speaking_group_id);
CREATE UNIQUE INDEX uq_speaking_group_part ON speaking_submissions(speaking_group_id, part_number) WHERE speaking_group_id IS NOT NULL;

CREATE INDEX idx_audit_actor             ON audit_logs(actor_id);
CREATE INDEX idx_audit_action            ON audit_logs(action);
CREATE INDEX idx_audit_created           ON audit_logs(created_at DESC);

CREATE INDEX idx_chatbot_msg_session     ON chatbot_messages(session_id, created_at);
CREATE INDEX idx_tests_title_trgm        ON mock_tests USING gin(title gin_trgm_ops);

-- ─────────────────────────────────────────────
-- AUTO-UPDATE updated_at TRIGGER
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$
DECLARE tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'users', 'mock_tests', 'questions',
        'oauth_accounts', 'tutor_feedback_reports',
        'tutor_student_notes', 'library_resources'
    ] LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%I_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
            tbl, tbl
        );
    END LOOP;
END;
$$;

-- ─────────────────────────────────────────────
-- BRUTE-FORCE LOCKOUT FUNCTION
-- Gọi mỗi khi đăng nhập thất bại
-- Sau 5 lần sai → khóa 15 phút
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_failed_login(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    UPDATE users
    SET
        failed_login_attempts = failed_login_attempts + 1,
        locked_until = CASE
            WHEN failed_login_attempts + 1 >= 5
            THEN NOW() + INTERVAL '15 minutes'
            ELSE locked_until
        END
    WHERE id = p_user_id;
END;
$$;

-- Gọi khi đăng nhập thành công → reset counter
CREATE OR REPLACE FUNCTION handle_successful_login(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    UPDATE users
    SET
        failed_login_attempts = 0,
        locked_until          = NULL,
        last_login_at         = NOW()
    WHERE id = p_user_id;
END;
$$;

-- ─────────────────────────────────────────────
-- VIEWS
-- ─────────────────────────────────────────────

-- Student dashboard (STU-12)
CREATE VIEW v_student_dashboard AS
SELECT
    u.id                         AS student_id,
    u.full_name,
    u.target_band_score,
    u.must_change_password,
    COUNT(DISTINCT ta.id)        AS total_attempts,
    ROUND(AVG(ta.band_score), 1) AS avg_band_score,
    MAX(ta.submitted_at)         AS last_attempt_at
FROM users u
LEFT JOIN test_attempts ta ON ta.user_id = u.id AND ta.submitted_at IS NOT NULL
WHERE u.role = 'student'
GROUP BY u.id;

-- Tutor grading queue (TUT-01)
CREATE VIEW v_tutor_grading_queue AS
SELECT 'writing' AS submission_type,
       ws.id     AS submission_id,
       ws.user_id AS student_id,
       u.full_name AS student_name,
       mt.title   AS test_title,
       ws.submitted_at,
       ws.status,
       ws.grader,
       NULL::uuid AS speaking_group_id,
       NULL::smallint AS parts_count
FROM writing_submissions ws
JOIN users u ON u.id = ws.user_id
LEFT JOIN mock_tests mt ON mt.id = ws.test_id
WHERE ws.status = 'pending' AND ws.grader = 'tutor'
UNION ALL
SELECT 'speaking',
       MIN(ss.id),
       ss.user_id,
       u.full_name,
       mt.title,
       MIN(ss.submitted_at),
       'pending'::submission_status,
       ss.grader,
       ss.speaking_group_id,
       COUNT(ss.id)::smallint
FROM speaking_submissions ss
JOIN users u ON u.id = ss.user_id
LEFT JOIN mock_tests mt ON mt.id = ss.test_id
WHERE ss.status = 'pending' AND ss.grader = 'tutor' AND ss.speaking_group_id IS NOT NULL
GROUP BY ss.speaking_group_id, ss.user_id, u.full_name, mt.title, ss.grader
HAVING COUNT(ss.id) = 3
ORDER BY submitted_at ASC;

-- Admin usage report (ADM-05)
CREATE VIEW v_admin_usage_report AS
SELECT
    DATE(u.created_at)           AS day,
    COUNT(DISTINCT u.id)         AS new_users,
    COUNT(DISTINCT ta.id)        AS test_attempts,
    COUNT(DISTINCT cm.id)        AS ai_chat_messages
FROM users u
LEFT JOIN test_attempts ta   ON DATE(ta.created_at)  = DATE(u.created_at)
LEFT JOIN chatbot_messages cm ON DATE(cm.created_at) = DATE(u.created_at)
GROUP BY DATE(u.created_at)
ORDER BY day DESC;

-- Active sessions per user (hữu ích cho "quản lý thiết bị")
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
    s.created_at
FROM user_sessions s
JOIN users u ON u.id = s.user_id
WHERE s.revoked_at IS NULL
  AND s.expires_at > NOW();

```

## Feature-to-Table Mapping

| Feature | Bảng chính | Bảng phụ | View nếu có |
|---|---|---|---|
| Auth & Sessions | `users`, `user_sessions` | `oauth_accounts`, `password_history`, `audit_logs` | `v_active_sessions` |
| Email Verification | `email_verification_tokens` | `users`, `audit_logs` | - |
| Password Reset | `password_reset_tokens` | `users`, `password_history`, `audit_logs` | - |
| Objective Testing | `mock_tests`, `questions`, `test_attempts`, `question_answers` | `users` | `v_student_dashboard` |
| Writing Grading | `writing_submissions`, `ai_feedback_reports`, `tutor_feedback_reports` | `users`, `mock_tests`, `tutor_student_notes` | `v_tutor_grading_queue` |
| Speaking Grading | `speaking_submissions`, `ai_feedback_reports`, `tutor_feedback_reports` | `users`, `mock_tests`, `tutor_student_notes` | `v_tutor_grading_queue` |
| Content Library | `library_resources` | `users`, `audit_logs` | - |
| AI Chatbot | `chatbot_sessions`, `chatbot_messages` | `users`, `platform_metrics_snapshots` | `v_admin_usage_report` |
| AI Explain | `ai_explain_requests` | `users`, `questions` | - |
| Admin Audit | `audit_logs`, `platform_metrics_snapshots` | `users` | `v_admin_usage_report` |
| Global Assistant (General) | `chatbot_sessions`, `chatbot_messages` | `mock_tests`, `library_resources`, `questions`, `users` | `v_active_sessions` |
| Global Assistant (Post-test Review) | `test_attempts`, `questions`, `question_answers` | `users`, `chatbot_sessions`, `chatbot_messages`, `ai_explain_requests` | `v_student_dashboard` |
