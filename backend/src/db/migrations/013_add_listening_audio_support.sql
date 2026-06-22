-- 013_add_listening_audio_support.sql
-- Migration: Add support for single audio file per listening test
-- Ratified: 2026-06-19
-- Context: IELTS Listening tests use ONE audio file for all 4 sections

-- ============================================================
-- ADD audio_url TO mock_tests TABLE
-- ============================================================
-- This field stores the single audio file URL for listening tests
-- For reading/writing tests, this field should be NULL

ALTER TABLE mock_tests 
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- ============================================================
-- INDEX COMMENTED OUT
-- ============================================================
-- Cannot create index on TEXT column that may contain large base64 data URLs
-- PostgreSQL B-tree index has max entry size of ~8KB
-- Base64 audio data can be 5-10MB
-- 
-- If needed in future (after moving to Supabase Storage URLs):
-- CREATE INDEX IF NOT EXISTS idx_mock_tests_audio 
-- ON mock_tests(audio_url) 
-- WHERE audio_url IS NOT NULL;
-- ============================================================

-- ============================================================
-- UPDATE COLUMN COMMENTS FOR CLARITY
-- ============================================================
-- Clarify how test_passages.instruction is used differently
-- for listening vs reading tests

COMMENT ON COLUMN test_passages.instruction IS 
'For listening tests: JSONB metadata containing section info like {"show_transcript": true, "start_time": 0, "end_time": 330}. For reading tests: HTML/text instruction for the passage.';

COMMENT ON COLUMN test_passages.content IS
'For listening tests: transcript text for the section. For reading tests: the passage content/text to read.';

COMMENT ON COLUMN mock_tests.audio_url IS 
'For listening tests only: single audio file URL (Supabase Storage public URL) for the entire test containing all 4 sections. Should be NULL for reading/writing/speaking tests.';

-- ============================================================
-- VALIDATION: Ensure listening tests have audio_url
-- ============================================================
-- Add a check constraint (can be dropped if too restrictive during dev)
-- ALTER TABLE mock_tests 
-- ADD CONSTRAINT chk_listening_has_audio 
-- CHECK (
--   (skill != 'listening' OR audio_url IS NOT NULL)
-- );
-- Note: Commented out to allow draft creation, enforce in application layer

