-- EARS[Ubiquitous]: THE system SHALL create the necessary ENUM types for the database.
-- EARS[Event]: WHEN running database setup, THE system SHALL create user_role, account_status, password_change_reason, and log_action.

DO $$
BEGIN
    -- user_role Enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'student', 'tutor', 'admin');
    END IF;

    -- account_status Enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
        CREATE TYPE account_status AS ENUM ('pending', 'active', 'inactive', 'banned');
    END IF;

    -- password_change_reason Enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'password_change_reason') THEN
        CREATE TYPE password_change_reason AS ENUM ('user_initiated', 'reset_via_email', 'forced_default', 'admin_reset');
    END IF;

    -- log_action Enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'log_action') THEN
        CREATE TYPE log_action AS ENUM (
            'user_created', 'user_updated', 'role_changed', 'user_deactivated', 
            'user_deleted', 'test_created', 'test_updated', 'test_deleted', 
            'answer_key_updated', 'resource_uploaded', 'resource_deleted', 
            'login', 'logout', 'login_failed', 'password_changed', 
            'password_reset_requested', 'oauth_linked', 'oauth_unlinked'
        );
    END IF;
END $$;
