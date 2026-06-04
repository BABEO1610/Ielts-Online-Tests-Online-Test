-- Migration: Bảng users (T003)
-- Description: Khởi tạo bảng users và trigger cập nhật updated_at.

-- Tạo function set_updated_at() dùng chung cho toàn hệ thống
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo bảng users
-- EARS[Ubiquitous]: The system SHALL hash all new passwords using the Argon2id algorithm; storing plain-text passwords is STRICTLY PROHIBITED.
-- EARS[Event]: WHEN a Guest submits a Registration form... create a new user (status = 'pending', role = 'student').
-- EARS[Unwanted]: WHERE a User submits a target_band_score outside [0.0, 9.0] or not divisible by 0.5, THE system SHALL return HTTP 400.
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(255),
    role user_role DEFAULT 'student' NOT NULL,
    status account_status DEFAULT 'pending' NOT NULL,
    target_band_score NUMERIC(3, 1) CHECK (
        target_band_score >= 0.0 AND 
        target_band_score <= 9.0 AND 
        CAST(target_band_score * 10 AS INTEGER) % 5 = 0
    ),
    failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    must_change_password BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tạo trigger tự động cập nhật updated_at khi có lệnh UPDATE trên bảng users
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
