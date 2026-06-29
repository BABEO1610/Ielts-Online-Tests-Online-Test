require('node:dns').setDefaultResultOrder('ipv4first');
require('dotenv').config({ path: '../.env' });
const { pool } = require('./src/db/pool');

async function check() {
  try {
    const res = await pool.query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5");
    console.log("Recent audit logs:", res.rows.map(r => ({ action: r.action, actor: r.actor_id })));
    const res2 = await pool.query("SELECT id, action FROM audit_logs WHERE action = 'submission_graded'");
    console.log("Graded logs total:", res2.rows.length);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
check();
