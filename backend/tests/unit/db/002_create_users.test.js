/**
 * Traceability Matrix:
 * - [NFR-Database]: Raw SQL pg pool validation
 * - [USER-03]: Registration data requirements
 * - [AUTH_PROF_001]: Validates `target_band_score` boundary values [0.0 - 9.0] and 0.5 step.
 * - [SPEC §6]: DB Schema for users table, Enum `user_role`, Enum `account_status`.
 */

const { pool } = require('../../../src/db/pool');
const fs = require('fs');
const path = require('path');

describe('T003 - Migration: Bảng users', () => {
  let client;

  beforeAll(async () => {
    client = await pool.connect();
    
    // Ensure enums exist first (T002 dependency)
    const enumsMigration = fs.readFileSync(path.resolve(__dirname, '../../../src/db/migrations/001_create_enums.sql'), 'utf-8');
    await client.query(enumsMigration);

    // Apply users migration
    const migration = fs.readFileSync(path.resolve(__dirname, '../../../src/db/migrations/002_create_users.sql'), 'utf-8');
    await client.query(migration);
  });

  afterAll(async () => {
    if (client) {
      await client.query('DROP TABLE IF EXISTS users CASCADE;');
      client.release();
    }
    await pool.end();
  });

  afterEach(async () => {
    // Clean up data after each test
    if (client) {
      await client.query('TRUNCATE TABLE users CASCADE;');
    }
  });

  it('Happy Path: Should insert a user successfully with valid defaults', async () => {
    const res = await client.query(`
      INSERT INTO users (email, full_name, password_hash)
      VALUES ($1, $2, $3)
      RETURNING *;
    `, ['test@example.com', 'Test User', 'hashed_pwd_abc123']);

    expect(res.rowCount).toBe(1);
    const user = res.rows[0];
    
    expect(user.email).toBe('test@example.com');
    expect(user.role).toBe('student');
    expect(user.status).toBe('pending');
    expect(user.failed_login_attempts).toBe(0);
    expect(user.must_change_password).toBe(false);
    expect(user.created_at).not.toBeNull();
    expect(user.updated_at).not.toBeNull();
  });

  it('Error Case: Should enforce UNIQUE email constraint', async () => {
    await client.query(`
      INSERT INTO users (email, full_name)
      VALUES ($1, $2)
    `, ['duplicate@example.com', 'User 1']);

    await expect(client.query(`
      INSERT INTO users (email, full_name)
      VALUES ($1, $2)
    `, ['duplicate@example.com', 'User 2'])).rejects.toThrow(/unique constraint/i);
  });

  it('Error Case [AUTH_PROF_001]: Should reject target_band_score > 9.0', async () => {
    await expect(client.query(`
      INSERT INTO users (email, full_name, target_band_score)
      VALUES ($1, $2, $3)
    `, ['score1@example.com', 'User 1', 9.5])).rejects.toThrow(/check/i);
  });

  it('Error Case [AUTH_PROF_001]: Should reject target_band_score < 0.0', async () => {
    await expect(client.query(`
      INSERT INTO users (email, full_name, target_band_score)
      VALUES ($1, $2, $3)
    `, ['score2@example.com', 'User 2', -0.5])).rejects.toThrow(/check/i);
  });

  it('Error Case [AUTH_PROF_001]: Should reject target_band_score that is not in 0.5 increments (e.g., 5.3)', async () => {
    await expect(client.query(`
      INSERT INTO users (email, full_name, target_band_score)
      VALUES ($1, $2, $3)
    `, ['score3@example.com', 'User 3', 5.3])).rejects.toThrow(/check/i);
  });

  it('Happy Path [AUTH_PROF_001]: Should accept valid target_band_score like 6.5 and 7.0', async () => {
    const res1 = await client.query(`
      INSERT INTO users (email, full_name, target_band_score)
      VALUES ($1, $2, $3) RETURNING id
    `, ['valid1@example.com', 'User 1', 6.5]);
    expect(res1.rowCount).toBe(1);

    const res2 = await client.query(`
      INSERT INTO users (email, full_name, target_band_score)
      VALUES ($1, $2, $3) RETURNING id
    `, ['valid2@example.com', 'User 2', 7.0]);
    expect(res2.rowCount).toBe(1);
  });

  it('Event-driven: Should update updated_at trigger automatically on row update', async () => {
    const insertRes = await client.query(`
      INSERT INTO users (email, full_name)
      VALUES ($1, $2) RETURNING id, updated_at
    `, ['trigger@example.com', 'User Trigger']);
    
    const initialUpdatedAt = insertRes.rows[0].updated_at;
    const userId = insertRes.rows[0].id;

    // Small delay to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 100));

    const updateRes = await client.query(`
      UPDATE users SET full_name = $1 WHERE id = $2 RETURNING updated_at
    `, ['User Trigger Updated', userId]);

    const newUpdatedAt = updateRes.rows[0].updated_at;
    expect(newUpdatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
  });
});
