-- Migration: Patch user_sessions — thêm các cột OAuth và last_active_at
-- Lý do: Migration 003 thiếu các cột này theo schema chuẩn trong shared_context.md
-- EARS[Event]: WHEN a User logs in via OAuth, THE system SHALL record is_oauth = TRUE and oauth_provider.

-- Thêm cột is_oauth nếu chưa có
ALTER TABLE user_sessions
  ADD COLUMN IF NOT EXISTS is_oauth BOOLEAN NOT NULL DEFAULT FALSE;

-- Thêm cột oauth_provider nếu chưa có
ALTER TABLE user_sessions
  ADD COLUMN IF NOT EXISTS oauth_provider oauth_provider;

-- Thêm cột last_active_at nếu chưa có (auth middleware cập nhật khi user hoạt động)
ALTER TABLE user_sessions
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Drop view cũ trước — PostgreSQL không cho phép CREATE OR REPLACE thay đổi cấu trúc cột.
-- View cũ (migration 003) dùng SELECT * nên cột đầu tiên là session_token, không khớp với view mới JOIN users.
-- CASCADE để tránh block nếu có dependent objects.
DROP VIEW IF EXISTS v_active_sessions CASCADE;

-- Tạo lại view v_active_sessions theo schema đầy đủ trong shared_context.md (JOIN users)
CREATE VIEW v_active_sessions AS
SELECT
  s.id,
  s.user_id,
  u.email,
  u.full_name,
  s.ip_address,
  s.user_agent,
  s.is_oauth,
  s.oauth_provider,
  s.last_active_at,
  s.expires_at,
  s.session_token,
  s.created_at
FROM user_sessions s
JOIN users u ON u.id = s.user_id
WHERE s.revoked_at IS NULL
  AND s.expires_at > NOW();
