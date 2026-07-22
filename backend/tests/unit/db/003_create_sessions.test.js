/**
 * Traceability Matrix:
 * - [NFR-Database]: Raw SQL pg pool validation
 * - [SPEC §6]: DB Schema for user_sessions table, v_active_sessions view.
 * - [Event-driven]: Token lifecycle management (revoked_at, expires_at)
 * - [State-driven]: v_active_sessions only returns valid, active sessions
 */

const { configureDisposableDatabase } = require('../../helpers/requireDisposableDatabase');
const describeDatabase = configureDisposableDatabase() ? describe : describe.skip;
const { pool } = require('../../../src/db/pool');
const fs = require('fs');
const path = require('path');

describeDatabase('T004 - Migration: Bảng user_sessions', () => {
  let client;
  let testUserId;

  beforeAll(async () => {
    client = await pool.connect();
    
    // Clean up stale tables from previous runs to ensure clean state for migrations
    await client.query('DROP VIEW IF EXISTS v_active_sessions CASCADE;');
    await client.query('DROP TABLE IF EXISTS user_sessions CASCADE;');
    await client.query('DROP TABLE IF EXISTS users CASCADE;');
    
    // Ensure enums exist first (T002 dependency)
    const enumsMigration = fs.readFileSync(path.resolve(__dirname, '../../../src/db/migrations/001_create_enums.sql'), 'utf-8');
    await client.query(enumsMigration);

    // Ensure users table exists (T003 dependency)
    const usersMigration = fs.readFileSync(path.resolve(__dirname, '../../../src/db/migrations/002_create_users.sql'), 'utf-8');
    await client.query(usersMigration);

    // Apply sessions migration (T004)
    const sessionsMigration = fs.readFileSync(path.resolve(__dirname, '../../../src/db/migrations/003_create_sessions.sql'), 'utf-8');
    await client.query(sessionsMigration);
  });

  afterAll(async () => {
    if (client) {
      await client.query('DROP VIEW IF EXISTS v_active_sessions CASCADE;');
      await client.query('DROP TABLE IF EXISTS user_sessions CASCADE;');
      // Users table might be dropped by its own test suite, but we'll leave it or drop it cleanly
      await client.query('DROP TABLE IF EXISTS users CASCADE;');
      client.release();
    }
    await pool.end();
  });

  beforeEach(async () => {
    if (client) {
      await client.query('TRUNCATE TABLE user_sessions CASCADE;');
      await client.query('TRUNCATE TABLE users CASCADE;');

      // Insert a dummy user for foreign key relation
      const res = await client.query(`
        INSERT INTO users (email, full_name, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id;
      `, ['session_test@example.com', 'Session User', 'hash123']);
      testUserId = res.rows[0].id;
    }
  });

  it('Happy Path: Should insert a session successfully with valid data', async () => {
    const res = await client.query(`
      INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
      VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')
      RETURNING *;
    `, [testUserId, 'test_session_token_123', '192.168.1.1', 'Mozilla/5.0']);

    expect(res.rowCount).toBe(1);
    const session = res.rows[0];
    
    expect(session.user_id).toBe(testUserId);
    expect(session.session_token).toBe('test_session_token_123');
    expect(session.ip_address).toBe('192.168.1.1');
    expect(session.user_agent).toBe('Mozilla/5.0');
    expect(session.revoked_at).toBeNull();
    expect(session.created_at).not.toBeNull();
    expect(session.updated_at).not.toBeNull();
  });

  it('Error Case: Should enforce UNIQUE session_token constraint', async () => {
    await client.query(`
      INSERT INTO user_sessions (user_id, session_token, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '1 day')
    `, [testUserId, 'duplicate_token']);

    await expect(client.query(`
      INSERT INTO user_sessions (user_id, session_token, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '1 day')
    `, [testUserId, 'duplicate_token'])).rejects.toThrow(/unique constraint/i);
  });

  it('Error Case: Should enforce NOT NULL constraints on session_token and expires_at', async () => {
    await expect(client.query(`
      INSERT INTO user_sessions (user_id, session_token, expires_at)
      VALUES ($1, $2, $3)
    `, [testUserId, null, new Date()])).rejects.toThrow(/not-null constraint/i);

    await expect(client.query(`
      INSERT INTO user_sessions (user_id, session_token, expires_at)
      VALUES ($1, $2, $3)
    `, [testUserId, 'token_no_expires', null])).rejects.toThrow(/not-null constraint/i);
  });

  it('Error Case: Should enforce Foreign Key constraint on user_id', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await expect(client.query(`
      INSERT INTO user_sessions (user_id, session_token, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '1 day')
    `, [fakeId, 'token_invalid_fk'])).rejects.toThrow(/foreign key constraint/i);
  });

  it('Event-driven: Should update updated_at trigger automatically on row update', async () => {
    const insertRes = await client.query(`
      INSERT INTO user_sessions (user_id, session_token, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '1 day')
      RETURNING session_token, updated_at
    `, [testUserId, 'trigger_token']);
    
    const initialUpdatedAt = insertRes.rows[0].updated_at;
    const token = insertRes.rows[0].session_token;

    // Small delay to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 100));

    const updateRes = await client.query(`
      UPDATE user_sessions SET ip_address = $1 WHERE session_token = $2 RETURNING updated_at
    `, ['10.0.0.1', token]);

    const newUpdatedAt = updateRes.rows[0].updated_at;
    expect(newUpdatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
  });

  it('State-driven: v_active_sessions should only return non-revoked and non-expired sessions', async () => {
    // 1. Active session
    await client.query(`
      INSERT INTO user_sessions (user_id, session_token, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '1 day')
    `, [testUserId, 'active_token']);

    // 2. Revoked session
    await client.query(`
      INSERT INTO user_sessions (user_id, session_token, revoked_at, expires_at)
      VALUES ($1, $2, NOW(), NOW() + INTERVAL '1 day')
    `, [testUserId, 'revoked_token']);

    // 3. Expired session
    await client.query(`
      INSERT INTO user_sessions (user_id, session_token, expires_at)
      VALUES ($1, $2, NOW() - INTERVAL '1 day')
    `, [testUserId, 'expired_token']);

    const res = await client.query('SELECT session_token FROM v_active_sessions');
    
    expect(res.rowCount).toBe(1);
    expect(res.rows[0].session_token).toBe('active_token');
  });
});
