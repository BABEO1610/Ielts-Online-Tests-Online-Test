-- 013_create_attempts.sql
-- Lưu lịch sử làm bài (Reading / Listening) của học sinh

-- ── 1. test_attempts ────────────────────────────────────────────────────────────
-- Mỗi lần học sinh nộp bài tạo ra 1 record ở đây.
CREATE TABLE IF NOT EXISTS test_attempts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id          UUID        NOT NULL REFERENCES mock_tests(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status           VARCHAR(20) NOT NULL DEFAULT 'completed', -- 'in_progress' | 'completed'
  raw_score        INT         NOT NULL DEFAULT 0,
  total_questions  INT         NOT NULL DEFAULT 0,
  band_score       NUMERIC(3,1),         -- Tính tự động theo thang IELTS Academic
  time_spent       INT,                  -- Số giây học sinh dùng để làm bài
  practice_mode    BOOLEAN     NOT NULL DEFAULT FALSE, -- TRUE = luyện tập, không tính vào thống kê
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. attempt_answers ──────────────────────────────────────────────────────────
-- Mỗi câu trả lời của học sinh trong 1 attempt.
CREATE TABLE IF NOT EXISTS attempt_answers (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id       UUID        NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
  question_id      UUID        NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_order   INT         NOT NULL,
  user_answer      TEXT,                 -- Đáp án học sinh nhập / chọn
  is_correct       BOOLEAN     NOT NULL DEFAULT FALSE,
  correct_answer   TEXT                  -- Snapshot đáp án đúng tại thời điểm nộp bài
);

-- ── 3. Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attempts_user_id   ON test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test_id   ON test_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_submitted ON test_attempts(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_question ON attempt_answers(question_id);
