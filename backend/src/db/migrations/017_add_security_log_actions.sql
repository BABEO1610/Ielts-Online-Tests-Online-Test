-- 017_add_security_log_actions.sql
-- Thêm các giá trị mới vào enum log_action để hỗ trợ ghi nhật ký bảo mật

ALTER TYPE log_action ADD VALUE IF NOT EXISTS 'account_locked';
ALTER TYPE log_action ADD VALUE IF NOT EXISTS 'password_changed_by_admin';
ALTER TYPE log_action ADD VALUE IF NOT EXISTS 'permission_denied';
ALTER TYPE log_action ADD VALUE IF NOT EXISTS 'change_reverted';
