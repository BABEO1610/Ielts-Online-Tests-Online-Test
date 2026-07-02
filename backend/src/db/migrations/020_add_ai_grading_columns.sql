-- ─────────────────────────────────────────────
-- Migration 020: Add columns to ai_grading_reports for AI Writing Grading
-- Purpose: Support detailed AI feedback storage, error tracking, computed band
-- Safety: ADD COLUMN IF NOT EXISTS only. No destructive statements.
-- ─────────────────────────────────────────────

-- Report-level status (completed/failed), distinct from submission_status enum
ALTER TABLE ai_grading_reports
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed';

-- Detailed AI feedback fields
ALTER TABLE ai_grading_reports
  ADD COLUMN IF NOT EXISTS improved_version TEXT;

ALTER TABLE ai_grading_reports
  ADD COLUMN IF NOT EXISTS prompt_version VARCHAR(50);

ALTER TABLE ai_grading_reports
  ADD COLUMN IF NOT EXISTS model_name VARCHAR(100);

ALTER TABLE ai_grading_reports
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Structured feedback/criteria as JSONB for rich AI response
ALTER TABLE ai_grading_reports
  ADD COLUMN IF NOT EXISTS criteria_json JSONB;

ALTER TABLE ai_grading_reports
  ADD COLUMN IF NOT EXISTS feedback_json JSONB;

-- Backend-computed overall band from 4 criteria average
ALTER TABLE ai_grading_reports
  ADD COLUMN IF NOT EXISTS computed_band NUMERIC(3,1);

-- Warning if AI overallBand deviates from computed_band by > 0.5
ALTER TABLE ai_grading_reports
  ADD COLUMN IF NOT EXISTS band_validation_warning TEXT;

-- Timestamps (generated_at already exists, add standard created/updated)
ALTER TABLE ai_grading_reports
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE ai_grading_reports
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
