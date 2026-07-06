-- 022_create_ai_usage_logs.sql
-- Store metadata for real AI provider calls. Do not store prompts or answers here.

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  feature TEXT NOT NULL DEFAULT 'unknown',
  provider TEXT NOT NULL DEFAULT 'gemini',
  model TEXT,
  response_id TEXT,
  entity_type TEXT,
  entity_id TEXT,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  thinking_tokens INTEGER NOT NULL DEFAULT 0,
  cached_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_code TEXT,
  error_message TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_ai_usage_feature CHECK (
    feature IN (
      'writing_grading',
      'speaking_grading',
      'tutor_ai_reference',
      'chatbot',
      'explain_with_ai',
      'unknown'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at
  ON ai_usage_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_feature_created_at
  ON ai_usage_logs(feature, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_created_at
  ON ai_usage_logs(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_success_created_at
  ON ai_usage_logs(success, created_at);
