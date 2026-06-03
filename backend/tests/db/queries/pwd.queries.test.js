/**
 * Traceability Matrix:
 * - PLAN §2.4: Hàm updatePasswordHash và getLastNPasswordHashes.
 * - SPEC §6 / EARS[Event]: Update password and record to password_history atomically.
 * - SPEC §6 / EARS[Unwanted]: Ensure returning the last N password hashes correctly.
 */

const {
    updatePasswordHash,
    getLastNPasswordHashes
} = require('../../../src/db/queries/pwd.queries');

describe('Password History Queries', () => {
    let mockClient;
    let mockPool;
    
    beforeEach(() => {
        mockClient = {
            query: jest.fn(),
            release: jest.fn()
        };
        mockPool = {
            connect: jest.fn().mockResolvedValue(mockClient),
            query: jest.fn() // Used for non-transaction queries
        };
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('updatePasswordHash', () => {
        it('should execute UPDATE and INSERT in a transaction and commit', async () => {
            mockClient.query.mockResolvedValueOnce({}); // BEGIN
            mockClient.query.mockResolvedValueOnce({}); // UPDATE users
            mockClient.query.mockResolvedValueOnce({}); // INSERT password_history
            mockClient.query.mockResolvedValueOnce({}); // COMMIT
            
            const params = {
                user_id: 'user-uuid',
                new_hash: 'new-hashed-password',
                reason: 'reset_via_email',
                ip_address: '192.168.1.1'
            };
            
            await updatePasswordHash(mockPool, params);
            
            expect(mockPool.connect).toHaveBeenCalledTimes(1);
            expect(mockClient.query).toHaveBeenCalledTimes(4);
            expect(mockClient.query.mock.calls[0][0]).toBe('BEGIN');
            expect(mockClient.query.mock.calls[1][0]).toContain('UPDATE users');
            expect(mockClient.query.mock.calls[1][1]).toEqual([params.new_hash, params.user_id]);
            expect(mockClient.query.mock.calls[2][0]).toContain('INSERT INTO password_history');
            expect(mockClient.query.mock.calls[2][1]).toEqual([params.user_id, params.new_hash, params.reason, params.ip_address]);
            expect(mockClient.query.mock.calls[3][0]).toBe('COMMIT');
            expect(mockClient.release).toHaveBeenCalledTimes(1);
        });

        it('should rollback transaction and throw error on failure', async () => {
            const dbError = new Error('Constraint violation');
            mockClient.query.mockResolvedValueOnce({}); // BEGIN
            mockClient.query.mockRejectedValueOnce(dbError); // UPDATE throws
            
            await expect(updatePasswordHash(mockPool, {
                user_id: 'u1', new_hash: 'h1', reason: 'reset', ip_address: '1.1.1.1'
            })).rejects.toThrow('Constraint violation');
            
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalledTimes(1);
        });
    });

    describe('getLastNPasswordHashes', () => {
        it('should execute SELECT query and return an array of strings', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ hash: 'hash1' }, { hash: 'hash2' }, { hash: 'hash3' }]
            });
            
            const result = await getLastNPasswordHashes(mockPool, 'user-uuid', 3);
            
            expect(mockPool.query).toHaveBeenCalledTimes(1);
            expect(mockPool.query.mock.calls[0][0]).toContain('ORDER BY created_at DESC');
            expect(mockPool.query.mock.calls[0][0]).toContain('LIMIT $2');
            expect(mockPool.query.mock.calls[0][1]).toEqual(['user-uuid', 3]);
            
            expect(result).toEqual(['hash1', 'hash2', 'hash3']);
        });

        it('should return empty array if no history exists', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            
            const result = await getLastNPasswordHashes(mockPool, 'user-uuid', 3);
            
            expect(result).toEqual([]);
        });
    });
});
