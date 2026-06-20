require('dotenv').config();
const { pool } = require('./src/db/pool');

async function test() {
  try {
    const res = await pool.query(`
      SELECT 
        id, title, description, resource_type, file_url, file_size_bytes, 
        uploaded_by, is_published, created_at, updated_at, review_status, category
      FROM library_resources
      WHERE is_published = true AND LOWER(review_status) = 'approved'
    `);
    console.log(res.rows);
  } catch (err) {
    console.error("SQL Error:", err.message);
  } finally {
    pool.end();
  }
}
test();
