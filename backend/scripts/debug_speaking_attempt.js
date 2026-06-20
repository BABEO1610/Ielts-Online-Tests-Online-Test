const { pool } = require('../src/db/pool');

async function main() {
  const checks = {};

  checks.tables = (await pool.query(`
    SELECT
      to_regclass('public.speaking_attempts') AS speaking_attempts,
      to_regclass('public.speaking_answers') AS speaking_answers,
      to_regclass('public.speaking_attempt_answers') AS speaking_attempt_answers,
      to_regclass('public.mock_tests') AS mock_tests
  `)).rows[0];

  checks.attempt_cols = (await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'speaking_attempts'
    ORDER BY ordinal_position
  `)).rows;

  checks.answer_cols = (await pool.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('speaking_answers', 'speaking_attempt_answers')
    ORDER BY table_name, ordinal_position
  `)).rows;

  checks.mock_tests_cols = (await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mock_tests'
    ORDER BY ordinal_position
  `)).rows;

  checks.speaking_tests = (await pool.query(`
    SELECT id, title, skill, is_published
    FROM mock_tests
    WHERE skill = 'speaking'
    ORDER BY created_at DESC
    LIMIT 10
  `)).rows;

  console.log(JSON.stringify(checks, null, 2));
}

main()
  .catch((error) => {
    console.error('DB_CHECK_ERROR', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      query: error.query,
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
