const fs = require('node:fs');
const path = require('node:path');
const { checksum, migrationFiles } = require('./migrate');

const REQUIRED_RELATIONS = [
  'users',
  'mock_tests',
  'test_passages',
  'writing_submissions',
  'speaking_submissions',
  'ai_grading_reports',
  'ai_usage_logs',
  'tutor_feedback_reports',
];

const assertExistingBaseline = async (client) => {
  const { rows } = await client.query(
    `SELECT relation_name AS name,
            to_regclass(format('public.%I', relation_name)) IS NOT NULL AS present
     FROM unnest($1::text[]) AS required(relation_name)`,
    [REQUIRED_RELATIONS]
  );
  const missing = rows.filter((row) => !row.present).map((row) => row.name);
  if (missing.length) throw new Error(`BASELINE_SCHEMA_INCOMPLETE: ${missing.join(', ')}`);
};

const assertBaselineChecksums = (existingRows, entries) => {
  const existing = new Map(existingRows.map((row) => [row.version, row.checksum]));
  for (const entry of entries) {
    const recorded = existing.get(entry.version);
    if (recorded && recorded !== entry.checksum) {
      throw new Error(`BASELINE_CHECKSUM_MISMATCH: ${entry.version}`);
    }
  }
};

const baselineExistingSchema = async ({ pool, dir, confirmation }) => {
  if (confirmation !== 'I_HAVE_VERIFIED_SCHEMA') throw new Error('BASELINE_CONFIRMATION_REQUIRED');
  const migrationsDir = dir || path.join(__dirname, '../src/db/migrations');
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(hashtextextended($1, 0))', ['ieltszone-schema-migrations-v1']);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await assertExistingBaseline(client);
    const files = migrationFiles(migrationsDir).filter((file) => file.localeCompare('025_', 'en') < 0);
    const entries = files.map((file) => ({
      version: file,
      checksum: checksum(fs.readFileSync(path.join(migrationsDir, file), 'utf8')),
    }));
    await client.query('BEGIN');
    const history = await client.query(
      'SELECT version, checksum FROM schema_migrations WHERE version = ANY($1::text[]) FOR UPDATE',
      [files]
    );
    assertBaselineChecksums(history.rows, entries);
    for (const entry of entries) {
      await client.query(
        `INSERT INTO schema_migrations(version, checksum) VALUES ($1, $2)
         ON CONFLICT (version) DO NOTHING`,
        [entry.version, entry.checksum]
      );
    }
    await client.query('COMMIT');
    return { baselinedCount: files.length };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', ['ieltszone-schema-migrations-v1']).catch(() => {});
    client.release();
  }
};

const main = async () => {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: false });
  const { pool } = require('../src/db/pool');
  const logger = require('../src/utils/logger');
  try {
    const result = await baselineExistingSchema({
      pool,
      confirmation: process.env.MIGRATION_BASELINE_CONFIRM,
    });
    logger.info('Migration history baselined', result);
  } catch (error) {
    logger.error('Migration baseline failed', { error: error.message });
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

if (require.main === module) main();

module.exports = { assertExistingBaseline, assertBaselineChecksums, baselineExistingSchema };
