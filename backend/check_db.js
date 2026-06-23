require('dotenv').config({ path: '../.env' });
const { pool } = require('./src/db/pool');

async function check() {
  try {
    const res = await pool.query(`
      SELECT 
        q.id, 
        q.test_id,
        t.title as test_title,
        q.question_text, 
        q.options, 
        q.correct_answer, 
        q.correct_answers 
      FROM questions q
      JOIN mock_tests t ON q.test_id = t.id
      WHERE t.title ILIKE '%TEST LIS%'
      ORDER BY q.question_order ASC
      LIMIT 5
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

check();
