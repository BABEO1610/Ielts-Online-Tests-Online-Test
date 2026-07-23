-- Khôi phục prerequisite trước khi các migration 009-013 sử dụng chúng.
-- library_resources là bảng legacy đã thuộc migration 012, không phải bảng của feature AI.
-- Migration 011 đang tham chiếu bảng này trước migration 012; vì vậy fresh database cần
-- bootstrap cùng schema gốc tại đây. Database hiện hữu đã có bảng sẽ không bị tạo lại.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty') THEN
    CREATE TYPE difficulty AS ENUM ('beginner', 'intermediate', 'advanced');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'test_mode') THEN
    CREATE TYPE test_mode AS ENUM ('timed', 'untimed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_status') THEN
    CREATE TYPE submission_status AS ENUM ('pending', 'ai_graded', 'tutor_graded', 'reviewed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grader_type') THEN
    CREATE TYPE grader_type AS ENUM ('ai', 'tutor');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'oauth_provider') THEN
    CREATE TYPE oauth_provider AS ENUM ('google', 'facebook', 'github');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_type') THEN
    CREATE TYPE resource_type AS ENUM ('pdf', 'audio', 'video', 'other');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS library_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  resource_type resource_type NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
