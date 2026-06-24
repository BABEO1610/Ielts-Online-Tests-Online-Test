const { pool } = require('../src/db/pool');

(async () => {
  try {
    await pool.query('DROP VIEW IF EXISTS public.v_tutor_grading_queue');
    console.log('View v_tutor_grading_queue dropped (if existed).');
  } catch (err) {
    console.error('Error dropping view:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
})();
