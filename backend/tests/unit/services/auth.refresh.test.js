/**
 * @file auth.refresh.test.js
 * @description Unit tests for the refreshToken service function.
 * 
 * Traceability Matrix:
 * | Test Case | EARS Requirement | Description |
 * |-----------|------------------|-------------|
 * | Happy Path | Event: WHEN an Access Token expires and the Client calls the Refresh API with a valid Refresh Token, THE system SHALL check the user's status; if active, issue a new Access Token. | Returns a new access token when a valid refresh token is provided. |
 * | Invalid Token | Unwanted: If invalid or expired token, system MUST return null (verifyRefreshToken) and service rejects with HTTP 401. | Rejects with AUTH_SES_001 if the JWT refresh token is invalid or expired. |
 * | Session Revoked | Unwanted: Session revoked or not found -> reject with HTTP 401. | Rejects with AUTH_SES_001 if the session is not found in v_active_sessions. |
 * | User Inactive | Unwanted: User is not active -> reject with HTTP 401. | Rejects with AUTH_SES_001 if the user status is not 'active'. |
 * | User Not Found | Unwanted: User is not found -> reject with HTTP 401. | Rejects with AUTH_SES_001 if the user is not found in the database. |
 */

const { refreshToken } = require('../../../src/services/auth.service');
const { verifyRefreshToken, generateAccessToken } = require('../../../src/utils/token.util');
const { findActiveSession } = require('../../../src/db/queries/sessions.queries');
const { findUserById } = require('../../../src/db/queries/users.queries');

jest.mock('../../../src/utils/token.util');
jest.mock('../../../src/db/queries/sessions.queries');
jest.mock('../../../src/db/queries/users.queries');

describe('Auth Service - refreshToken', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    const mockValidToken = 'valid.refresh.token';
    const mockDecodedToken = { sub: 'user-123', session_token: 'session-xyz' };
    const mockActiveSession = { session_token: 'session-xyz' };
    const mockActiveUser = { id: 'user-123', status: 'active', role: 'student' };
    const mockNewAccessToken = 'new.access.token';

    it('should generate a new access token for a valid refresh token and active user (Happy Path)', async () => {
        // Arrange
        verifyRefreshToken.mockReturnValue(mockDecodedToken);
        findActiveSession.mockResolvedValue(mockActiveSession);
        findUserById.mockResolvedValue(mockActiveUser);
        generateAccessToken.mockReturnValue(mockNewAccessToken);

        // Act
        const result = await refreshToken(mockValidToken);

        // Assert
        expect(verifyRefreshToken).toHaveBeenCalledWith(mockValidToken);
        expect(findActiveSession).toHaveBeenCalledWith(mockDecodedToken.session_token);
        expect(findUserById).toHaveBeenCalledWith(mockDecodedToken.sub);
        expect(generateAccessToken).toHaveBeenCalledWith({
            sub: mockActiveUser.id,
            role: mockActiveUser.role,
            session_token: mockDecodedToken.session_token
        });
        expect(result).toEqual({ accessToken: mockNewAccessToken });
    });

    it('should reject with HTTP 401 if the refresh token is invalid or expired', async () => {
        // Arrange
        verifyRefreshToken.mockReturnValue(null);

        // Act & Assert
        await expect(refreshToken('invalid.token')).rejects.toMatchObject({
            message: 'Session expired.',
            code: 'AUTH_SES_001',
            statusCode: 401
        });
        expect(findActiveSession).not.toHaveBeenCalled();
        expect(findUserById).not.toHaveBeenCalled();
        expect(generateAccessToken).not.toHaveBeenCalled();
    });

    it('should reject with HTTP 401 if the session is not found or revoked', async () => {
        // Arrange
        verifyRefreshToken.mockReturnValue(mockDecodedToken);
        findActiveSession.mockResolvedValue(null); // Session not active

        // Act & Assert
        await expect(refreshToken(mockValidToken)).rejects.toMatchObject({
            message: 'Session expired.',
            code: 'AUTH_SES_001',
            statusCode: 401
        });
        expect(findUserById).not.toHaveBeenCalled();
        expect(generateAccessToken).not.toHaveBeenCalled();
    });

    it('should reject with HTTP 401 if the user status is not active', async () => {
        // Arrange
        verifyRefreshToken.mockReturnValue(mockDecodedToken);
        findActiveSession.mockResolvedValue(mockActiveSession);
        findUserById.mockResolvedValue({ ...mockActiveUser, status: 'inactive' });

        // Act & Assert
        await expect(refreshToken(mockValidToken)).rejects.toMatchObject({
            message: 'Session expired.',
            code: 'AUTH_SES_001',
            statusCode: 401
        });
        expect(generateAccessToken).not.toHaveBeenCalled();
    });

    it('should reject with HTTP 401 if the user is not found', async () => {
        // Arrange
        verifyRefreshToken.mockReturnValue(mockDecodedToken);
        findActiveSession.mockResolvedValue(mockActiveSession);
        findUserById.mockResolvedValue(null);

        // Act & Assert
        await expect(refreshToken(mockValidToken)).rejects.toMatchObject({
            message: 'Session expired.',
            code: 'AUTH_SES_001',
            statusCode: 401
        });
        expect(generateAccessToken).not.toHaveBeenCalled();
    });
});
