const fs = require('node:fs');
const path = require('node:path');
const { pool } = require('../src/db/pool');

async function runSingle() {
  let client;
  try {
    console.log('Connecting to database...');
    client = await pool.connect();
    console.log('✅ Connected!');

    const filePath = path.join(__dirname, 'src/db/migrations/013_create_submissions_and_views.sql');
    const sql = fs.readFileSync(filePath, 'utf-8');
    
    console.log('Running 013_create_submissions_and_views.sql...');
    await client.query(sql);
    console.log('✅ Migration 013 applied successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

runSingle();
