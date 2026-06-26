require('dotenv').config({ path: __dirname + '/../../.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function debugDb() {
  console.log('--- DB Debug ---');
  console.log('SUPABASE_URL hostname/project ref:', process.env.SUPABASE_URL ? process.env.SUPABASE_URL.replace(/https?:\/\//, '').split('.')[0] : 'N/A');
  console.log('has service key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('NODE_ENV:', process.env.NODE_ENV);

  try {
    const mockTestsCount = await pool.query('SELECT count(*) FROM mock_tests');
    console.log('mock_tests count:', mockTestsCount.rows[0].count);

    const mockTestsRows = await pool.query('SELECT * FROM mock_tests LIMIT 5');
    console.log('mock_tests sample 5 rows:', mockTestsRows.rows);

    const libraryResourcesCount = await pool.query('SELECT count(*) FROM library_resources');
    console.log('library_resources count:', libraryResourcesCount.rows[0].count);

    const libraryResourcesRows = await pool.query('SELECT * FROM library_resources LIMIT 5');
    console.log('library_resources sample 5 rows:', libraryResourcesRows.rows);

    // Detect publish column
    const colsResult = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mock_tests'`);
    const cols = colsResult.rows.map(r => r.column_name);
    
    let publishCol = null;
    let publishVal = null;
    if (cols.includes('is_published')) { publishCol = 'is_published'; publishVal = true; }
    else if (cols.includes('status')) { publishCol = 'status'; publishVal = 'published'; }
    else if (cols.includes('is_active')) { publishCol = 'is_active'; publishVal = true; }
    else if (cols.includes('published')) { publishCol = 'published'; publishVal = true; }

    if (publishCol) {
      console.log(`Testing publish column: ${publishCol} = ${publishVal}`);
      const pubTest = await pool.query(`SELECT count(*) FROM mock_tests WHERE ${publishCol} = $1`, [publishVal]);
      console.log(`Published mock_tests count:`, pubTest.rows[0].count);
    } else {
      console.log('No publish column detected in mock_tests');
    }

  } catch (error) {
    console.error('DB Error:');
    console.error('  Message:', error.message);
    console.error('  Code:', error.code);
    console.error('  Details:', error.details);
    console.error('  Hint:', error.hint);
  } finally {
    await pool.end();
  }
}

debugDb();
