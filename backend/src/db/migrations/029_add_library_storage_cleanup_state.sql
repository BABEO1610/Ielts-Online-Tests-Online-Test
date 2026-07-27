ALTER TABLE library_resources
  ADD COLUMN IF NOT EXISTS storage_cleanup_pending BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_library_storage_cleanup_pending
  ON library_resources(updated_at)
  WHERE storage_cleanup_pending = TRUE;
