const { pool } = require('./src/db/pool');
const fs = require('fs');

async function migrate() {
  try {
    const sql = fs.readFileSync('./src/db/migrations/017_add_writing_group_id.sql', 'utf8');
    await pool.query(sql);
    console.log('Migration applied successfully');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

migrate();
