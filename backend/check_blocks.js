const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    // 1. Check question_type column info
    const enumRes = await pool.query(
      `SELECT e.enumlabel 
       FROM pg_enum e 
       JOIN pg_type t ON e.enumtypid = t.oid 
       WHERE t.typname = 'question_type' 
       ORDER BY e.enumsortorder`
    );
    console.log('=== question_type enum values:', enumRes.rows.map(r => r.enumlabel));

    // 2. Check current blocks for the test
    const blocksRes = await pool.query(
      `SELECT qb.block_order, qb.question_type, qb.question_range 
       FROM question_blocks qb
       JOIN test_passages tp ON qb.passage_id = tp.id
       WHERE tp.test_id = 'fa6df696-b870-4c27-8e18-d838a58f04fa'
       ORDER BY tp.passage_number, qb.block_order`
    );
    console.log('=== Current blocks in DB:');
    console.log(JSON.stringify(blocksRes.rows, null, 2));

    // 3. Check if question_type is actually a text or enum
    const colInfo = await pool.query(
      `SELECT column_name, data_type, udt_name
       FROM information_schema.columns
       WHERE table_name = 'question_blocks'
       ORDER BY ordinal_position`
    );
    console.log('=== question_blocks columns:');
    console.log(JSON.stringify(colInfo.rows, null, 2));

  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    pool.end();
  }
}
run();
