/**
 * @file auth.verify.test.js
 * @description Unit tests for the verifyEmail function in auth.service.js.
 * 
 * Traceability Matrix:
 * - Happy Path: Map to SPEC §4 Event-driven ("WHEN a Guest accesses a valid verification link (< 24h), THE system SHALL update status = 'active', record used_at = NOW(), and redirect to the Login page.")
 * - Error Case 1 (Token not found/used): Map to Boundary/Edge case handling for invalid tokens.
 * - Error Case 2 (Token expired): Map to SPEC §4 Event-driven (validity must be < 24h).
 */

const { verifyEmail } = require('../../../src/services/auth.service');
const { hashOTP } = require('../../../src/utils/password.util');
const { findVerificationToken, markVerificationTokenUsed } = require('../../../src/db/queries/tokens.queries');
const { updateStatus } = require('../../../src/db/queries/users.queries');
const { pool } = require('../../../src/db/pool');

// Mock dependencies
jest.mock('../../../src/utils/password.util');
jest.mock('../../../src/db/queries/tokens.queries');
jest.mock('../../../src/db/queries/users.queries');
jest.mock('../../../src/db/pool', () => ({
    pool: {} // Dummy pool object for passing to queries
}));

describe('Auth Service - verifyEmail', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should successfully verify email, activate user, and mark token as used (Happy Path)', async () => {
        // Arrange
        const rawToken = 'valid_token_123';
        const hashedToken = 'hashed_valid_token_123';
        const userId = 'user-uuid-123';
        const tokenId = 1;
        
        const futureDate = new Date();
        futureDate.setHours(futureDate.getHours() + 2); // Expiring in 2 hours

        hashOTP.mockReturnValue(hashedToken);
        
        findVerificationToken.mockResolvedValue({
            id: tokenId,
            user_id: userId,
            expires_at: futureDate,
            used_at: null
        });

        updateStatus.mockResolvedValue({ id: userId, status: 'active' });
        markVerificationTokenUsed.mockResolvedValue();

        // Act
        const result = await verifyEmail(rawToken);

        // Assert
        expect(hashOTP).toHaveBeenCalledWith(rawToken);
        expect(findVerificationToken).toHaveBeenCalledWith(pool, hashedToken);
        expect(updateStatus).toHaveBeenCalledWith(userId, 'active');
        expect(markVerificationTokenUsed).toHaveBeenCalledWith(pool, tokenId);
        expect(result).toEqual({ message: "Email verified successfully." });
    });

    it('should throw an error if the token is invalid or already used (Error Case 1)', async () => {
        // Arrange
        const rawToken = 'invalid_or_used_token';
        const hashedToken = 'hashed_invalid_or_used_token';

        hashOTP.mockReturnValue(hashedToken);
        
        // Simulate token not found (or already has used_at != null filtered out by query)
        findVerificationToken.mockResolvedValue(null);

        // Act & Assert
        await expect(verifyEmail(rawToken)).rejects.toThrow('Invalid or used verification token.');
        
        try {
            await verifyEmail(rawToken);
        } catch (error) {
            expect(error.code).toBe('AUTH_VERIFY_001');
            expect(error.statusCode).toBe(400);
        }

        expect(hashOTP).toHaveBeenCalledWith(rawToken);
        expect(findVerificationToken).toHaveBeenCalledWith(pool, hashedToken);
        expect(updateStatus).not.toHaveBeenCalled();
        expect(markVerificationTokenUsed).not.toHaveBeenCalled();
    });

    it('should throw an error if the token has expired (Error Case 2)', async () => {
        // Arrange
        const rawToken = 'expired_token';
        const hashedToken = 'hashed_expired_token';
        const userId = 'user-uuid-123';
        const tokenId = 2;

        const pastDate = new Date();
        pastDate.setHours(pastDate.getHours() - 1); // Expired 1 hour ago

        hashOTP.mockReturnValue(hashedToken);
        
        findVerificationToken.mockResolvedValue({
            id: tokenId,
            user_id: userId,
            expires_at: pastDate,
            used_at: null
        });

        // Act & Assert
        await expect(verifyEmail(rawToken)).rejects.toThrow('Verification token has expired.');

        try {
            await verifyEmail(rawToken);
        } catch (error) {
            expect(error.code).toBe('AUTH_VERIFY_002');
            expect(error.statusCode).toBe(400);
        }

        expect(hashOTP).toHaveBeenCalledWith(rawToken);
        expect(findVerificationToken).toHaveBeenCalledWith(pool, hashedToken);
        expect(updateStatus).not.toHaveBeenCalled();
        expect(markVerificationTokenUsed).not.toHaveBeenCalled();
    });
});
