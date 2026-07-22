const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const LOCK_NAME = 'ieltszone-schema-migrations-v1';
const DEFAULT_DIR = path.join(__dirname, '../src/db/migrations');

const checksum = (sql) => crypto.createHash('sha256').update(sql).digest('hex');
const migrationFiles = (dir = DEFAULT_DIR) => fs.readdirSync(dir)
  .filter((file) => file.endsWith('.sql'))
  .sort((left, right) => left.localeCompare(right, 'en'));

const ensureHistory = (client) => client.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    checksum CHAR(64) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

const hasExistingSchemaWithoutHistory = async (client) => {
  const { rows } = await client.query(`
    SELECT
      to_regclass('public.users') IS NOT NULL AS has_users,
      EXISTS (SELECT 1 FROM schema_migrations) AS has_history
  `);
  return rows[0].has_users && !rows[0].has_history;
};

const appliedMigrations = async (client) => {
  const { rows } = await client.query('SELECT version, checksum FROM schema_migrations');
  return new Map(rows.map((row) => [row.version, row.checksum]));
};

const applyFile = async (client, dir, file, expectedChecksum) => {
  const sql = fs.readFileSync(path.join(dir, file), 'utf8');
  const actualChecksum = checksum(sql);
  if (expectedChecksum && expectedChecksum !== actualChecksum) {
    throw new Error(`Checksum mismatch for applied migration ${file}`);
  }
  if (expectedChecksum) return false;
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations(version, checksum) VALUES ($1, $2)',
      [file, actualChecksum]
    );
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
};

const runMigrations = async ({ pool, dir = DEFAULT_DIR, logger = console } = {}) => {
  const client = await pool.connect();
  let appliedCount = 0;
  try {
    await client.query('SELECT pg_advisory_lock(hashtextextended($1, 0))', [LOCK_NAME]);
    await ensureHistory(client);
    if (await hasExistingSchemaWithoutHistory(client)) {
      throw new Error('MIGRATION_BASELINE_REQUIRED: run the explicit verified baseline command first');
    }
    const applied = await appliedMigrations(client);
    for (const file of migrationFiles(dir)) {
      if (await applyFile(client, dir, file, applied.get(file))) {
        appliedCount += 1;
        logger.info?.(`Applied migration ${file}`);
      }
    }
    return { appliedCount };
  } finally {
    await client.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', [LOCK_NAME]).catch(() => {});
    client.release();
  }
};

const main = async () => {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: false });
  const { pool } = require('../src/db/pool');
  const logger = require('../src/utils/logger');
  try {
    await runMigrations({ pool, logger });
  } catch (error) {
    logger.error('Migration failed', { error: error.message });
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

if (require.main === module) main();

module.exports = { applyFile, checksum, migrationFiles, runMigrations };
