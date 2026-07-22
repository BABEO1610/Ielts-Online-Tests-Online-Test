/**
 * Traceability Matrix:
 * - SPEC §6: Data Models & DB Schema Changes - password_history table with hash, reason, changed_from_ip (INET).
 * - SPEC §4 (EARS Unwanted): WHERE a User changes their password to one that matches their last 3 hashes in password_history, THE system SHALL return HTTP 400 "Password has been used recently".
 * - EARS[Event]: WHEN a Guest submits a new password via a valid reset link or user changes password, THE system SHALL record the hash, reason, and IP.
 */

const { configureDisposableDatabase } = require('../../helpers/requireDisposableDatabase');
const describeDatabase = configureDisposableDatabase() ? describe : describe.skip;
const { pool } = require('../../../src/db/pool');
const fs = require('fs');
const path = require('path');

describeDatabase('Migration: 004_create_pwd_history.sql', () => {
  let testUserId;

  beforeAll(async () => {
    // Run prerequisite migrations to ensure environment is ready
    const enumsMigration = fs.readFileSync(path.join(__dirname, '../../../src/db/migrations/001_create_enums.sql'), 'utf-8');
    const usersMigration = fs.readFileSync(path.join(__dirname, '../../../src/db/migrations/002_create_users.sql'), 'utf-8');
    const pwdHistoryMigration = fs.readFileSync(path.join(__dirname, '../../../src/db/migrations/004_create_pwd_history.sql'), 'utf-8');
    
    await pool.query(enumsMigration);
    await pool.query(usersMigration);
    await pool.query('DROP TABLE IF EXISTS password_history CASCADE');
    await pool.query(pwdHistoryMigration);

    // Create a dummy user to use for foreign key constraint tests
    const userRes = await pool.query(`
      INSERT INTO users (email, full_name, password_hash) 
      VALUES ($1, $2, $3) 
      ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
      RETURNING id
    `, ['test_pwd_hist@test.com', 'Test User Pwd', 'dummy_hash']);
    
    testUserId = userRes.rows[0].id;
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    await pool.end();
  });

  afterEach(async () => {
    await pool.query('DELETE FROM password_history');
  });

  describe('Happy Path', () => {
    it('should successfully insert a valid password history record', async () => {
      const query = `
        INSERT INTO password_history (user_id, hash, reason, changed_from_ip)
        VALUES ($1, $2, $3, $4)
        RETURNING id, hash, reason, changed_from_ip, created_at
      `;
      const values = [testUserId, 'argon2id$v=19$m=16,t=2,p=1$abc', 'user_initiated', '192.168.1.1'];
      
      const res = await pool.query(query, values);
      
      expect(res.rows.length).toBe(1);
      expect(res.rows[0].hash).toBe('argon2id$v=19$m=16,t=2,p=1$abc');
      expect(res.rows[0].reason).toBe('user_initiated');
      expect(res.rows[0].changed_from_ip).toBe('192.168.1.1');
      expect(res.rows[0].created_at).toBeDefined();
    });
  });

  describe('Error Cases (Boundary & Constraints)', () => {
    it('should throw error when inserting with non-existent user_id (Foreign Key constraint)', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const query = `
        INSERT INTO password_history (user_id, hash, reason, changed_from_ip)
        VALUES ($1, $2, $3, $4)
      `;
      const values = [nonExistentId, 'dummy_hash', 'user_initiated', '192.168.1.1'];
      
      await expect(pool.query(query, values)).rejects.toThrow(/violates foreign key constraint/);
    });

    it('should throw error when inserting invalid INET value', async () => {
      const query = `
        INSERT INTO password_history (user_id, hash, reason, changed_from_ip)
        VALUES ($1, $2, $3, $4)
      `;
      const values = [testUserId, 'dummy_hash', 'user_initiated', 'not_an_ip_address'];
      
      await expect(pool.query(query, values)).rejects.toThrow(/invalid input syntax for type inet/);
    });

    it('should throw error when inserting invalid reason (Enum constraint)', async () => {
      const query = `
        INSERT INTO password_history (user_id, hash, reason, changed_from_ip)
        VALUES ($1, $2, $3, $4)
      `;
      const values = [testUserId, 'dummy_hash', 'invalid_reason_enum', '127.0.0.1'];
      
      await expect(pool.query(query, values)).rejects.toThrow(/invalid input value for enum password_change_reason/);
    });
    
    it('should enforce NOT NULL on required fields', async () => {
      const query = `
        INSERT INTO password_history (user_id, hash, reason, changed_from_ip)
        VALUES ($1, $2, $3, $4)
      `;
      // Null hash
      const values = [testUserId, null, 'user_initiated', '127.0.0.1'];
      
      await expect(pool.query(query, values)).rejects.toThrow(/null value in column "hash".*violates not-null constraint/);
    });
  });
});
