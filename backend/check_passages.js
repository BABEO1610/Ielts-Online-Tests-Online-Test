const { pool } = require('./src/db/pool');

async function checkPassages() {
  const res = await pool.query(`SELECT * FROM test_passages LIMIT 10`);
  console.log(res.rows);
  process.exit(0);
}
checkPassages();
