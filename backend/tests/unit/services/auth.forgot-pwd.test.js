/**
 * @file auth.forgot-pwd.test.js
 * @description Unit tests for forgotPassword service (Task T024)
 * 
 * Traceability Matrix:
 * | Test Case | Requirement / EARS | Description |
 * |---|---|---|
 * | should successfully generate OTP, save it and send email for valid active user | EARS[Event]: WHEN a Guest requests a password reset, THE system SHALL create a Reset Token (expires in 1 hour) in password_reset_tokens and email the link. | Happy path forgot password |
 * | should return success message but do nothing if email does not exist | EARS[Unwanted]: Email Enumeration Mitigation: Intentionally submitting an non-existing Email to the Forgot Password API MUST still return 200 OK without actually sending an email. | Prevent email enumeration (non-existent email) |
 * | should return success message but do nothing if user is not active (pending) | EARS[Unwanted]: Email Enumeration Mitigation... | Prevent enumeration and skip inactive user |
 * | should return success message but do nothing if user is banned | EARS[Unwanted]: Email Enumeration Mitigation... | Prevent enumeration and skip banned user |
 */

const crypto = require('crypto');
const { forgotPassword } = require('../../../src/services/auth.service');
const { findUserByEmail } = require('../../../src/db/queries/users.queries');
const { createPasswordResetToken } = require('../../../src/db/queries/tokens.queries');
const { sendPasswordResetEmail } = require('../../../src/utils/email.util');
const { hashOTP } = require('../../../src/utils/password.util');

// Mock dependencies
jest.mock('../../../src/db/queries/users.queries');
jest.mock('../../../src/db/queries/tokens.queries');
jest.mock('../../../src/utils/email.util');
jest.mock('../../../src/utils/password.util');
jest.mock('crypto', () => {
    return {
        ...jest.requireActual('crypto'),
        randomInt: jest.fn()
    };
});

describe('Auth Service - Forgot Password', () => {
    const mockEmail = 'test@example.com';
    const successMessage = 'Nếu email tồn tại trong hệ thống, hướng dẫn reset password đã được gửi.';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should successfully generate OTP, save it and send email for valid active user', async () => {
        // Mock data
        const mockUser = { id: 'user-123', email: mockEmail, status: 'active' };
        const mockOtp = 123456;
        const mockHashedOtp = 'hashed_otp_string';
        
        // Setup mocks
        findUserByEmail.mockResolvedValue(mockUser);
        crypto.randomInt.mockReturnValue(mockOtp);
        hashOTP.mockReturnValue(mockHashedOtp);
        createPasswordResetToken.mockResolvedValue({ id: 'token-123' });
        sendPasswordResetEmail.mockResolvedValue();

        // Execution
        const result = await forgotPassword(mockEmail);

        // Verification
        expect(findUserByEmail).toHaveBeenCalledWith(mockEmail);
        expect(crypto.randomInt).toHaveBeenCalledWith(100000, 999999);
        expect(hashOTP).toHaveBeenCalledWith(mockOtp.toString());
        
        expect(createPasswordResetToken).toHaveBeenCalledWith(
            expect.anything(), // pool
            expect.objectContaining({
                user_id: mockUser.id,
                token_hash: mockHashedOtp,
                expires_at: expect.any(Date)
            })
        );
        
        expect(sendPasswordResetEmail).toHaveBeenCalledWith(mockEmail, mockOtp.toString());
        expect(result).toEqual({ message: successMessage });
        
        // Ensure expiration is approximately 1 hour from now
        const tokenCallArg = createPasswordResetToken.mock.calls[0][1];
        const expiresAt = tokenCallArg.expires_at.getTime();
        const oneHourFromNow = Date.now() + 1 * 60 * 60 * 1000;
        expect(Math.abs(expiresAt - oneHourFromNow)).toBeLessThan(5000); // within 5 seconds tolerance
    });

    it('should return success message but do nothing if email does not exist', async () => {
        // Setup mock: user not found
        findUserByEmail.mockResolvedValue(null);

        // Execution
        const result = await forgotPassword(mockEmail);

        // Verification
        expect(findUserByEmail).toHaveBeenCalledWith(mockEmail);
        expect(crypto.randomInt).not.toHaveBeenCalled();
        expect(createPasswordResetToken).not.toHaveBeenCalled();
        expect(sendPasswordResetEmail).not.toHaveBeenCalled();
        expect(result).toEqual({ message: successMessage });
    });

    it('should return success message but do nothing if user is not active (pending)', async () => {
        // Setup mock: user is pending
        findUserByEmail.mockResolvedValue({ id: 'user-123', email: mockEmail, status: 'pending' });

        // Execution
        const result = await forgotPassword(mockEmail);

        // Verification
        expect(findUserByEmail).toHaveBeenCalledWith(mockEmail);
        expect(crypto.randomInt).not.toHaveBeenCalled();
        expect(createPasswordResetToken).not.toHaveBeenCalled();
        expect(sendPasswordResetEmail).not.toHaveBeenCalled();
        expect(result).toEqual({ message: successMessage });
    });

    it('should return success message but do nothing if user is banned', async () => {
        // Setup mock: user is banned
        findUserByEmail.mockResolvedValue({ id: 'user-123', email: mockEmail, status: 'banned' });

        // Execution
        const result = await forgotPassword(mockEmail);

        // Verification
        expect(findUserByEmail).toHaveBeenCalledWith(mockEmail);
        expect(crypto.randomInt).not.toHaveBeenCalled();
        expect(createPasswordResetToken).not.toHaveBeenCalled();
        expect(sendPasswordResetEmail).not.toHaveBeenCalled();
        expect(result).toEqual({ message: successMessage });
    });
});
