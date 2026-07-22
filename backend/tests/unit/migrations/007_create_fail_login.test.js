/**
 * Traceability Matrix:
 * - Requirement: SPEC.md §6 (Data Models & DB Schema Changes - handle_failed_login)
 * - Requirement: SPEC.md §4 (EARS Unwanted - WHERE a User inputs an incorrect password...)
 * - Requirement: SPEC.md §4 (EARS Unwanted - WHERE a User has failed_login_attempts >= 5...)
 * - Task: T008 (Migration: Procedure handle_failed_login)
 * 
 * Test Cases:
 * 1. Happy Path: Should increment failed_login_attempts but not lock if attempts < 5.
 * 2. Boundary Case (Unwanted): Should set status='inactive' and locked_until if failed_login_attempts >= 5.
 * 3. Boundary Case (Unwanted): Should remain locked and keep incrementing if attempts > 5.
 */

const { configureDisposableDatabase } = require('../../helpers/requireDisposableDatabase');
const describeDatabase = configureDisposableDatabase() ? describe : describe.skip;
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
        '007_create_fail_login.sql'
    ];

    for (const file of migrationFiles) {
        const filePath = path.join(__dirname, '../../../src/db/migrations', file);
        const sql = fs.readFileSync(filePath, 'utf-8');
        await pool.query(sql);
    }
});

afterAll(async () => {
    // Dọn dẹp DB sau khi test
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

describeDatabase('Migration: 007_create_fail_login', () => {
    
    it('Happy Path: Should increment failed_login_attempts if attempts < 5', async () => {
        // EARS[Unwanted]: WHERE a User inputs an incorrect password, THE system SHALL call the DB function handle_failed_login()
        
        // 1. Tạo user giả, trạng thái đang là active
        const userRes = await pool.query(`
            INSERT INTO users (email, full_name, password_hash, target_band_score, status)
            VALUES ('test@example.com', 'Test User', '$2b$12$somehash', 6.5, 'active')
            RETURNING id;
        `);
        const userId = userRes.rows[0].id;

        // 2. Call the function (Sai lần 1)
        await pool.query('SELECT handle_failed_login($1)', [userId]);

        // 3. Verify state
        const checkRes = await pool.query('SELECT failed_login_attempts, status, locked_until FROM users WHERE id = $1', [userId]);
        
        expect(checkRes.rows[0].failed_login_attempts).toBe(1);
        expect(checkRes.rows[0].status).toBe('active'); // Account vẫn bình thường
        expect(checkRes.rows[0].locked_until).toBeNull();
    });

    it('Boundary Case (Unwanted): Should lock account when failed_login_attempts reaches 5', async () => {
        // EARS[Unwanted]: WHERE a User has failed_login_attempts >= 5, THE system SHALL lock the login flow for 15 minutes
        
        // 1. Tạo user giả, đã sai 4 lần
        const userRes = await pool.query(`
            INSERT INTO users (email, full_name, password_hash, target_band_score, failed_login_attempts, status)
            VALUES ('lock@example.com', 'Lock User', '$2b$12$somehash', 6.5, 4, 'active')
            RETURNING id;
        `);
        const userId = userRes.rows[0].id;

        // 2. Call the function (Sai lần thứ 5)
        await pool.query('SELECT handle_failed_login($1)', [userId]);

        // 3. Verify state
        const checkRes = await pool.query('SELECT failed_login_attempts, status, locked_until FROM users WHERE id = $1', [userId]);
        
        expect(checkRes.rows[0].failed_login_attempts).toBe(5);
        expect(checkRes.rows[0].status).toBe('inactive'); // Account bị inactive
        
        // Kiểm tra locked_until có giá trị (không null) và tương lai
        expect(checkRes.rows[0].locked_until).not.toBeNull();
        const lockedUntil = new Date(checkRes.rows[0].locked_until).getTime();
        const now = Date.now();
        expect(lockedUntil).toBeGreaterThan(now);
    });

    it('Boundary Case (Unwanted): Should remain locked and keep incrementing if attempts > 5', async () => {
        // 1. Tạo user giả, đã sai 5 lần, đang bị inactive và có locked_until
        const userRes = await pool.query(`
            INSERT INTO users (email, full_name, password_hash, target_band_score, failed_login_attempts, status, locked_until)
            VALUES ('more@example.com', 'More User', '$2b$12$somehash', 6.5, 5, 'inactive', NOW() + INTERVAL '15 minutes')
            RETURNING id;
        `);
        const userId = userRes.rows[0].id;

        // 2. Call the function (Sai lần thứ 6)
        await pool.query('SELECT handle_failed_login($1)', [userId]);

        // 3. Verify state
        const checkRes = await pool.query('SELECT failed_login_attempts, status, locked_until FROM users WHERE id = $1', [userId]);
        
        expect(checkRes.rows[0].failed_login_attempts).toBe(6);
        expect(checkRes.rows[0].status).toBe('inactive'); // Vẫn là inactive
        expect(checkRes.rows[0].locked_until).not.toBeNull();
    });

});
