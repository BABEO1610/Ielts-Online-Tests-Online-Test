-- Keep library metadata auditable while allowing the physical object to be removed.
ALTER TABLE library_resources
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_library_resources_active_uploader
  ON library_resources(uploaded_by, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_library_resources_active_public
  ON library_resources(review_status, is_published, updated_at DESC)
  WHERE deleted_at IS NULL;
