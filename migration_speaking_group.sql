-- migration_speaking_group.sql
BEGIN;

-- 1. Add speaking_group_id column to speaking_submissions
ALTER TABLE speaking_submissions
ADD COLUMN IF NOT EXISTS speaking_group_id UUID;

-- 2. Create index for fast grouping
CREATE INDEX IF NOT EXISTS idx_speaking_submissions_group
ON speaking_submissions(speaking_group_id);

-- 3. Create unique index to prevent duplicate parts within same group
CREATE UNIQUE INDEX IF NOT EXISTS uq_speaking_group_part
ON speaking_submissions(speaking_group_id, part_number)
WHERE speaking_group_id IS NOT NULL;

-- 4. Replace view v_tutor_grading_queue
CREATE OR REPLACE VIEW v_tutor_grading_queue AS
SELECT
    'writing' AS submission_type,
    ws.id AS submission_id,
    ws.user_id AS student_id,
    u.full_name AS student_name,
    mt.title AS test_title,
    ws.submitted_at,
    ws.status,
    ws.grader,
    NULL::uuid AS speaking_group_id,
    NULL::smallint AS parts_count
FROM writing_submissions ws
JOIN users u ON u.id = ws.user_id
LEFT JOIN mock_tests mt ON mt.id = ws.test_id
WHERE ws.status = 'pending'
  AND ws.grader = 'tutor'

UNION ALL

SELECT
    'speaking' AS submission_type,
    MIN(ss.id) AS submission_id,
    ss.user_id AS student_id,
    u.full_name AS student_name,
    mt.title AS test_title,
    MIN(ss.submitted_at) AS submitted_at,
    'pending'::submission_status AS status,
    ss.grader,
    ss.speaking_group_id,
    COUNT(ss.id)::smallint AS parts_count
FROM speaking_submissions ss
JOIN users u ON u.id = ss.user_id
LEFT JOIN mock_tests mt ON mt.id = ss.test_id
WHERE ss.status = 'pending'
  AND ss.grader = 'tutor'
  AND ss.speaking_group_id IS NOT NULL
GROUP BY
    ss.speaking_group_id,
    ss.user_id,
    u.full_name,
    mt.title,
    ss.grader
HAVING COUNT(ss.id) = 3

ORDER BY submitted_at ASC;

COMMIT;
