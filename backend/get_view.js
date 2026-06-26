const { pool } = require('./src/db/pool');

async function getViewDef() {
  const res = await pool.query(`
    SELECT pg_get_viewdef('v_tutor_grading_queue', true) as def
  `);
  console.log(res.rows[0].def);
  process.exit(0);
}
getViewDef();
