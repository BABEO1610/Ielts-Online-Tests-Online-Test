/**
 * Traceability Matrix:
 * - Requirement: SPEC.md §6 (Data Models & DB Schema Changes - Bảng audit_logs), SPEC.md §4 (EARS Ubiquitous, Event-driven)
 * - Task: T007 (Migration: Bảng audit_logs)
 * 
 * Test Cases:
 * 1. Happy Path: Should insert a valid audit log record successfully.
 * 2. Error Case (Unwanted): Should fail if ip_address is not a valid INET.
 * 3. Error Case (Unwanted): Should fail if old_value or new_value is not valid JSONB.
 * 4. Error Case (Unwanted): Should fail if action is not in log_action enum.
 * 5. Boundary/Constraint: Should set created_at automatically.
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
        '006_create_audit_logs.sql'
    ];

    for (const file of migrationFiles) {
        const filePath = path.join(__dirname, '../../../src/db/migrations', file);
        const sql = fs.readFileSync(filePath, 'utf-8');
        await pool.query(sql);
    }
});

afterAll(async () => {
    // Dọn dẹp DB sau khi test
    await pool.query('DROP TABLE IF EXISTS audit_logs CASCADE;');
    await pool.query('DROP TABLE IF EXISTS users CASCADE;');
    await pool.query('DROP TYPE IF EXISTS log_action CASCADE;');
    await pool.query('DROP TYPE IF EXISTS user_role CASCADE;');
    await pool.query('DROP TYPE IF EXISTS account_status CASCADE;');
    await pool.query('DROP TYPE IF EXISTS password_change_reason CASCADE;');
    await pool.end();
});

beforeEach(async () => {
    await pool.query('TRUNCATE TABLE audit_logs CASCADE;');
    await pool.query('TRUNCATE TABLE users CASCADE;');
});

describe('Migration: 006_create_audit_logs', () => {
    
    it('Happy Path: Should insert a valid audit log record successfully', async () => {
        // EARS[Event]: WHEN an Admin changes the Role or Status of another User, THE system SHALL update the users record and log the action into audit_logs
        
        // 1. Tạo một user giả để làm actor_id
        const userRes = await pool.query(`
            INSERT INTO users (email, full_name, password_hash, target_band_score)
            VALUES ('test@example.com', 'Test User', '$2b$12$somehash', 6.5)
            RETURNING id;
        `);
        const actorId = userRes.rows[0].id;

        // 2. Insert audit log
        const logRes = await pool.query(`
            INSERT INTO audit_logs (actor_id, action, target_table, target_id, old_value, new_value, ip_address)
            VALUES ($1, 'role_changed', 'users', $1, '{"role": "student"}', '{"role": "admin"}', '192.168.1.100')
            RETURNING *;
        `, [actorId]);

        expect(logRes.rows.length).toBe(1);
        expect(logRes.rows[0].actor_id).toBe(actorId);
        expect(logRes.rows[0].action).toBe('role_changed');
        expect(logRes.rows[0].target_table).toBe('users');
        expect(logRes.rows[0].old_value).toEqual({ role: 'student' });
        expect(logRes.rows[0].new_value).toEqual({ role: 'admin' });
        expect(logRes.rows[0].ip_address).toBe('192.168.1.100'); // Note: node-pg returns inet as string
        expect(logRes.rows[0].created_at).toBeDefined();
    });

    it('Error Case: Should fail if ip_address is not a valid INET format', async () => {
        // EARS[Unwanted]: Prevent insertion of malformed IP addresses
        await expect(pool.query(`
            INSERT INTO audit_logs (action, target_table, ip_address)
            VALUES ('login', 'users', 'not-an-ip-address')
        `)).rejects.toThrow(/invalid input syntax for type inet/);
    });

    it('Error Case: Should fail if old_value or new_value is not valid JSON format', async () => {
        // EARS[Unwanted]: Enforce JSONB data type integrity
        await expect(pool.query(`
            INSERT INTO audit_logs (action, target_table, new_value)
            VALUES ('user_created', 'users', 'invalid-json-string')
        `)).rejects.toThrow(/invalid input syntax for type json/);
    });

    it('Error Case: Should fail if action is not in log_action enum', async () => {
        // EARS[Unwanted]: Enforce enum constraint on action field
        await expect(pool.query(`
            INSERT INTO audit_logs (action, target_table)
            VALUES ('invalid_action_type', 'users')
        `)).rejects.toThrow(/invalid input value for enum log_action/);
    });

    it('Boundary/Constraint: Should automatically set created_at default value', async () => {
        const logRes = await pool.query(`
            INSERT INTO audit_logs (action, target_table)
            VALUES ('login', 'users')
            RETURNING created_at;
        `);

        expect(logRes.rows.length).toBe(1);
        expect(logRes.rows[0].created_at).toBeInstanceOf(Date);
    });

    it('Error Case: Should fail if actor_id references a non-existent user', async () => {
        // FK constraint check
        const fakeUUID = '00000000-0000-0000-0000-000000000000';
        await expect(pool.query(`
            INSERT INTO audit_logs (actor_id, action, target_table)
            VALUES ($1, 'login', 'users')
        `, [fakeUUID])).rejects.toThrow(/violates foreign key constraint/);
    });
});
