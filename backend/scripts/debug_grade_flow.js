require('dotenv').config({ path: __dirname + '/../../.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    // 1. Xem sample writing submissions pending-tutor (có writing_group_id không?)
    const ws = await pool.query(`
      SELECT id, user_id, task_number, status, grader, writing_group_id, assigned_tutor_id
      FROM writing_submissions
      WHERE status = 'pending' AND grader = 'tutor'
      LIMIT 10
    `);
    console.log('\n=== PENDING WRITING SUBMISSIONS (sample 10) ===');
    ws.rows.forEach(r => console.log(JSON.stringify(r)));

    // 2. Xem sample speaking submissions
    const ss = await pool.query(`
      SELECT id, user_id, part_number, status, grader, speaking_group_id, assigned_tutor_id
      FROM speaking_submissions
      WHERE status = 'pending' AND grader = 'tutor'
      LIMIT 10
    `);
    console.log('\n=== PENDING SPEAKING SUBMISSIONS (sample 10) ===');
    ss.rows.forEach(r => console.log(JSON.stringify(r)));

    // 3. Writing submissions NULL group_id
    const wsNull = await pool.query(`
      SELECT COUNT(*) as cnt FROM writing_submissions
      WHERE status = 'pending' AND grader = 'tutor' AND writing_group_id IS NULL
    `);
    console.log('\n=== Writing pending-tutor với writing_group_id=NULL ===', wsNull.rows[0].cnt);

    // 4. Speaking submissions NULL group_id
    const ssNull = await pool.query(`
      SELECT COUNT(*) as cnt FROM speaking_submissions
      WHERE status = 'pending' AND grader = 'tutor' AND speaking_group_id IS NULL
    `);
    console.log('=== Speaking pending-tutor với speaking_group_id=NULL ===', ssNull.rows[0].cnt);

    // 5. Thử simulate INSERT vào tutor_feedback_reports giống service
    // Lấy 1 writing submission hợp lệ để test
    const validWs = await pool.query(`
      SELECT ws.id, ws.writing_group_id, ws.user_id, u.full_name
      FROM writing_submissions ws
      JOIN users u ON u.id = ws.user_id
      WHERE ws.status = 'pending' AND ws.grader = 'tutor' AND ws.writing_group_id IS NOT NULL
      LIMIT 1
    `);
    
    if (validWs.rows.length > 0) {
      const sub = validWs.rows[0];
      console.log('\n=== Testing INSERT with writing submission ===');
      console.log('Submission:', sub);

      // Check the group
      const groupCheck = await pool.query(
        'SELECT id, status, grader FROM writing_submissions WHERE writing_group_id = $1',
        [sub.writing_group_id]
      );
      console.log('Group tasks:', groupCheck.rows);

      // Check if any task would fail the guard
      const blockingTask = groupCheck.rows.find(t => t.status !== 'pending' || t.grader !== 'tutor');
      if (blockingTask) {
        console.log('BLOCKED by task:', blockingTask);
      } else {
        console.log('Group check OK - would proceed to INSERT');
      }
    } else {
      console.log('\n=== No valid writing submission with writing_group_id found ===');
    }

    // 6. Kiểm tra audit_logs type enum
    const logEnum = await pool.query(`
      SELECT enumlabel FROM pg_enum
      JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
      WHERE pg_type.typname = 'log_action'
      ORDER BY enumsortorder
    `);
    console.log('\n=== log_action ENUM VALUES ===');
    console.log(logEnum.rows.map(r => r.enumlabel).join(', '));

  } catch (e) {
    console.error('ERROR:', e.message, '\nCode:', e.code, '\nDetail:', e.detail);
  } finally {
    await pool.end();
  }
}
run();
