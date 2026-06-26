-- 018_add_tutor_log_actions.sql
-- Thêm các giá trị mới vào enum log_action để hỗ trợ ghi nhật ký hoạt động cho Tutor

ALTER TYPE log_action ADD VALUE IF NOT EXISTS 'submission_graded';
ALTER TYPE log_action ADD VALUE IF NOT EXISTS 'submission_drafted';
ALTER TYPE log_action ADD VALUE IF NOT EXISTS 'private_note_added';
