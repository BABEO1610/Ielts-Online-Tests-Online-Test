-- Migration: Token Tables (T006)
-- Description: Tạo bảng email_verification_tokens và password_reset_tokens

-- Bảng email_verification_tokens
-- EARS[Event]: WHEN a Guest submits a Registration form (Email does not exist), THE system SHALL create a new user (status = 'pending', role = 'student'), generate a token in email_verification_tokens, and send a verification email.
-- EARS[Event]: WHEN a Guest accesses a valid verification link (< 24h), THE system SHALL update status = 'active', record used_at = NOW(), and redirect to the Login page.
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bảng password_reset_tokens
-- EARS[Event]: WHEN a Guest requests a password reset, THE system SHALL create a Reset Token (expires in 1 hour) in password_reset_tokens and email the link.
-- EARS[Event]: WHEN a Guest submits a new password via a valid reset link, THE system SHALL update password_hash and set used_at = NOW().
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ▼ DOWN
-- DROP TABLE IF EXISTS password_reset_tokens;
-- DROP TABLE IF EXISTS email_verification_tokens;
