-- ─────────────────────────────────────────────
-- 016. ADD SPEAKING GROUP ID
-- ─────────────────────────────────────────────
ALTER TABLE speaking_submissions ADD COLUMN IF NOT EXISTS speaking_group_id UUID;
