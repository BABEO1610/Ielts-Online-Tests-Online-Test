require('dotenv').config();
const { pool } = require('./src/db/pool');

async function test() {
  const query = `
    SELECT 
        mt.id, 
        mt.title, 
        (
          SELECT COUNT(DISTINCT user_id) 
          FROM (
            SELECT user_id FROM test_attempts WHERE test_id = mt.id
            UNION
            SELECT user_id FROM writing_submissions WHERE test_id = mt.id
            UNION
            SELECT user_id FROM speaking_submissions WHERE test_id = mt.id
          ) AS all_participants
        ) as participant_count
      FROM mock_tests mt
  `;
  try {
    const { rows } = await pool.query(query);
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
test();
