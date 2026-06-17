-- 009_create_tests_schema.sql

-- mock_tests table
CREATE TABLE IF NOT EXISTS mock_tests (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title            VARCHAR(500) NOT NULL,
    description      TEXT,
    skill            skill_type  NOT NULL,
    difficulty       difficulty  NOT NULL DEFAULT 'intermediate',
    duration_minutes INT,
    is_published     BOOLEAN     NOT NULL DEFAULT FALSE,
    publish_at       TIMESTAMPTZ,
    created_by       UUID        REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- passages table (specific for Reading tests, maybe Listening too)
CREATE TABLE IF NOT EXISTS test_passages (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id          UUID        NOT NULL REFERENCES mock_tests(id) ON DELETE CASCADE,
    passage_number   INT         NOT NULL,
    title            VARCHAR(500),
    instruction      TEXT,
    content          TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (test_id, passage_number)
);

-- question_blocks table (grouping questions by type/range)
CREATE TABLE IF NOT EXISTS question_blocks (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    passage_id       UUID        NOT NULL REFERENCES test_passages(id) ON DELETE CASCADE,
    block_order      INT         NOT NULL,
    question_type    VARCHAR(100) NOT NULL,
    question_range   VARCHAR(50),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- questions table
CREATE TABLE IF NOT EXISTS questions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id         UUID        NOT NULL REFERENCES mock_tests(id) ON DELETE CASCADE,
    question_order  INT         NOT NULL,
    question_text   TEXT,
    options         JSONB,
    correct_answer  TEXT,         -- Single text or JSONB for multiple possible correct answers
    explanation     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (test_id, question_order)
);

-- Alter questions to support question blocks
ALTER TABLE questions ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES question_blocks(id) ON DELETE CASCADE;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS correct_answers JSONB;
-- make question_text, correct_answer nullable if they were NOT NULL
ALTER TABLE questions ALTER COLUMN question_text DROP NOT NULL;
ALTER TABLE questions ALTER COLUMN correct_answer DROP NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mock_tests_skill ON mock_tests(skill);
CREATE INDEX IF NOT EXISTS idx_test_passages_test ON test_passages(test_id);
CREATE INDEX IF NOT EXISTS idx_question_blocks_passage ON question_blocks(passage_id);
CREATE INDEX IF NOT EXISTS idx_questions_test ON questions(test_id);
CREATE INDEX IF NOT EXISTS idx_questions_block ON questions(block_id);

-- Trigger for updated_at (mock_tests, questions already handled if they existed, but CREATE OR REPLACE TRIGGER works or we can just skip if it throws. Wait, postgres 13+ doesn't have CREATE OR REPLACE TRIGGER, so let's do safe drops)
DROP TRIGGER IF EXISTS trg_mock_tests_updated_at ON mock_tests;
CREATE TRIGGER trg_mock_tests_updated_at BEFORE UPDATE ON mock_tests FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_test_passages_updated_at ON test_passages;
CREATE TRIGGER trg_test_passages_updated_at BEFORE UPDATE ON test_passages FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_question_blocks_updated_at ON question_blocks;
CREATE TRIGGER trg_question_blocks_updated_at BEFORE UPDATE ON question_blocks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_questions_updated_at ON questions;
CREATE TRIGGER trg_questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
