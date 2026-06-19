-- Migration: Backfill undo eligibility for existing user role/status audit logs.
-- Existing rows created before 011_patch_audit_logs_undo.sql have can_undo = FALSE.

UPDATE audit_logs
SET can_undo = TRUE
WHERE undone_at IS NULL
  AND target_table = 'users'
  AND action = 'role_changed'
  AND old_value ? 'role'
  AND new_value ? 'role';

UPDATE audit_logs
SET can_undo = TRUE
WHERE undone_at IS NULL
  AND target_table = 'users'
  AND action IN ('user_updated', 'user_deactivated')
  AND old_value ? 'status'
  AND new_value ? 'status';
