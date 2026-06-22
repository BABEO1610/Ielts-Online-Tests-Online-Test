const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    // 1. Check all reading tests
    const all = await pool.query(
      "SELECT id, title, skill, is_published, duration_minutes FROM mock_tests WHERE skill = 'reading'"
    );
    console.log('=== ALL Reading tests:', all.rows.length);
    console.log(JSON.stringify(all.rows, null, 2));

    // 2. Check published only
    const pub = await pool.query(
      "SELECT id, title, skill, is_published FROM mock_tests WHERE skill = 'reading' AND is_published = true"
    );
    console.log('=== PUBLISHED Reading tests:', pub.rows.length);
    console.log(JSON.stringify(pub.rows, null, 2));

    // 3. Test the exact query backend uses (from test.service.js getTests)
    const svc = await pool.query(
      `SELECT mt.id, mt.title, mt.skill, mt.difficulty, mt.is_published,
              mt.duration_minutes, mt.description, mt.created_at, COUNT(q.id) as questions
       FROM mock_tests mt
       LEFT JOIN questions q ON mt.id = q.test_id
       WHERE ($1::text IS NULL OR mt.skill::text = $1::text)
       GROUP BY mt.id
       ORDER BY mt.created_at DESC`,
      ['reading']
    );
    console.log('=== Service query result:', svc.rows.length);
    console.log(JSON.stringify(svc.rows, null, 2));

  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    pool.end();
  }
}

run();
