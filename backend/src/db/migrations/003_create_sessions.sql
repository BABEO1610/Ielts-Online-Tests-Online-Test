-- Migration: Bảng user_sessions (T004)
-- Description: Khởi tạo bảng user_sessions, trigger updated_at và view v_active_sessions.

-- EARS[Ubiquitous]: THE system SHALL log all account state modifications... (This applies more to audit, but we need EARS tags)
-- EARS[Event]: WHEN a User submits valid credentials... THE system SHALL create a new record in user_sessions, generate an Access Token & Refresh Token (linked to session_token).
-- EARS[Event]: WHEN a User calls the Logout API, THE system SHALL update revoked_at = NOW() for the corresponding user_sessions record.
-- EARS[Unwanted]: WHERE a User successfully logs in but already has >= 3 active sessions, THE system SHALL automatically set revoked_at = NOW() for the oldest session (based on last_active_at) before creating a new session.

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    revoked_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tạo trigger tự động cập nhật updated_at
DROP TRIGGER IF EXISTS trg_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER trg_user_sessions_updated_at
BEFORE UPDATE ON user_sessions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- EARS[State-driven]: WHILE a request passes through the Authenticated Middleware, THE system SHALL decode the JWT and match the session_token against user_sessions. If revoked_at IS NOT NULL OR expires_at < NOW() OR user status != 'active', deny access.
-- Tạo view v_active_sessions để query các session hợp lệ dễ dàng
DROP VIEW IF EXISTS v_active_sessions CASCADE;
CREATE VIEW v_active_sessions AS
SELECT *
FROM user_sessions
WHERE revoked_at IS NULL AND expires_at > NOW();
