require('dotenv').config({ path: __dirname + '/../../.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Simulation - lấy tutor ID thực và thử chạy toàn bộ gradeSubmission logic
async function simulateGradeWriting(submissionId, tutorId) {
  console.log('\n=== SIMULATING gradeSubmission(writing, id=' + submissionId + ', tutorId=' + tutorId + ') ===');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Step 1: SELECT FOR UPDATE
    const checkQuery = `
      SELECT ws.id, ws.writing_group_id, ws.status, ws.grader, ws.user_id, u.full_name as student_name
      FROM writing_submissions ws
      JOIN users u ON u.id = ws.user_id
      WHERE ws.id = $1 FOR UPDATE
    `;
    const checkResult = await client.query(checkQuery, [submissionId]);
    if (checkResult.rowCount === 0) {
      console.log('FAIL: Submission not found');
      await client.query('ROLLBACK');
      return;
    }
    const submission = checkResult.rows[0];
    console.log('STEP 1 OK - submission:', submission);

    if (!submission.writing_group_id) {
      console.log('FAIL: writing_group_id is NULL');
      await client.query('ROLLBACK');
      return;
    }

    // Step 2: Check group
    const groupQuery = `SELECT id, status, grader FROM writing_submissions WHERE writing_group_id = $1`;
    const groupResult = await client.query(groupQuery, [submission.writing_group_id]);
    console.log('STEP 2 - group tasks:', groupResult.rows);
    for (const task of groupResult.rows) {
      if (task.status !== 'pending' || task.grader !== 'tutor') {
        console.log('FAIL 409: Task blocked:', task);
        await client.query('ROLLBACK');
        return;
      }
    }
    console.log('STEP 2 OK - all tasks pending+tutor');

    // Step 3: Get rep task
    const repTaskResult = await client.query(
      `SELECT id FROM writing_submissions WHERE writing_group_id = $1 ORDER BY task_number ASC LIMIT 1`,
      [submission.writing_group_id]
    );
    const repTaskId = repTaskResult.rows[0].id;
    console.log('STEP 3 OK - repTaskId:', repTaskId);

    // Step 4: INSERT
    const payload = {
      bandScore: 6.0,
      taskAchievementScore: 6.0,
      coherenceScore: 6.0,
      lexicalScore: 6.0,
      grammarScore: 6.0,
      writtenFeedback: 'Test feedback - simulation only'
    };
    const insertFeedbackQuery = `
      INSERT INTO tutor_feedback_reports (
        tutor_id, writing_submission_id, band_score, 
        task_achievement_score, coherence_score, lexical_score, grammar_score,
        written_feedback
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    const insertResult = await client.query(insertFeedbackQuery, [
      tutorId, repTaskId, payload.bandScore,
      payload.taskAchievementScore, payload.coherenceScore, payload.lexicalScore, payload.grammarScore,
      payload.writtenFeedback
    ]);
    console.log('STEP 4 OK - inserted report id:', insertResult.rows[0].id);

    // ROLLBACK instead of COMMIT for simulation
    await client.query('ROLLBACK');
    console.log('\n✅ SIMULATION PASSED - All steps work. Transaction rolled back (simulation).');
  } catch (error) {
    await client.query('ROLLBACK');
    console.log('\n❌ SIMULATION FAILED at step:');
    console.log('Message:', error.message);
    console.log('Code:', error.code);
    console.log('Detail:', error.detail);
    console.log('Hint:', error.hint);
  } finally {
    client.release();
  }
}

async function run() {
  try {
    // Lấy submission + tutor id thực từ DB
    const { rows: submissions } = await pool.query(`
      SELECT ws.id as sub_id, ws.writing_group_id, ws.assigned_tutor_id as tutor_id, u.email as tutor_email
      FROM writing_submissions ws
      LEFT JOIN users u ON u.id = ws.assigned_tutor_id
      WHERE ws.status = 'pending' AND ws.grader = 'tutor' 
        AND ws.writing_group_id IS NOT NULL
        AND ws.assigned_tutor_id IS NOT NULL
      LIMIT 1
    `);

    if (submissions.length === 0) {
      console.log('No valid submission found');
      return;
    }

    const { sub_id, tutor_id, tutor_email } = submissions[0];
    console.log('Using submission:', sub_id, '| tutor:', tutor_email);

    await simulateGradeWriting(sub_id, tutor_id);

    // Also check if tutor_id FK issue - is the tutor_id a valid user?
    const tutorCheck = await pool.query('SELECT id, role FROM users WHERE id = $1', [tutor_id]);
    console.log('\nTutor user in DB:', tutorCheck.rows[0]);

    // Check if tutor_id constraint NOT NULL
    console.log('\n=== tutor_feedback_reports tutor_id constraint ===');
    const constraintCheck = await pool.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'tutor_feedback_reports' AND table_schema = 'public'
    `);
    constraintCheck.rows.forEach(r => console.log(r.constraint_name, '-', r.constraint_type));

  } catch (e) {
    console.error('OUTER ERROR:', e.message);
  } finally {
    await pool.end();
  }
}

run();
