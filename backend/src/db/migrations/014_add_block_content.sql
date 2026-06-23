-- 014_add_block_content.sql
ALTER TABLE question_blocks ADD COLUMN IF NOT EXISTS content TEXT;
