-- 014_patch_attempts_add_columns.sql
-- Bảng test_attempts đã tồn tại trong DB với schema cũ (spec gốc).
-- Migration này thêm các cột cần thiết cho hệ thống chấm điểm mới.

-- Thêm cột vào test_attempts nếu chưa có
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS status       VARCHAR(20)  NOT NULL DEFAULT 'completed';
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS raw_score    INT          NOT NULL DEFAULT 0;
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS total_questions INT        NOT NULL DEFAULT 0;
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS time_spent   INT;
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS practice_mode BOOLEAN     NOT NULL DEFAULT FALSE;

-- submitted_at đã tồn tại trong schema gốc (tên đúng)
-- band_score đã tồn tại trong schema gốc
-- created_at đã tồn tại trong schema gốc

-- Tạo attempt_answers nếu chưa tồn tại (có thể chưa có trong schema gốc)
CREATE TABLE IF NOT EXISTS attempt_answers (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id       UUID        NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
  question_id      UUID        NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_order   INT         NOT NULL,
  user_answer      TEXT,
  is_correct       BOOLEAN     NOT NULL DEFAULT FALSE,
  correct_answer   TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attempts_user_id   ON test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test_id   ON test_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_submitted ON test_attempts(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_question ON attempt_answers(question_id);
