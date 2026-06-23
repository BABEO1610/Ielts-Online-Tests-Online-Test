const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const sqlFile = path.join(__dirname, 'src/db/migrations/014_patch_attempts_add_columns.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');
  console.log('Running migration 014...');
  try {
    await pool.query(sql);
    console.log('✅ Migration 014 SUCCESS');

    // Verify columns now exist
    const cols = await pool.query(
      `SELECT column_name, data_type, column_default
       FROM information_schema.columns
       WHERE table_name = 'test_attempts'
       ORDER BY ordinal_position`
    );
    console.log('\n=== test_attempts columns after migration:');
    cols.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type}) default=${r.column_default}`));
  } catch (e) {
    console.error('❌ Migration error:', e.message);
  } finally {
    pool.end();
  }
}

run();
