-- Migration: Procedure handle_successful_login (T009)
-- Description: DB Function reset failed_login_attempts về 0, cập nhật last_login_at, giải phóng khóa (nếu có).

-- EARS[Event]: WHEN a User submits valid credentials and the account is active, THE system SHALL call the DB function handle_successful_login()
-- EARS[State-driven]: Tự động chuyển status = 'active' chỉ khi status đang là 'inactive', bảo vệ nguyên vẹn các trạng thái khác.

CREATE OR REPLACE FUNCTION handle_successful_login(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET 
        failed_login_attempts = 0,
        last_login_at = NOW(),
        locked_until = NULL,
        status = CASE 
            WHEN status = 'inactive' THEN 'active'::account_status 
            ELSE status 
        END
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;
