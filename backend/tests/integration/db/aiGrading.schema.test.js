const { configureDisposableDatabase } = require('../../helpers/requireDisposableDatabase');

const describeDatabase = configureDisposableDatabase() ? describe : describe.skip;
const { pool } = require('../../../src/db/pool');

describeDatabase('AI grading schema on an explicitly disposable database', () => {
  afterAll(async () => pool.end());

  test('contains the two approved feature tables and queue generation column', async () => {
    const tables = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])
       ORDER BY table_name`, [['ai_grading_jobs', 'speaking_analysis_artifacts']]);
    expect(tables.rows.map((row) => row.table_name)).toEqual(['ai_grading_jobs', 'speaking_analysis_artifacts']);
    const columns = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'ai_grading_jobs'`, []);
    expect(columns.rows.map((row) => row.column_name)).toContain('lease_generation');
  });
});
