-- 015_update_attempt_status.sql
-- Add support for submitted vs graded status

-- 1. Update status enum to support 'submitted' and 'graded'
ALTER TABLE test_attempts 
DROP CONSTRAINT IF EXISTS check_status;

-- Allow new status values: 'submitted' (pending tutor grading), 'graded' (tutor has graded)
ALTER TABLE test_attempts
ADD CONSTRAINT check_status CHECK (status IN ('in_progress', 'submitted', 'graded', 'completed'));

-- 2. Update comment
COMMENT ON COLUMN test_attempts.status IS 'in_progress | submitted (pending tutor grading) | graded (tutor graded) | completed (legacy)';

-- 3. Create grading_status tracking if needed
-- For now, we use status field. If need separate fields for grading timestamp, add here later.
