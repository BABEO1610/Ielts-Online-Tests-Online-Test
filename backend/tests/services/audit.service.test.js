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
const { insertAuditLog } = require('../../src/db/queries/audit.queries');
const pool = require('../../src/db/pool');

// Mock dependencies
jest.mock('../../src/db/queries/audit.queries', () => ({
    insertAuditLog: jest.fn()
}));
jest.mock('../../src/db/pool', () => ({}));

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
            expect(insertAuditLog).toHaveBeenCalledWith(pool, {
                actor_id: 'admin-id-123',
                action: 'role_changed',
                target_table: 'users',
                target_id: 'target-user-456',
                old_value: { role: 'student' },
                new_value: { role: 'admin' },
                ip_address: '192.168.1.1'
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
});
