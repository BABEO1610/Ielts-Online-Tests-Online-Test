require('dotenv').config({ path: __dirname + '/../../.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function inspectSchema() {
  const tables = [
    'mock_tests',
    'library_resources',
    'test_attempts',
    'questions',
    'question_answers',
    'chatbot_sessions',
    'chatbot_messages'
  ];

  try {
    const result = await pool.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = ANY($1)
      ORDER BY table_name, ordinal_position;
    `, [tables]);

    console.log('--- DB Schema ---');
    result.rows.forEach(row => {
      console.log(`Table: ${row.table_name.padEnd(20)} | Column: ${row.column_name.padEnd(20)} | Type: ${row.data_type.padEnd(20)} | Nullable: ${row.is_nullable}`);
    });
  } catch (error) {
    console.error('Error inspecting schema:', error);
  } finally {
    await pool.end();
  }
}

inspectSchema();
