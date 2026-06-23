const { pool } = require('./src/db/pool');
async function test() {
  try {
    const ids = ['a405916d-12d7-45b2-b0a4-e91ea2a26667'];
    const res = await pool.query('SELECT * FROM question_blocks WHERE passage_id = ANY($1)', [ids]);
    console.log("Success", res.rows);
  } catch(e) {
    console.error("Error", e);
  }
}
test();
