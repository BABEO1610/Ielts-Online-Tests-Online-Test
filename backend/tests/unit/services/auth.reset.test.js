/**
 * @file auth.reset.test.js
 * @description Unit tests for Service Auth: Reset Password
 *
 * Traceability Matrix:
 * | Test Case | Requirement (EARS) | Description |
 * |-----------|--------------------|-------------|
 * | Reset - Happy Path | Event-driven (T025) | WHEN a Guest submits a new password via a valid reset link, THE system SHALL update password_hash and set used_at = NOW(). If inactive, switch to active. |
 * | Reset - Invalid Token | Unwanted | Token not found, expired or already used. Should throw 400. |
 * | Reset - User Not Found | Unwanted | User associated with token not found. Should throw 400. |
 * | Reset - Reused Password | Unwanted | WHERE a User changes their password to one that matches their last 3 hashes, THE system SHALL return HTTP 400 "Password has been used recently". |
 */

const { resetPassword } = require('../../../src/services/auth.service');
const { hashOTP, hashPassword, verifyPassword } = require('../../../src/utils/password.util');
const { findPasswordResetToken, markResetTokenUsed } = require('../../../src/db/queries/tokens.queries');
const { getLastNPasswordHashes, updatePasswordHash } = require('../../../src/db/queries/pwd.queries');
const { findUserById, updateStatus } = require('../../../src/db/queries/users.queries');
const AuditLogService = require('../../../src/services/audit.service');
const { pool } = require('../../../src/db/pool');

jest.mock('../../../src/utils/password.util');
jest.mock('../../../src/db/queries/tokens.queries');
jest.mock('../../../src/db/queries/pwd.queries');
jest.mock('../../../src/db/queries/users.queries');
jest.mock('../../../src/services/audit.service');

describe('Auth Service - Reset Password', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockToken = '123456';
    const mockHashedToken = 'hashed-otp';
    const mockNewPassword = 'newPassword123!';
    const mockNewPasswordHash = 'new-password-hash';
    const mockIp = '192.168.1.1';
    
    const mockTokenRecord = {
        id: 1,
        user_id: 'user-id-1',
        expires_at: new Date(Date.now() + 3600000),
        used_at: null
    };

    const mockUser = {
        id: 'user-id-1',
        status: 'active'
    };

    it('should successfully reset password for active user and return success message', async () => {
        // Setup mocks
        hashOTP.mockReturnValue(mockHashedToken);
        findPasswordResetToken.mockResolvedValue(mockTokenRecord);
        findUserById.mockResolvedValue(mockUser);
        getLastNPasswordHashes.mockResolvedValue(['old-hash-1', 'old-hash-2']);
        verifyPassword.mockResolvedValue(false); // password doesn't match old ones
        hashPassword.mockResolvedValue(mockNewPasswordHash);
        updatePasswordHash.mockResolvedValue();
        markResetTokenUsed.mockResolvedValue();
        AuditLogService.logAction.mockResolvedValue();

        const result = await resetPassword(mockToken, mockNewPassword, mockIp);

        expect(hashOTP).toHaveBeenCalledWith(mockToken);
        expect(findPasswordResetToken).toHaveBeenCalledWith(pool, mockHashedToken);
        expect(findUserById).toHaveBeenCalledWith(mockUser.id);
        expect(getLastNPasswordHashes).toHaveBeenCalledWith(pool, mockUser.id, 3);
        
        // Should check all old hashes
        expect(verifyPassword).toHaveBeenCalledWith(mockNewPassword, 'old-hash-1');
        expect(verifyPassword).toHaveBeenCalledWith(mockNewPassword, 'old-hash-2');
        
        expect(hashPassword).toHaveBeenCalledWith(mockNewPassword);
        expect(updatePasswordHash).toHaveBeenCalledWith(pool, {
            user_id: mockUser.id,
            new_hash: mockNewPasswordHash,
            reason: 'reset_via_email',
            ip_address: mockIp
        });
        expect(markResetTokenUsed).toHaveBeenCalledWith(pool, mockTokenRecord.id);
        
        // Status is already active, so updateStatus should not be called
        expect(updateStatus).not.toHaveBeenCalled();

        expect(AuditLogService.logAction).toHaveBeenCalledWith(
            mockUser.id,
            'password_changed',
            'users',
            mockUser.id,
            { status: 'active' },
            { status: 'active' },
            mockIp
        );

        expect(result).toEqual({ message: "Mật khẩu đã được cập nhật thành công. Vui lòng đăng nhập lại." });
    });

    it('should change status to active if user was inactive', async () => {
        const mockInactiveUser = { ...mockUser, status: 'inactive' };
        
        hashOTP.mockReturnValue(mockHashedToken);
        findPasswordResetToken.mockResolvedValue(mockTokenRecord);
        findUserById.mockResolvedValue(mockInactiveUser);
        getLastNPasswordHashes.mockResolvedValue([]);
        hashPassword.mockResolvedValue(mockNewPasswordHash);

        await resetPassword(mockToken, mockNewPassword, mockIp);

        expect(updateStatus).toHaveBeenCalledWith(mockInactiveUser.id, 'active');
        
        expect(AuditLogService.logAction).toHaveBeenCalledWith(
            mockInactiveUser.id,
            'password_changed',
            'users',
            mockInactiveUser.id,
            { status: 'inactive' },
            { status: 'active' },
            mockIp
        );
    });

    it('should throw 400 if token is invalid or expired', async () => {
        hashOTP.mockReturnValue(mockHashedToken);
        findPasswordResetToken.mockResolvedValue(null);

        await expect(resetPassword(mockToken, mockNewPassword, mockIp)).rejects.toMatchObject({
            statusCode: 400,
            code: 'AUTH_RESET_001',
            message: 'Invalid or expired reset token.'
        });
    });

    it('should throw 400 if user not found', async () => {
        hashOTP.mockReturnValue(mockHashedToken);
        findPasswordResetToken.mockResolvedValue(mockTokenRecord);
        findUserById.mockResolvedValue(null);

        await expect(resetPassword(mockToken, mockNewPassword, mockIp)).rejects.toMatchObject({
            statusCode: 400,
            code: 'AUTH_RESET_002',
            message: 'User not found.'
        });
    });

    it('should throw 400 (AUTH_PWD_001) if new password matches recent hashes', async () => {
        hashOTP.mockReturnValue(mockHashedToken);
        findPasswordResetToken.mockResolvedValue(mockTokenRecord);
        findUserById.mockResolvedValue(mockUser);
        getLastNPasswordHashes.mockResolvedValue(['old-hash-1']);
        verifyPassword.mockResolvedValue(true); // MATCH!

        await expect(resetPassword(mockToken, mockNewPassword, mockIp)).rejects.toMatchObject({
            statusCode: 400,
            code: 'AUTH_PWD_001',
            message: 'This password has been used recently.'
        });
        
        expect(hashPassword).not.toHaveBeenCalled();
        expect(updatePasswordHash).not.toHaveBeenCalled();
    });
});
