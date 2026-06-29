const { pool } = require('../src/db/pool');

async function testQueries() {
  try {
    const gradedQuery = `
      SELECT 
        d.date::date AS day,
        COUNT(tfr.id) AS count
      FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) d(date)
      LEFT JOIN tutor_feedback_reports tfr ON tfr.created_at::date = d.date::date 
      GROUP BY d.date::date
      ORDER BY d.date::date ASC;
    `;
    const res = await pool.query(gradedQuery);
    console.log("Graded:", res.rows);

    const writingQuery = `
      SELECT 
        d.date::date AS day,
        COUNT(DISTINCT ws.writing_group_id) AS count
      FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) d(date)
      LEFT JOIN writing_submissions ws ON ws.submitted_at::date = d.date::date AND ws.status = 'pending' AND ws.grader = 'tutor'
      GROUP BY d.date::date
      ORDER BY d.date::date ASC;
    `;
    const wRes = await pool.query(writingQuery);
    console.log("Writing:", wRes.rows);

    const testQuery = `
      WITH top_tests AS (
        SELECT mt.id, mt.title, COUNT(ta.id) AS attempts_count
        FROM mock_tests mt
        LEFT JOIN test_attempts ta ON ta.test_id = mt.id
        WHERE mt.is_published = true
        GROUP BY mt.id, mt.title
        ORDER BY attempts_count DESC
        LIMIT 3
      )
      SELECT 
        t.id, t.title, t.attempts_count,
        d.date::date AS day,
        COUNT(ta.id) AS daily_attempts
      FROM top_tests t
      CROSS JOIN generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) d(date)
      LEFT JOIN test_attempts ta ON ta.test_id = t.id AND ta.submitted_at::date = d.date::date
      GROUP BY t.id, t.title, t.attempts_count, d.date::date
      ORDER BY t.attempts_count DESC, t.id, d.date::date ASC;
    `;
    const tRes = await pool.query(testQuery);
    console.log("Tests:", tRes.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

testQueries();
