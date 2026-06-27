require('dotenv').config({ path: '../.env' });
const { pool } = require('./src/db/pool');
pool.query('SELECT id, actor_id, action, created_at, created_at::date as log_date, CURRENT_DATE as cur_date FROM audit_logs ORDER BY created_at DESC LIMIT 5')
  .then(r => console.log(r.rows))
  .catch(console.error)
  .finally(() => process.exit());
