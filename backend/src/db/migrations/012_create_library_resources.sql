-- Migration 011: Tạo bảng library_resources + thêm cột category
-- Chú ý: script gốc chưa có cột category — thêm vào đây

-- Tạo enum resource_type nếu chưa tồn tại
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_type') THEN
    CREATE TYPE resource_type AS ENUM ('pdf', 'audio', 'video', 'other');
  END IF;
END;
$$;

-- Tạo bảng library_resources nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS library_resources (
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

-- Thêm cột category nếu chưa tồn tại
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'library_resources' AND column_name = 'category'
  ) THEN
    ALTER TABLE library_resources ADD COLUMN category VARCHAR(100);
  END IF;
END;
$$;

-- Index hỗ trợ filter theo tutor + category
CREATE INDEX IF NOT EXISTS idx_library_uploader
    ON library_resources(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_library_category
    ON library_resources(category);

-- Trigger auto-update updated_at
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
