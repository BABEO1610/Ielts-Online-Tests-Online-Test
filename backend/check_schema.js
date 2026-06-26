require('dotenv').config({ path: '../.env' });
const { pool } = require('./src/db/pool');

async function check() {
  try {
    const res = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%tutor%'`);
    console.log('Tables matching tutor:', res.rows.map(r=>r.table_name));

    const res2 = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name LIKE '%tutor%'`);
    console.log('Columns matching tutor in users:', res2.rows.map(r=>r.column_name));
    
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
check();
