/**
 * Debug script: test POST /api/v1/tests/:id/attempts
 * Gọi thẳng API submit để thấy lỗi thật
 */
const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const testId = 'fa6df696-b870-4c27-8e18-d838a58f04fa';

    // 1. Lấy questions của test để biết questionOrder thực tế
    const q = await pool.query(
      `SELECT id, question_order, correct_answer, correct_answers
       FROM questions WHERE test_id = $1 ORDER BY question_order ASC`,
      [testId]
    );
    console.log('=== Questions in test:');
    console.log(JSON.stringify(q.rows, null, 2));

    // 2. Kiểm tra test_attempts table tồn tại
    const ta = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_name = 'test_attempts' ORDER BY ordinal_position`
    );
    console.log('\n=== test_attempts columns:');
    console.log(JSON.stringify(ta.rows, null, 2));

    // 3. Kiểm tra attempt_answers table tồn tại
    const aa = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_name = 'attempt_answers' ORDER BY ordinal_position`
    );
    console.log('\n=== attempt_answers columns:');
    console.log(JSON.stringify(aa.rows, null, 2));

    // 4. Simulate submit với AttemptService
    console.log('\n=== Simulating submitAttempt...');
    const answers = {};
    q.rows.forEach(r => { answers[r.question_order] = 'test_answer'; });
    console.log('Answers payload:', answers);

    // Gọi đúng query như AttemptService
    const testRes = await pool.query(
      `SELECT id, title, skill FROM mock_tests WHERE id = $1`, [testId]
    );
    console.log('Test found:', testRes.rows[0]);

    // Simulate grading insert
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const attemptRes = await client.query(
        `INSERT INTO test_attempts
           (test_id, user_id, status, raw_score, total_questions, band_score, time_spent, practice_mode)
         VALUES ($1, $2, 'completed', $3, $4, $5, $6, $7)
         RETURNING id`,
        [testId, '00000000-0000-0000-0000-000000000000', 0, q.rows.length, 2.0, 30, false]
      );
      console.log('✅ INSERT test_attempts OK, attemptId:', attemptRes.rows[0].id);

      for (const qRow of q.rows) {
        await client.query(
          `INSERT INTO attempt_answers
             (attempt_id, question_id, question_order, user_answer, is_correct, correct_answer)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [attemptRes.rows[0].id, qRow.id, qRow.question_order, 'test', false, qRow.correct_answer]
        );
      }
      console.log('✅ INSERT attempt_answers OK');
      await client.query('ROLLBACK'); // rollback để không có dữ liệu test trong DB
      console.log('Transaction ROLLBACK (test only)');
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('❌ Transaction error:', e.message);
    } finally {
      client.release();
    }

  } catch (e) {
    console.error('ERROR:', e.message, e.stack);
  } finally {
    pool.end();
  }
}

run();
