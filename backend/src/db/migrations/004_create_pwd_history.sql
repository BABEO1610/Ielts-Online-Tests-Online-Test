-- EARS[Ubiquitous]: THE system SHALL create a table to track password history to prevent password reuse.
-- EARS[Unwanted]: WHERE a User changes their password to one that matches their last 3 hashes in password_history, THE system SHALL return HTTP 400 "Password has been used recently".
-- EARS[Event]: WHEN a Guest submits a new password via a valid reset link or user changes password, THE system SHALL record the hash, reason, and IP.

CREATE TABLE IF NOT EXISTS password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hash VARCHAR(255) NOT NULL,
    reason password_change_reason NOT NULL,
    changed_from_ip INET NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index to optimize querying the last 3 passwords for a user (needed for the unwanted rule)
CREATE INDEX IF NOT EXISTS idx_password_history_user_id_created_at 
ON password_history(user_id, created_at DESC);
