require('dotenv').config({ path: '../.env' });
const { pool } = require('./src/db/pool');

async function check() {
  try {
    const res = await pool.query("SELECT id, user_id, status, grader, speaking_group_id FROM speaking_submissions WHERE id = $1", ['f6d5339a-3c67-4f16-82b3-8d8eb94a956c']);
    console.log("Speaking Submission:", res.rows);
    if (res.rows.length > 0 && res.rows[0].speaking_group_id) {
        const res2 = await pool.query("SELECT id, part_number, status, grader FROM speaking_submissions WHERE speaking_group_id = $1", [res.rows[0].speaking_group_id]);
        console.log("Group parts:", res2.rows);
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
check();
