-- 019_add_grading_log_actions.sql
-- Thêm các giá trị mới vào enum log_action để hỗ trợ ghi nhật ký Sửa và Thu hồi điểm

ALTER TYPE log_action ADD VALUE IF NOT EXISTS 'submission_revoked';
ALTER TYPE log_action ADD VALUE IF NOT EXISTS 'submission_regraded';
