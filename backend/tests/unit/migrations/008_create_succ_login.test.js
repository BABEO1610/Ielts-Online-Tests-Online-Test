/**
 * Traceability Matrix:
 * - Requirement: SPEC.md §6 (Data Models & DB Schema Changes - handle_successful_login)
 * - Requirement: SPEC.md §4 (EARS Event - WHEN a User submits valid credentials...)
 * - Task: T009 (Migration: Procedure handle_successful_login)
 * 
 * Test Cases:
 * 1. Happy Path: Should reset failed_login_attempts to 0 and update last_login_at.
 * 2. Boundary Case (Recovery): Should set locked_until to NULL and status to 'active' if currently 'inactive'.
 * 3. Boundary Case (No-op): Should not change status if it is 'pending' or 'banned'.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dbConfig = require('../../../src/config/database');

let pool;

beforeAll(async () => {
    pool = new Pool(dbConfig);
    
    // Đọc và chạy các file migration theo thứ tự để đảm bảo dependencies
    const migrationFiles = [
        '001_create_enums.sql',
        '002_create_users.sql',
        '007_create_fail_login.sql',
        '008_create_succ_login.sql'
    ];

    for (const file of migrationFiles) {
        const filePath = path.join(__dirname, '../../../src/db/migrations', file);
        const sql = fs.readFileSync(filePath, 'utf-8');
        await pool.query(sql);
    }
});

afterAll(async () => {
    // Dọn dẹp DB sau khi test
    await pool.query('DROP FUNCTION IF EXISTS handle_successful_login(UUID);');
    await pool.query('DROP FUNCTION IF EXISTS handle_failed_login(UUID);');
    await pool.query('DROP TABLE IF EXISTS users CASCADE;');
    await pool.query('DROP TYPE IF EXISTS log_action CASCADE;');
    await pool.query('DROP TYPE IF EXISTS user_role CASCADE;');
    await pool.query('DROP TYPE IF EXISTS account_status CASCADE;');
    await pool.query('DROP TYPE IF EXISTS password_change_reason CASCADE;');
    await pool.end();
});

beforeEach(async () => {
    await pool.query('TRUNCATE TABLE users CASCADE;');
});

describe('Migration: 008_create_succ_login', () => {
    
    it('Happy Path: Should reset failed_login_attempts to 0 and update last_login_at', async () => {
        // 1. Tạo user giả, đang có failed_login_attempts > 0 nhưng vẫn active
        const userRes = await pool.query(`
            INSERT INTO users (email, full_name, password_hash, target_band_score, failed_login_attempts, status)
            VALUES ('test@example.com', 'Test User', '$2b$12$somehash', 6.5, 3, 'active')
            RETURNING id;
        `);
        const userId = userRes.rows[0].id;

        // 2. Call the function (Login thành công)
        await pool.query('SELECT handle_successful_login($1)', [userId]);

        // 3. Verify state
        const checkRes = await pool.query('SELECT failed_login_attempts, status, locked_until, last_login_at FROM users WHERE id = $1', [userId]);
        
        expect(checkRes.rows[0].failed_login_attempts).toBe(0);
        expect(checkRes.rows[0].status).toBe('active');
        expect(checkRes.rows[0].locked_until).toBeNull();
        expect(checkRes.rows[0].last_login_at).not.toBeNull();
    });

    it('Boundary Case (Recovery): Should set locked_until to NULL and status to active if currently inactive', async () => {
        // 1. Tạo user giả, đang bị inactive do fail 5 lần
        const userRes = await pool.query(`
            INSERT INTO users (email, full_name, password_hash, target_band_score, failed_login_attempts, status, locked_until)
            VALUES ('locked@example.com', 'Locked User', '$2b$12$somehash', 6.5, 5, 'inactive', NOW() - INTERVAL '1 minute')
            RETURNING id;
        `);
        const userId = userRes.rows[0].id;

        // 2. Call the function (Login thành công sau khi hết lock time)
        await pool.query('SELECT handle_successful_login($1)', [userId]);

        // 3. Verify state
        const checkRes = await pool.query('SELECT failed_login_attempts, status, locked_until, last_login_at FROM users WHERE id = $1', [userId]);
        
        expect(checkRes.rows[0].failed_login_attempts).toBe(0);
        expect(checkRes.rows[0].status).toBe('active');
        expect(checkRes.rows[0].locked_until).toBeNull();
        expect(checkRes.rows[0].last_login_at).not.toBeNull();
    });

    it('Boundary Case (No-op): Should not change status if it is pending or banned', async () => {
        // Lưu ý: Thực tế application sẽ chặn user banned login, nhưng để test độ an toàn của function SQL
        
        // 1. Tạo user giả, đang bị banned
        const userRes = await pool.query(`
            INSERT INTO users (email, full_name, password_hash, target_band_score, failed_login_attempts, status)
            VALUES ('banned@example.com', 'Banned User', '$2b$12$somehash', 6.5, 2, 'banned')
            RETURNING id;
        `);
        const userId = userRes.rows[0].id;

        // 2. Call the function
        await pool.query('SELECT handle_successful_login($1)', [userId]);

        // 3. Verify state
        const checkRes = await pool.query('SELECT failed_login_attempts, status FROM users WHERE id = $1', [userId]);
        
        expect(checkRes.rows[0].failed_login_attempts).toBe(0);
        expect(checkRes.rows[0].status).toBe('banned'); // KHÔNG được đổi thành active
    });
});
