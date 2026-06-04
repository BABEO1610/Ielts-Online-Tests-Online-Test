/**
 * @file tests/unit/db/001_create_enums.test.js
 * @description Unit tests for Enum creation in PostgreSQL
 * 
 * Traceability Matrix:
 * - TC-002-01: Verifies 'user_role' enum contains ['user', 'student', 'tutor', 'admin'] (SPEC §6)
 * - TC-002-02: Verifies 'account_status' enum contains ['pending', 'active', 'inactive', 'banned'] (SPEC §6)
 * - TC-002-03: Verifies 'password_change_reason' enum contains ['user_initiated', 'reset_via_email', 'forced_default', 'admin_reset'] (SPEC §6)
 * - TC-002-04: Verifies 'log_action' enum contains all exact approved values (SPEC §6)
 * - TC-002-05: Verifies boundary error cases when inserting invalid enum values (EARS[Unwanted])
 */

const { pool } = require('../../../src/db/pool');
const fs = require('fs');
const path = require('path');

describe('Migration: 001_create_enums', () => {
  let client;

  beforeAll(async () => {
    client = await pool.connect();
    // EARS[Event]: WHEN running database setup, run the migration file
    const migrationPath = path.join(__dirname, '../../../src/db/migrations/001_create_enums.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    await client.query(migrationSql);
  });

  afterAll(async () => {
    if (client) {
      // Clean up temp tables
      await client.query('DROP TABLE IF EXISTS temp_enum_test');
      client.release();
    }
    // Note: pool.end() might close the pool for other tests if they run concurrently,
    // but in Jest unit tests isolation, this is fine or we rely on jest teardown.
    // We'll close the pool to prevent open handles.
    await pool.end();
  });

  const getEnumValues = async (enumName) => {
    const res = await client.query(`
      SELECT unnest(enum_range(NULL::${enumName}))::text AS value;
    `);
    return res.rows.map(row => row.value);
  };

  test('TC-002-01: Should create user_role enum with correct values', async () => {
    const values = await getEnumValues('user_role');
    expect(values).toEqual(['user', 'student', 'tutor', 'admin']);
  });

  test('TC-002-02: Should create account_status enum with correct values', async () => {
    const values = await getEnumValues('account_status');
    expect(values).toEqual(['pending', 'active', 'inactive', 'banned']);
  });

  test('TC-002-03: Should create password_change_reason enum with correct values', async () => {
    const values = await getEnumValues('password_change_reason');
    expect(values).toEqual(['user_initiated', 'reset_via_email', 'forced_default', 'admin_reset']);
  });

  test('TC-002-04: Should create log_action enum with correct values', async () => {
    const values = await getEnumValues('log_action');
    const expectedValues = [
      'user_created', 'user_updated', 'role_changed', 'user_deactivated', 
      'user_deleted', 'test_created', 'test_updated', 'test_deleted', 
      'answer_key_updated', 'resource_uploaded', 'resource_deleted', 
      'login', 'logout', 'login_failed', 'password_changed', 
      'password_reset_requested', 'oauth_linked', 'oauth_unlinked'
    ];
    expect(values).toEqual(expectedValues);
  });

  test('TC-002-05: Should reject invalid enum values (Boundary Test)', async () => {
    // EARS[Unwanted]: WHERE a User inserts an invalid enum value, THE system SHALL reject it.
    await client.query(`
      CREATE TEMP TABLE temp_enum_test (
        id SERIAL PRIMARY KEY,
        role user_role
      )
    `);

    // Happy path insertion
    await expect(client.query("INSERT INTO temp_enum_test (role) VALUES ('admin')")).resolves.not.toThrow();

    // Error case insertion
    await expect(client.query("INSERT INTO temp_enum_test (role) VALUES ('super_admin')")).rejects.toThrow(/invalid input value for enum user_role/);
  });
});
