-- ============================================================
-- Migration: Add Content Review Fields
-- ============================================================

-- 1. Create review_status ENUM
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');

-- 2. Modify mock_tests
ALTER TABLE mock_tests
ADD COLUMN review_status review_status NOT NULL DEFAULT 'pending',
ADD COLUMN submitted_at TIMESTAMPTZ;

-- Create index for faster filtering
CREATE INDEX idx_mock_tests_review_status ON mock_tests(review_status);

-- 3. Modify library_resources
ALTER TABLE library_resources
ADD COLUMN review_status review_status NOT NULL DEFAULT 'pending';

-- Create index for faster filtering
CREATE INDEX idx_library_resources_review_status ON library_resources(review_status);

-- 4. Add values to log_action enum
ALTER TYPE log_action ADD VALUE IF NOT EXISTS 'test_reviewed';
ALTER TYPE log_action ADD VALUE IF NOT EXISTS 'resource_reviewed';
