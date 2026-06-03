/**
 * @file auth.oauth.test.js
 * @description Unit tests for Google OAuth in AuthService
 * 
 * Traceability Matrix:
 * | Test Case | Requirement Ref (SPEC/PLAN) | Description |
 * |-----------|-----------------------------|-------------|
 * | 1 | PLAN §3 Flow 6, SPEC §6 | Should create new user (password_hash=NULL) and send welcome email |
 * | 2 | PLAN §3 Flow 6, SPEC §6 | Should log in existing active user and NOT send welcome email |
 * | 3 | PLAN §3 Flow 6, SPEC §4 | Should reject Google login if user status is banned |
 * | 4 | SPEC §9 (Edge Cases) | Should revoke oldest session if user already has >= 3 active sessions |
 */

const { loginWithGoogle } = require('../../../src/services/auth.service');
const { upsertGoogleUser } = require('../../../src/db/queries/users.queries');
const { countActiveSessions, revokeOldestSession, createSession } = require('../../../src/db/queries/sessions.queries');
const { sendGoogleWelcomeEmail } = require('../../../src/utils/email.util');
const { generateOpaqueToken, generateAccessToken, generateRefreshToken } = require('../../../src/utils/token.util');

// Mock dependencies
jest.mock('../../../src/db/queries/users.queries');
jest.mock('../../../src/db/queries/sessions.queries');
jest.mock('../../../src/utils/email.util');
jest.mock('../../../src/utils/token.util');
jest.mock('../../../src/db/pool', () => ({
    pool: {
        query: jest.fn()
    }
}));
jest.mock('../../../src/config/redis', () => ({
    delSafe: jest.fn()
}));

describe('AuthService - Google OAuth', () => {
    const mockGoogleProfile = {
        email: 'test@gmail.com',
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg'
    };
    const mockIp = '127.0.0.1';
    const mockUserAgent = 'Mozilla/5.0';

    beforeEach(() => {
        jest.clearAllMocks();
        
        generateOpaqueToken.mockReturnValue({ raw: 'mock_opaque_token', hashed: 'mock_hashed_token' });
        generateAccessToken.mockReturnValue('mock_access_token');
        generateRefreshToken.mockReturnValue('mock_refresh_token');
        countActiveSessions.mockResolvedValue(1);
        createSession.mockResolvedValue();
        revokeOldestSession.mockResolvedValue();
        sendGoogleWelcomeEmail.mockResolvedValue();
    });

    it('1. Should create new user and send welcome email', async () => {
        // Mock upsert returning new user
        upsertGoogleUser.mockResolvedValue({
            id: 'mock-user-id',
            is_new: true,
            user: {
                id: 'mock-user-id',
                email: mockGoogleProfile.email,
                full_name: mockGoogleProfile.full_name,
                role: 'student',
                status: 'active',
                password_hash: null
            }
        });

        const result = await loginWithGoogle(mockGoogleProfile, mockIp, mockUserAgent);

        expect(upsertGoogleUser).toHaveBeenCalledWith({
            email: mockGoogleProfile.email,
            full_name: mockGoogleProfile.full_name,
            avatar_url: mockGoogleProfile.avatar_url
        });
        expect(sendGoogleWelcomeEmail).toHaveBeenCalledWith(mockGoogleProfile.email, mockGoogleProfile.full_name);
        expect(createSession).toHaveBeenCalled();
        expect(generateAccessToken).toHaveBeenCalled();
        expect(generateRefreshToken).toHaveBeenCalled();
        
        expect(result.is_new).toBe(true);
        expect(result.user).not.toHaveProperty('password_hash');
        expect(result.tokens).toEqual({
            accessToken: 'mock_access_token',
            refreshToken: 'mock_refresh_token'
        });
    });

    it('2. Should log in existing active user and NOT send welcome email', async () => {
        upsertGoogleUser.mockResolvedValue({
            id: 'mock-user-id',
            is_new: false,
            user: {
                id: 'mock-user-id',
                email: mockGoogleProfile.email,
                full_name: mockGoogleProfile.full_name,
                role: 'student',
                status: 'active',
                password_hash: 'some_hash'
            }
        });

        const result = await loginWithGoogle(mockGoogleProfile, mockIp, mockUserAgent);

        expect(sendGoogleWelcomeEmail).not.toHaveBeenCalled();
        expect(result.is_new).toBe(false);
        expect(result.user).not.toHaveProperty('password_hash');
    });

    it('3. Should reject Google login if user status is banned', async () => {
        upsertGoogleUser.mockResolvedValue({
            id: 'mock-user-id',
            is_new: false,
            user: {
                id: 'mock-user-id',
                email: mockGoogleProfile.email,
                full_name: mockGoogleProfile.full_name,
                role: 'student',
                status: 'banned',
                password_hash: null
            }
        });

        await expect(loginWithGoogle(mockGoogleProfile, mockIp, mockUserAgent)).rejects.toMatchObject({
            code: 'AUTH_PERM_001',
            statusCode: 403
        });
    });

    it('4. Should revoke oldest session if user already has >= 3 active sessions', async () => {
        upsertGoogleUser.mockResolvedValue({
            id: 'mock-user-id',
            is_new: false,
            user: {
                id: 'mock-user-id',
                email: mockGoogleProfile.email,
                full_name: mockGoogleProfile.full_name,
                role: 'student',
                status: 'active',
                password_hash: null
            }
        });
        countActiveSessions.mockResolvedValue(3);

        await loginWithGoogle(mockGoogleProfile, mockIp, mockUserAgent);

        expect(countActiveSessions).toHaveBeenCalledWith('mock-user-id');
        expect(revokeOldestSession).toHaveBeenCalledWith('mock-user-id');
    });
});
