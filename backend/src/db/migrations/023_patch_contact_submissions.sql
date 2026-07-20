-- ============================================================
-- Migration 023: Patch contact_submissions — add missing columns
-- Created: 2026-07-06
-- Reason: Bảng contact_submissions hiện chỉ có schema SDD cũ
--         (resolved BOOLEAN). Code trong contacts.queries.js và
--         support.queries.js đang dùng các cột mới chưa tồn tại:
--         status, reply_message, admin_notes, assigned_to_id, resolved_at
-- Fix:    ADD COLUMN IF NOT EXISTS (idempotent) + DROP cột resolved cũ
-- ============================================================

-- 1. Thêm cột status thay thế cho resolved BOOLEAN
ALTER TABLE contact_submissions
    ADD COLUMN IF NOT EXISTS status       VARCHAR(50)  NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS reply_message TEXT,
    ADD COLUMN IF NOT EXISTS admin_notes   TEXT,
    ADD COLUMN IF NOT EXISTS assigned_to_id UUID        REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS resolved_at   TIMESTAMPTZ;

-- 2. Migrate dữ liệu cũ: resolved=true → status='resolved' (chỉ nếu cột còn tồn tại)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_submissions' AND column_name = 'resolved'
  ) THEN
    UPDATE contact_submissions
    SET status = 'resolved', resolved_at = created_at
    WHERE resolved = TRUE AND status = 'pending';
  END IF;
END;
$$;

-- 3. Xóa cột resolved cũ (thay bằng status VARCHAR)
ALTER TABLE contact_submissions
    DROP COLUMN IF EXISTS resolved;

-- 4. Indexes để tối ưu query
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email  ON contact_submissions(email);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
