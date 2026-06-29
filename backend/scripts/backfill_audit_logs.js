const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const connectionString = process.env.DATABASE_URL.replace('db.exuuhghnjcihypchzmym.supabase.co:5432', 'aws-0-ap-southeast-1.pooler.supabase.com:6543');
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Fixing submission_revoked and submission_regraded...');
    const res1 = await client.query(`
      UPDATE audit_logs al
      SET new_value = al.new_value || jsonb_build_object('student_name', u.full_name)
      FROM tutor_feedback_reports tfr
      LEFT JOIN writing_submissions ws ON tfr.writing_submission_id = ws.id
      LEFT JOIN speaking_submissions ss ON tfr.speaking_submission_id = ss.id
      LEFT JOIN users u ON u.id = COALESCE(ws.user_id, ss.user_id)
      WHERE al.target_table = 'tutor_feedback_reports' 
        AND al.target_id::text = tfr.id::text
        AND al.new_value IS NOT NULL
        AND NOT (al.new_value ? 'student_name')
        AND u.full_name IS NOT NULL
      RETURNING al.id;
    `);
    console.log(`Updated ${res1.rowCount} tutor_feedback_reports logs.`);

    console.log('Fixing submission_graded (writing)...');
    const res2 = await client.query(`
      UPDATE audit_logs al
      SET new_value = al.new_value || jsonb_build_object('student_name', u.full_name)
      FROM writing_submissions ws
      JOIN users u ON u.id = ws.user_id
      WHERE al.target_table = 'writing_submissions' 
        AND al.action = 'submission_graded'
        AND al.target_id::text = ws.id::text
        AND al.new_value IS NOT NULL
        AND NOT (al.new_value ? 'student_name')
        AND u.full_name IS NOT NULL
      RETURNING al.id;
    `);
    console.log(`Updated ${res2.rowCount} writing_submissions logs.`);

    console.log('Fixing submission_graded (speaking)...');
    const res3 = await client.query(`
      UPDATE audit_logs al
      SET new_value = al.new_value || jsonb_build_object('student_name', u.full_name)
      FROM speaking_submissions ss
      JOIN users u ON u.id = ss.user_id
      WHERE al.target_table = 'speaking_submissions' 
        AND al.action = 'submission_graded'
        AND al.target_id::text = ss.id::text
        AND al.new_value IS NOT NULL
        AND NOT (al.new_value ? 'student_name')
        AND u.full_name IS NOT NULL
      RETURNING al.id;
    `);
    console.log(`Updated ${res3.rowCount} speaking_submissions logs.`);

    await client.query('COMMIT');
    console.log('Backfill completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during backfill:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
