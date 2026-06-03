/**
 * @file auth.logout.test.js
 * 
 * Traceability Matrix:
 * - EARS[Event]: WHEN a User calls the Logout API, THE system SHALL update revoked_at = NOW() for the corresponding user_sessions record.
 */

const { logout } = require('../../../src/services/auth.service');
const { revokeSession } = require('../../../src/db/queries/sessions.queries');
const { delSafe } = require('../../../src/config/redis');

// Mock dependencies
jest.mock('../../../src/db/queries/sessions.queries');
jest.mock('../../../src/config/redis');
jest.mock('../../../src/db/pool', () => ({
    pool: {
        query: jest.fn()
    }
}));
jest.mock('../../../src/db/queries/users.queries');
jest.mock('../../../src/db/queries/tokens.queries');
jest.mock('../../../src/utils/password.util');
jest.mock('../../../src/utils/token.util');
jest.mock('../../../src/utils/email.util');

describe('Auth Service - Logout', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should successfully revoke session in DB and delete Redis key (Happy Path)', async () => {
        const mockSessionToken = 'mock-session-token-123';
        
        // Mock implementations
        revokeSession.mockResolvedValue({ id: 1, session_token: mockSessionToken });
        delSafe.mockResolvedValue(true);

        await logout(mockSessionToken);

        expect(revokeSession).toHaveBeenCalledTimes(1);
        expect(revokeSession).toHaveBeenCalledWith(mockSessionToken);
        
        expect(delSafe).toHaveBeenCalledTimes(1);
        expect(delSafe).toHaveBeenCalledWith(`session:${mockSessionToken}`);
    });

    it('should do nothing if sessionToken is not provided (Boundary Value)', async () => {
        await logout();
        await logout(null);
        await logout('');

        expect(revokeSession).not.toHaveBeenCalled();
        expect(delSafe).not.toHaveBeenCalled();
    });

    it('should throw error if revokeSession in DB fails (Error Case)', async () => {
        const mockSessionToken = 'mock-session-token-123';
        const dbError = new Error('Database connection failed');
        
        revokeSession.mockRejectedValue(dbError);

        await expect(logout(mockSessionToken)).rejects.toThrow('Database connection failed');

        expect(revokeSession).toHaveBeenCalledTimes(1);
        expect(delSafe).not.toHaveBeenCalled();
    });
});
