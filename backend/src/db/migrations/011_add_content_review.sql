-- ============================================================
-- Migration: Add Content Review Fields
-- ============================================================

-- 1. Create review_status ENUM (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
        CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END $$;

-- 2. Modify mock_tests (idempotent)
ALTER TABLE mock_tests
    ADD COLUMN IF NOT EXISTS review_status review_status NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_mock_tests_review_status ON mock_tests(review_status);

-- 3. Modify library_resources (idempotent)
ALTER TABLE library_resources
    ADD COLUMN IF NOT EXISTS review_status review_status NOT NULL DEFAULT 'pending';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_library_resources_review_status ON library_resources(review_status);

-- 4. Add values to log_action enum
ALTER TYPE log_action ADD VALUE IF NOT EXISTS 'test_reviewed';
ALTER TYPE log_action ADD VALUE IF NOT EXISTS 'resource_reviewed';
