const { pool } = require('./src/db/pool');
(async () => {
  try {
    const res = await pool.query("SELECT EXISTS (SELECT 1 FROM pg_views WHERE viewname='v_tutor_grading_queue') AS exists");
    console.log('View exists ?', res.rows[0].exists);
  } catch (err) {
    console.error('Error checking view:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
})();
