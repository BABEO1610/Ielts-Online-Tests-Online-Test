-- Migration 024: Persist Global IELTS Assistant chat history.
-- Keeps fresh databases aligned with shared_context.md and the assistant repository.

CREATE TABLE IF NOT EXISTS chatbot_sessions (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferred_address VARCHAR(60),
    started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at          TIMESTAMPTZ
);

ALTER TABLE chatbot_sessions
    ADD COLUMN IF NOT EXISTS preferred_address VARCHAR(60);

CREATE TABLE IF NOT EXISTS chatbot_messages (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID        NOT NULL REFERENCES chatbot_sessions(id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT        NOT NULL,
    tokens_used INT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE chatbot_messages
    ADD COLUMN IF NOT EXISTS rating VARCHAR(10),
    ADD COLUMN IF NOT EXISTS rating_reason TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
    ALTER TABLE chatbot_messages
        ADD CONSTRAINT chk_chatbot_messages_rating
        CHECK (rating IS NULL OR rating IN ('up', 'down'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_user_started
    ON chatbot_sessions(user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_chatbot_msg_session
    ON chatbot_messages(session_id, created_at);

DROP TRIGGER IF EXISTS trg_chatbot_messages_updated_at ON chatbot_messages;
CREATE TRIGGER trg_chatbot_messages_updated_at
    BEFORE UPDATE ON chatbot_messages
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
