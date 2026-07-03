-- 020_add_tutor_assigned_log_action.sql
-- Thêm action 'tutor_assigned' vào enum log_action để phân biệt rõ hành động
-- phân công giảng viên cho submission khỏi hành động cập nhật user thông thường.
-- Tuân thủ SEC-03: không dùng string concat, chỉ ADD VALUE vào enum hiện có.
ALTER TYPE log_action ADD VALUE IF NOT EXISTS 'tutor_assigned';
