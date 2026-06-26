-- 017_add_writing_group_id.sql
ALTER TABLE writing_submissions 
ADD COLUMN IF NOT EXISTS writing_group_id UUID;

CREATE INDEX IF NOT EXISTS idx_writing_group_id ON writing_submissions(writing_group_id);
