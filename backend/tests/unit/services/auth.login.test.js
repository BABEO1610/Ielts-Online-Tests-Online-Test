/**
 * @file auth.login.test.js
 * @description Unit tests for authentication login and session management
 * 
 * Traceability Matrix:
 * | Test Case | Requirement ID (SPEC) | Description |
 * | :--- | :--- | :--- |
 * | TC_LOGIN_01 | REQ-AUTH-005, EARS[Event] | Happy path: Login success, create session, return tokens |
 * | TC_LOGIN_02 | REQ-AUTH-006, EARS[Event] | Login success with 3 active sessions: Revoke oldest session first |
 * | TC_LOGIN_03 | REQ-AUTH-004, EARS[Unwanted] | Login fail: Incorrect email or password |
 * | TC_LOGIN_04 | REQ-AUTH-007, EARS[Unwanted] | Login fail: Account temporarily locked due to brute-force |
 * | TC_LOGIN_05 | REQ-AUTH-008, EARS[Unwanted] | Login fail: User banned or pending |
 */

const { login } = require('../../../src/services/auth.service');
const { findUserByEmail } = require('../../../src/db/queries/users.queries');
const { countActiveSessions, revokeOldestSession, createSession } = require('../../../src/db/queries/sessions.queries');
const { verifyPassword } = require('../../../src/utils/password.util');
const { generateOpaqueToken, generateAccessToken, generateRefreshToken } = require('../../../src/utils/token.util');
const { pool } = require('../../../src/db/pool');

// Mock all dependencies
jest.mock('../../../src/db/queries/users.queries');
jest.mock('../../../src/db/queries/sessions.queries');
jest.mock('../../../src/utils/password.util');
jest.mock('../../../src/utils/token.util');
jest.mock('../../../src/db/pool', () => ({
    pool: {
        query: jest.fn()
    }
}));

describe('Auth Service - Login (Sessions)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('login()', () => {
        const mockEmail = 'test@example.com';
        const mockPassword = 'password123';
        const mockIpAddress = '127.0.0.1';
        const mockUserAgent = 'Mozilla/5.0';

        const mockUser = {
            id: 'uuid-1234',
            email: mockEmail,
            password_hash: 'hashed_pwd',
            role: 'student',
            status: 'active',
            locked_until: null
        };

        it('TC_LOGIN_01: should login successfully, create a new session, and return tokens', async () => {
            // Arrange
            findUserByEmail.mockResolvedValue(mockUser);
            verifyPassword.mockResolvedValue(true);
            pool.query.mockResolvedValue({}); // handle_successful_login
            
            countActiveSessions.mockResolvedValue(1); // 1 active session, < 3
            
            generateOpaqueToken.mockReturnValue({ raw: 'opaque_token_123' });
            generateAccessToken.mockReturnValue('access_jwt');
            generateRefreshToken.mockReturnValue('refresh_jwt');
            
            createSession.mockResolvedValue({});

            // Act
            const result = await login(mockEmail, mockPassword, mockIpAddress, mockUserAgent);

            // Assert
            expect(verifyPassword).toHaveBeenCalledWith(mockPassword, mockUser.password_hash);
            expect(pool.query).toHaveBeenCalledWith('SELECT handle_successful_login($1)', [mockUser.id]);
            expect(countActiveSessions).toHaveBeenCalledWith(mockUser.id);
            expect(revokeOldestSession).not.toHaveBeenCalled();
            expect(createSession).toHaveBeenCalledWith(
                mockUser.id, 
                'opaque_token_123', 
                mockIpAddress, 
                mockUserAgent, 
                expect.any(Date)
            );
            
            expect(result.tokens.accessToken).toBe('access_jwt');
            expect(result.tokens.refreshToken).toBe('refresh_jwt');
            expect(result.user).not.toHaveProperty('password_hash');
            expect(result.user.email).toBe(mockEmail);
        });

        it('TC_LOGIN_02: should revoke oldest session if active sessions >= 3', async () => {
            // Arrange
            findUserByEmail.mockResolvedValue(mockUser);
            verifyPassword.mockResolvedValue(true);
            pool.query.mockResolvedValue({});
            
            countActiveSessions.mockResolvedValue(3); // >= 3
            revokeOldestSession.mockResolvedValue({});
            
            generateOpaqueToken.mockReturnValue({ raw: 'opaque_token_123' });
            generateAccessToken.mockReturnValue('access_jwt');
            generateRefreshToken.mockReturnValue('refresh_jwt');
            
            // Act
            await login(mockEmail, mockPassword, mockIpAddress, mockUserAgent);

            // Assert
            expect(countActiveSessions).toHaveBeenCalledWith(mockUser.id);
            expect(revokeOldestSession).toHaveBeenCalledWith(mockUser.id);
            expect(createSession).toHaveBeenCalled();
        });

        it('TC_LOGIN_03: should throw 401 error if password incorrect', async () => {
            // Arrange
            findUserByEmail.mockResolvedValue(mockUser);
            verifyPassword.mockResolvedValue(false);
            pool.query.mockResolvedValue({}); // handle_failed_login

            // Act & Assert
            await expect(login(mockEmail, mockPassword, mockIpAddress, mockUserAgent))
                .rejects.toMatchObject({
                    message: 'Incorrect email or password.',
                    code: 'AUTH_LOG_001',
                    statusCode: 401
                });
            
            expect(pool.query).toHaveBeenCalledWith('SELECT handle_failed_login($1)', [mockUser.id]);
            expect(createSession).not.toHaveBeenCalled();
        });

        it('TC_LOGIN_04: should throw 429 error if account temporarily locked', async () => {
            // Arrange
            const lockedUser = {
                ...mockUser,
                locked_until: new Date(Date.now() + 10 * 60 * 1000) // Locked for 10 more minutes
            };
            findUserByEmail.mockResolvedValue(lockedUser);

            // Act & Assert
            await expect(login(mockEmail, mockPassword, mockIpAddress, mockUserAgent))
                .rejects.toMatchObject({
                    message: 'Account temporarily locked due to multiple failed attempts. Try again in 15 minutes.',
                    code: 'AUTH_LOG_002',
                    statusCode: 429
                });
            
            expect(verifyPassword).not.toHaveBeenCalled();
            expect(createSession).not.toHaveBeenCalled();
        });

        it('TC_LOGIN_05: should throw 403 error if user is banned or pending', async () => {
            // Arrange
            const bannedUser = {
                ...mockUser,
                status: 'banned'
            };
            findUserByEmail.mockResolvedValue(bannedUser);
            verifyPassword.mockResolvedValue(true);

            // Act & Assert
            await expect(login(mockEmail, mockPassword, mockIpAddress, mockUserAgent))
                .rejects.toMatchObject({
                    message: 'You do not have permission to perform this action.',
                    code: 'AUTH_PERM_001',
                    statusCode: 403
                });
            
            expect(createSession).not.toHaveBeenCalled();
        });
    });
});
