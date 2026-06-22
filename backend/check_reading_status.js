const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    // Tất cả đề Reading, kèm review_status
    const r = await pool.query(
      `SELECT id, title, skill, is_published, review_status,
              created_at, submitted_at, publish_at
       FROM mock_tests
       WHERE skill::text = 'reading'
       ORDER BY created_at DESC`
    );
    console.log('=== ALL Reading tests với review_status:');
    console.log(JSON.stringify(r.rows, null, 2));
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    pool.end();
  }
}
run();
