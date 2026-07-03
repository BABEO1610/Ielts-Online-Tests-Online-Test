/**
 * Script chạy riêng một migration file chỉ định.
 * Dùng khi migration runner gặp lỗi ở file cũ mà file mới đã sẵn sàng.
 */
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { pool } = require('../src/db/pool');

async function runSingleMigration(filename) {
  let client;
  try {
    client = await pool.connect();
    const filePath = path.join(__dirname, '../src/db/migrations', filename);
    const sql = fs.readFileSync(filePath, 'utf-8');
    console.log(`Executing ${filename}...`);
    await client.query(sql);
    console.log(`✅ ${filename} executed successfully.`);
  } catch (error) {
    console.error(`❌ Error:`, error.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/migrate-single.js <migration-filename.sql>');
  process.exit(1);
}

runSingleMigration(target);
