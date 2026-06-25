require('dotenv').config({ path: '../.env' });
const pool = require('./src/db/pool').pool;

async function check() {
  const res = await pool.query('SELECT id, title, skill FROM mock_tests LIMIT 5;');
  console.log('Mock Tests:', res.rows);
  const attempts = await pool.query('SELECT ta.id, mt.title, mt.skill, ta.band_score, ta.status, ta.raw_score, ta.total_questions, ta.mode FROM test_attempts ta JOIN mock_tests mt ON ta.test_id = mt.id ORDER BY ta.created_at DESC LIMIT 5;');
  console.log('Attempts:', attempts.rows);
  process.exit(0);
}

check();
