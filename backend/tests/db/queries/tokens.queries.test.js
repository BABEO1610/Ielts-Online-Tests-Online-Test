/**
 * Traceability Matrix:
 * - PLAN §2.4: Hàm CRUD cho verification tokens, reset tokens.
 * - SPEC §6 / EARS[Event]: Token generation and validation logic for email verification and password reset.
 */

const {
    createVerificationToken,
    findVerificationToken,
    markVerificationTokenUsed,
    createPasswordResetToken,
    findPasswordResetToken,
    markResetTokenUsed
} = require('../../../src/db/queries/tokens.queries');

describe('Tokens Queries', () => {
    let mockPool;
    
    beforeEach(() => {
        mockPool = {
            query: jest.fn()
        };
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createVerificationToken', () => {
        it('should execute INSERT query and return id', async () => {
            const mockId = '11111111-1111-1111-1111-111111111111';
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: mockId }] });
            
            const params = {
                user_id: 'user-id-123',
                token_hash: 'hash-xyz',
                expires_at: new Date()
            };
            
            const result = await createVerificationToken(mockPool, params);
            
            expect(mockPool.query).toHaveBeenCalledTimes(1);
            expect(mockPool.query.mock.calls[0][0]).toContain('INSERT INTO email_verification_tokens');
            expect(mockPool.query.mock.calls[0][1]).toEqual([params.user_id, params.token_hash, params.expires_at]);
            expect(result).toEqual({ id: mockId });
        });
        
        it('should propagate database error', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));
            await expect(createVerificationToken(mockPool, {})).rejects.toThrow('DB Error');
        });
    });

    describe('findVerificationToken', () => {
        it('should execute SELECT query and return token if found', async () => {
            const mockToken = { id: 'uuid', user_id: 'user-uuid', expires_at: new Date(), used_at: null };
            mockPool.query.mockResolvedValueOnce({ rows: [mockToken] });
            
            const result = await findVerificationToken(mockPool, 'hash-xyz');
            
            expect(mockPool.query).toHaveBeenCalledTimes(1);
            expect(mockPool.query.mock.calls[0][0]).toContain('SELECT id, user_id, expires_at, used_at');
            expect(mockPool.query.mock.calls[0][1]).toEqual(['hash-xyz']);
            expect(result).toEqual(mockToken);
        });

        it('should return null if no token is found', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            
            const result = await findVerificationToken(mockPool, 'invalid-hash');
            expect(result).toBeNull();
        });
    });

    describe('markVerificationTokenUsed', () => {
        it('should execute UPDATE query', async () => {
            mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
            
            await markVerificationTokenUsed(mockPool, 'token-id-123');
            
            expect(mockPool.query).toHaveBeenCalledTimes(1);
            expect(mockPool.query.mock.calls[0][0]).toContain('UPDATE email_verification_tokens');
            expect(mockPool.query.mock.calls[0][1]).toEqual(['token-id-123']);
        });
    });

    describe('createPasswordResetToken', () => {
        it('should execute INSERT query and return id', async () => {
            const mockId = '22222222-2222-2222-2222-222222222222';
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: mockId }] });
            
            const params = {
                user_id: 'user-id-456',
                token_hash: 'hash-abc',
                expires_at: new Date()
            };
            
            const result = await createPasswordResetToken(mockPool, params);
            
            expect(mockPool.query).toHaveBeenCalledTimes(1);
            expect(mockPool.query.mock.calls[0][0]).toContain('INSERT INTO password_reset_tokens');
            expect(result).toEqual({ id: mockId });
        });
    });

    describe('findPasswordResetToken', () => {
        it('should execute SELECT query checking used_at IS NULL AND expires_at > NOW()', async () => {
            const mockToken = { id: 'uuid', user_id: 'user-uuid', expires_at: new Date(), used_at: null };
            mockPool.query.mockResolvedValueOnce({ rows: [mockToken] });
            
            const result = await findPasswordResetToken(mockPool, 'reset-hash');
            
            expect(mockPool.query).toHaveBeenCalledTimes(1);
            expect(mockPool.query.mock.calls[0][0]).toContain('WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()');
            expect(mockPool.query.mock.calls[0][1]).toEqual(['reset-hash']);
            expect(result).toEqual(mockToken);
        });

        it('should return null if expired, used, or not found', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            
            const result = await findPasswordResetToken(mockPool, 'invalid-reset');
            expect(result).toBeNull();
        });
    });

    describe('markResetTokenUsed', () => {
        it('should execute UPDATE query', async () => {
            mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
            
            await markResetTokenUsed(mockPool, 'reset-token-id-456');
            
            expect(mockPool.query).toHaveBeenCalledTimes(1);
            expect(mockPool.query.mock.calls[0][0]).toContain('UPDATE password_reset_tokens');
            expect(mockPool.query.mock.calls[0][1]).toEqual(['reset-token-id-456']);
        });
    });
});
