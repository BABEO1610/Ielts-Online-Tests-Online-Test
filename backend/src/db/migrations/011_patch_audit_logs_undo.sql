-- Migration: Add undo tracking for admin change logs.
-- EARS[Event]: WHEN an Admin reverts a supported change, THE system SHALL mark the source audit log as reverted.

ALTER TYPE log_action ADD VALUE IF NOT EXISTS 'change_reverted';

ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS can_undo BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS undone_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS undone_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS undo_log_id UUID REFERENCES audit_logs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_undone_at ON audit_logs(undone_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_can_undo ON audit_logs(can_undo);
