/**
 * TRACEABILITY MATRIX
 *
 * Test Case                                              | EARS Requirement / Spec
 * -------------------------------------------------------|----------------------------------------------------------
 * insertAuditLog - happy path                            | EARS[Ubiquitous]: THE system SHALL log all account state modifications into the `audit_logs` table.
 * insertAuditLog - missing optional fields               | Unwanted/Error Case: Handle null fields like system actions correctly.
 * insertAuditLog - db error handling                     | Backend robust error handling.
 * listAuditLogs - no filters (returns paginated)         | ADM-06: As an Admin, I want to view system activity logs for sensitive actions. (PLAN §2.5 listAuditLogs)
 * listAuditLogs - with multiple filters                  | ADM-06: As an Admin, I want to view system activity logs for sensitive actions.
 * listAuditLogs - empty results (boundary)               | ADM-06 boundary value.
 * listAuditLogs - invalid pagination inputs              | ADM-06 Unwanted/Error Case: Validation of input parameters.
 */

const { insertAuditLog, listAuditLogs } = require('../../../src/db/queries/audit.queries');

describe('Audit Logs Database Queries', () => {
    let mockPool;

    beforeEach(() => {
        mockPool = {
            query: jest.fn()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('insertAuditLog', () => {
        it('should correctly insert an audit log record (Happy Path)', async () => {
            mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

            const logData = {
                actor_id: '123e4567-e89b-12d3-a456-426614174000',
                action: 'user_created',
                target_table: 'users',
                target_id: '123e4567-e89b-12d3-a456-426614174001',
                old_value: { status: 'pending' },
                new_value: { status: 'active' },
                ip_address: '192.168.1.1'
            };

            await insertAuditLog(mockPool, logData);

            expect(mockPool.query).toHaveBeenCalledTimes(1);
            const queryArg = mockPool.query.mock.calls[0][0];
            const valuesArg = mockPool.query.mock.calls[0][1];

            expect(queryArg).toContain('INSERT INTO audit_logs');
            expect(valuesArg).toEqual([
                logData.actor_id,
                logData.action,
                logData.target_table,
                logData.target_id,
                JSON.stringify(logData.old_value),
                JSON.stringify(logData.new_value),
                logData.ip_address
            ]);
        });

        it('should insert an audit log record with null optional fields', async () => {
            mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

            const logData = {
                action: 'user_created',
                target_table: 'users'
            };

            await insertAuditLog(mockPool, logData);

            const valuesArg = mockPool.query.mock.calls[0][1];
            expect(valuesArg).toEqual([
                null, // actor_id
                'user_created',
                'users',
                null, // target_id
                null, // old_value
                null, // new_value
                null  // ip_address
            ]);
        });

        it('should throw an error if the database query fails', async () => {
            const dbError = new Error('Database Error');
            mockPool.query.mockRejectedValueOnce(dbError);

            const logData = {
                action: 'user_created',
                target_table: 'users'
            };

            await expect(insertAuditLog(mockPool, logData)).rejects.toThrow('Database Error');
        });
    });

    describe('listAuditLogs', () => {
        it('should list audit logs with default pagination (no filters)', async () => {
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // Count query
                .mockResolvedValueOnce({ rows: [{ id: '1' }, { id: '2' }] }); // Data query

            const result = await listAuditLogs(mockPool, {});

            expect(result).toEqual({ rows: [{ id: '1' }, { id: '2' }], total: 5 });
            expect(mockPool.query).toHaveBeenCalledTimes(2);

            // First query: COUNT
            expect(mockPool.query.mock.calls[0][0]).toContain('SELECT COUNT(*) FROM audit_logs');
            expect(mockPool.query.mock.calls[0][1]).toEqual([]);

            // Second query: SELECT data
            expect(mockPool.query.mock.calls[1][0]).toContain('ORDER BY created_at DESC');
            expect(mockPool.query.mock.calls[1][0]).toContain('LIMIT $1 OFFSET $2');
            expect(mockPool.query.mock.calls[1][1]).toEqual([20, 0]); // limit 20, offset 0
        });

        it('should list audit logs with custom pagination and filters', async () => {
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // Count query
                .mockResolvedValueOnce({ rows: [{ id: '1' }] }); // Data query

            const filters = {
                page: 2,
                limit: 10,
                actor_id: 'actor-uuid',
                action: 'role_changed',
                target_table: 'users',
                target_id: 'target-uuid'
            };

            await listAuditLogs(mockPool, filters);

            expect(mockPool.query).toHaveBeenCalledTimes(2);

            const countQueryStr = mockPool.query.mock.calls[0][0];
            const countQueryParams = mockPool.query.mock.calls[0][1];
            expect(countQueryStr).toContain('WHERE actor_id = $1 AND action = $2 AND target_table = $3 AND target_id = $4');
            expect(countQueryParams).toEqual([
                'actor-uuid',
                'role_changed',
                'users',
                'target-uuid'
            ]);

            const dataQueryStr = mockPool.query.mock.calls[1][0];
            const dataQueryParams = mockPool.query.mock.calls[1][1];
            expect(dataQueryStr).toContain('LIMIT $5 OFFSET $6');
            expect(dataQueryParams).toEqual([
                'actor-uuid',
                'role_changed',
                'users',
                'target-uuid',
                10, // limit
                10  // offset = (page 2 - 1) * 10
            ]);
        });

        it('should handle zero results correctly (Boundary Value)', async () => {
             mockPool.query
                .mockResolvedValueOnce({ rows: [{ count: '0' }] }) 
                .mockResolvedValueOnce({ rows: [] }); 

            const result = await listAuditLogs(mockPool, { page: 10, limit: 50 });
            
            expect(result.total).toBe(0);
            expect(result.rows).toHaveLength(0);
            
            expect(mockPool.query.mock.calls[1][1]).toEqual([50, 450]); // limit 50, offset 450
        });

        it('should handle invalid pagination inputs gracefully', async () => {
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [] });

            await listAuditLogs(mockPool, { page: -5, limit: 'invalid' });

            const dataQueryParams = mockPool.query.mock.calls[1][1];
            expect(dataQueryParams).toEqual([20, 0]); // Should fallback to default limit 20, offset 0
        });
    });
});
