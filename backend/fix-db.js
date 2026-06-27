require('dotenv').config({ path: '../.env' });
const { pool } = require('./src/db/pool');

async function fix() {
  try {
    const res = await pool.query(`
      UPDATE speaking_submissions 
      SET status = 'pending' 
      WHERE speaking_group_id IN (
        SELECT speaking_group_id FROM speaking_submissions WHERE status = 'pending'
      ) AND status = 'tutor_graded'
    `);
    console.log("Fixed rows:", res.rowCount);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
fix();
