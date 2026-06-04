const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db/pool');

async function runMigrations() {
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to database. Running migrations...');

    const migrationsDir = path.join(__dirname, '../src/db/migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (file.endsWith('.sql')) {
        console.log(`Executing ${file}...`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');
        await client.query(sql);
        console.log(`✅ ${file} executed successfully.`);
      }
    }

    console.log('🎉 All migrations applied successfully!');
  } catch (error) {
    console.error('❌ Error running migrations:', error);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

runMigrations();
