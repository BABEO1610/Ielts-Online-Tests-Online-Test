/**
 * @file audit.service.test.js
 * 
 * Traceability Matrix:
 * | Test Case | EARS Requirement | Description |
 * | --- | --- | --- |
 * | should successfully log an action | Ubiquitous: THE system SHALL log all account state modifications into the `audit_logs` table. | Happy path logging |
 * | should throw error if action is missing | Unwanted (implied): Missing required params | Error case: action is required |
 * | should throw error if target_table is missing | Unwanted (implied): Missing required params | Error case: target_table is required |
 * | should throw AppError on DB failure | Unwanted (implied): DB failure | Error case: handle DB query errors properly |
 */

const AuditLogService = require('../../src/services/audit.service');
const {
    insertAuditLog,
    listAuditLogs,
    getAuditLogById,
    markAuditLogUndone,
    getAuditLogSummary
} = require('../../src/db/queries/audit.queries');
const pool = require('../../src/db/pool');

// Mock dependencies
jest.mock('../../src/db/queries/audit.queries', () => ({
    insertAuditLog: jest.fn(),
    listAuditLogs: jest.fn(),
    getAuditLogById: jest.fn(),
    markAuditLogUndone: jest.fn(),
    getAuditLogSummary: jest.fn()
}));
jest.mock('../../src/db/pool', () => ({ pool: {} }));

describe('AuditLogService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logAction', () => {
        it('should successfully log an action (Happy path)', async () => {
            insertAuditLog.mockResolvedValueOnce();

            await AuditLogService.logAction(
                'admin-id-123',
                'role_changed',
                'users',
                'target-user-456',
                { role: 'student' },
                { role: 'admin' },
                '192.168.1.1'
            );

            expect(insertAuditLog).toHaveBeenCalledTimes(1);
            expect(insertAuditLog).toHaveBeenCalledWith(pool.pool, {
                actor_id: 'admin-id-123',
                action: 'role_changed',
                target_table: 'users',
                target_id: 'target-user-456',
                old_value: { role: 'student' },
                new_value: { role: 'admin' },
                ip_address: '192.168.1.1',
                can_undo: false
            });
        });

        it('should throw an AppError (status 400) if action is missing', async () => {
            await expect(AuditLogService.logAction(
                'admin-id-123',
                null, // Missing action
                'users',
                'target-user-456',
                null,
                null,
                '192.168.1.1'
            )).rejects.toMatchObject({
                statusCode: 400,
                message: 'Action and target_table are required to create an audit log'
            });

            expect(insertAuditLog).not.toHaveBeenCalled();
        });

        it('should throw an AppError (status 400) if target_table is missing', async () => {
            await expect(AuditLogService.logAction(
                'admin-id-123',
                'role_changed',
                '', // Missing target_table
                'target-user-456',
                null,
                null,
                '192.168.1.1'
            )).rejects.toMatchObject({
                statusCode: 400,
                message: 'Action and target_table are required to create an audit log'
            });

            expect(insertAuditLog).not.toHaveBeenCalled();
        });

        it('should throw an AppError (status 500) if database insertion fails', async () => {
            const dbError = new Error('DB Connection lost');
            insertAuditLog.mockRejectedValueOnce(dbError);

            await expect(AuditLogService.logAction(
                'admin-id-123',
                'role_changed',
                'users',
                'target-user-456',
                null,
                null,
                '192.168.1.1'
            )).rejects.toMatchObject({
                statusCode: 500,
                message: 'Failed to insert audit log'
            });

            expect(insertAuditLog).toHaveBeenCalledTimes(1);
        });
    });

    describe('listChangeLogs', () => {
        it('should return formatted change logs with summary', async () => {
            listAuditLogs.mockResolvedValueOnce({
                rows: [{
                    id: 'log-1',
                    actor_id: 'admin-1',
                    actor_name: 'Admin One',
                    actor_email: 'admin@example.com',
                    action: 'role_changed',
                    target_table: 'users',
                    target_id: 'user-1',
                    target_user_email: 'student@example.com',
                    created_at: '2026-06-18T10:00:00.000Z',
                    can_undo: true,
                    undone_at: null
                }],
                total: 1
            });
            getAuditLogSummary.mockResolvedValueOnce({ total: 1, undoable: 1, undone: 0 });

            const result = await AuditLogService.listChangeLogs({ page: 1, limit: 20 });

            expect(result.logs[0]).toMatchObject({
                id: 'log-1',
                action_label: 'Đổi vai trò',
                target_label: 'student@example.com',
                status: 'applied',
                can_undo: true
            });
            expect(result.summary).toEqual({ total: 1, undoable: 1, undone: 0 });
        });
    });

    describe('undoChangeLog', () => {
        it('should undo a supported role change inside a transaction', async () => {
            const client = {
                query: jest.fn(),
                release: jest.fn()
            };
            pool.pool.connect = jest.fn().mockResolvedValue(client);

            const sourceLog = {
                id: 'log-1',
                actor_id: 'admin-1',
                action: 'role_changed',
                target_table: 'users',
                target_id: 'user-1',
                old_value: { role: 'student' },
                new_value: { role: 'tutor' },
                can_undo: true,
                undone_at: null
            };

            getAuditLogById
                .mockResolvedValueOnce(sourceLog)
                .mockResolvedValueOnce({
                    ...sourceLog,
                    undone_at: '2026-06-18T11:00:00.000Z',
                    undone_by: 'admin-2',
                    undo_log_id: 'undo-log-1'
                });
            client.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({ rows: [{ id: 'log-1', can_undo: true, undone_at: null }] })
                .mockResolvedValueOnce({ rows: [{ id: 'user-1', role: 'tutor', status: 'active' }] })
                .mockResolvedValueOnce({ rows: [{ id: 'user-1', email: 'student@example.com', full_name: 'Student', role: 'student', status: 'active' }] })
                .mockResolvedValueOnce({}); // COMMIT
            insertAuditLog.mockResolvedValueOnce({
                id: 'undo-log-1',
                actor_id: 'admin-2',
                action: 'change_reverted',
                target_table: 'users',
                target_id: 'user-1',
                old_value: { role: 'tutor', reverted_log_id: 'log-1' },
                new_value: { role: 'student', reverted_log_id: 'log-1' },
                can_undo: false
            });
            markAuditLogUndone.mockResolvedValueOnce({});

            const result = await AuditLogService.undoChangeLog({
                logId: 'log-1',
                actorId: 'admin-2',
                ipAddress: '127.0.0.1'
            });

            expect(client.query).toHaveBeenCalledWith('BEGIN');
            expect(client.query).toHaveBeenCalledWith(expect.stringContaining('SET role = $2'), ['user-1', 'student']);
            expect(insertAuditLog).toHaveBeenCalledWith(client, expect.objectContaining({
                action: 'change_reverted',
                can_undo: false
            }));
            expect(markAuditLogUndone).toHaveBeenCalledWith(client, {
                id: 'log-1',
                undone_by: 'admin-2',
                undo_log_id: 'undo-log-1'
            });
            expect(result.target.role).toBe('student');
            expect(client.release).toHaveBeenCalled();
        });
    });
});
