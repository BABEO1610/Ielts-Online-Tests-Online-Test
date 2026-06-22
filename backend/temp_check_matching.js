const pool = require('./src/config/database');

(async () => {
  try {
    // Get the matching question from passage 3
    const res = await pool.query(`
      SELECT 
        q.id, 
        q.question_text, 
        q.options,
        b.id as block_id,
        b.options as block_options
      FROM questions q
      JOIN question_blocks b ON q.block_id = b.id
      WHERE q.test_id = 'fa6df696-b870-4c27-8e18-d838a58f04fa'
        AND b.type = 'Matching Information'
      LIMIT 1
    `);

    if (res.rows.length === 0) {
      console.log('No matching question found');
      process.exit(0);
    }

    const row = res.rows[0];
    console.log('=== MATCHING QUESTION ===');
    console.log('Question text:', row.question_text);
    console.log('\nBlock options (stored as JSONB):');
    console.log(JSON.stringify(row.block_options, null, 2));
    console.log('\nQuestion options (stored as JSONB):');
    console.log(JSON.stringify(row.options, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
