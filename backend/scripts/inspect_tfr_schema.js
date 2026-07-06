require('dotenv').config({ path: __dirname + '/../../.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    // 1. Columns of tutor_feedback_reports
    const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'tutor_feedback_reports'
      ORDER BY ordinal_position
    `);
    console.log('\n=== tutor_feedback_reports COLUMNS ===');
    cols.rows.forEach(c => {
      console.log(`  ${c.column_name.padEnd(30)} | ${c.data_type.padEnd(20)} | nullable: ${c.is_nullable}`);
    });

    // 2. FK constraints
    const fks = await pool.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'tutor_feedback_reports'
    `);
    console.log('\n=== tutor_feedback_reports FOREIGN KEYS ===');
    fks.rows.forEach(f => {
      console.log(`  ${f.column_name} -> ${f.foreign_table_name}(${f.foreign_column_name})`);
    });

    // 3. Row count
    const cnt = await pool.query('SELECT COUNT(*) FROM tutor_feedback_reports');
    console.log('\n=== ROW COUNT ===', cnt.rows[0].count);

    // 4. Sample writing_submissions to see if writing_group_id exists
    const wsCols = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'writing_submissions'
      ORDER BY ordinal_position
    `);
    console.log('\n=== writing_submissions COLUMNS ===');
    console.log(' ', wsCols.rows.map(r => r.column_name).join(', '));

    // 5. Sample speaking_submissions columns
    const ssCols = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'speaking_submissions'
      ORDER BY ordinal_position
    `);
    console.log('\n=== speaking_submissions COLUMNS ===');
    console.log(' ', ssCols.rows.map(r => r.column_name).join(', '));

    // 6. Check pending submissions exist
    const pending = await pool.query(`
      SELECT 'writing' as type, COUNT(*) as cnt FROM writing_submissions WHERE status = 'pending' AND grader = 'tutor'
      UNION ALL
      SELECT 'speaking', COUNT(*) FROM speaking_submissions WHERE status = 'pending' AND grader = 'tutor'
    `);
    console.log('\n=== PENDING TUTOR SUBMISSIONS ===');
    pending.rows.forEach(r => console.log(` ${r.type}: ${r.cnt}`));

    // 7. Check submission_status enum values
    const enumVals = await pool.query(`
      SELECT enumlabel FROM pg_enum
      JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
      WHERE pg_type.typname = 'submission_status'
      ORDER BY enumsortorder
    `);
    console.log('\n=== submission_status ENUM VALUES ===');
    console.log(' ', enumVals.rows.map(r => r.enumlabel).join(', '));

  } catch (e) {
    console.error('ERROR:', e.message);
    console.error('Detail:', e.detail);
  } finally {
    await pool.end();
  }
}
run();
