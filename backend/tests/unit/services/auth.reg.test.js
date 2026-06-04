/**
 * @file auth.reg.test.js
 * @description Unit tests for AuthService.register()
 * 
 * Traceability Matrix:
 * | Test Case | SPEC Requirement | EARS Pattern |
 * |-----------|------------------|--------------|
 * | Should successfully register a new user | USER-03, USER-04 | Event: WHEN a Guest submits a Registration form... |
 * | Should throw error AUTH_REG_001 if email already exists | USER-03 | Unwanted: WHERE a Guest registers with an already existing Email... |
 * | Should handle unique constraint error from DB (AUTH_REG_001) | USER-03 | Unwanted: WHERE a Guest registers with an already existing Email... |
 * | Should throw EmailDeliveryError if sending email fails | NFR, Dependencies | Event (Error handling for SMTP timeout/failure) |
 */

const { register } = require('../../../src/services/auth.service');
const usersQueries = require('../../../src/db/queries/users.queries');
const tokensQueries = require('../../../src/db/queries/tokens.queries');
const passwordUtil = require('../../../src/utils/password.util');
const emailUtil = require('../../../src/utils/email.util');

// Mock dependencies
jest.mock('../../../src/db/queries/users.queries');
jest.mock('../../../src/db/queries/tokens.queries');
jest.mock('../../../src/utils/password.util', () => ({
    ...jest.requireActual('../../../src/utils/password.util'),
    hashPassword: jest.fn(),
    hashOTP: jest.fn()
}));
jest.mock('../../../src/utils/token.util', () => ({
    generateOpaqueToken: jest.fn()
}));
const { generateOpaqueToken } = require('../../../src/utils/token.util');
jest.mock('../../../src/utils/email.util', () => ({
    sendVerificationEmail: jest.fn(),
    EmailDeliveryError: class EmailDeliveryError extends Error {}
}));

describe('AuthService - Register', () => {
    const mockUser = { id: 'uuid-123', email: 'test@example.com', full_name: 'Test User' };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Should successfully register a new user', async () => {
        // Setup mocks
        usersQueries.findUserByEmail.mockResolvedValue(null);
        passwordUtil.hashPassword.mockResolvedValue('hashed_password');
        usersQueries.createUser.mockResolvedValue(mockUser);
        generateOpaqueToken.mockReturnValue({ raw: 'raw_token_abc' });
        passwordUtil.hashOTP.mockReturnValue('hashed_token_abc');
        tokensQueries.createVerificationToken.mockResolvedValue({ id: 'token-123' });
        emailUtil.sendVerificationEmail.mockResolvedValue();

        const result = await register({
            email: 'test@example.com',
            password: 'Password123!',
            full_name: 'Test User'
        });

        // Assertions
        expect(result).toEqual({ message: 'Kiểm tra email để xác thực tài khoản' });
        expect(usersQueries.findUserByEmail).toHaveBeenCalledWith('test@example.com');
        expect(passwordUtil.hashPassword).toHaveBeenCalledWith('Password123!');
        expect(usersQueries.createUser).toHaveBeenCalledWith({
            email: 'test@example.com',
            password_hash: 'hashed_password',
            full_name: 'Test User'
        });
        expect(tokensQueries.createVerificationToken).toHaveBeenCalledWith(
            expect.anything(), // pool
            expect.objectContaining({
                user_id: 'uuid-123',
                token_hash: 'hashed_token_abc'
            })
        );
        expect(emailUtil.sendVerificationEmail).toHaveBeenCalledWith('test@example.com', 'raw_token_abc');
    });

    it('Should throw error AUTH_REG_001 if email already exists in check', async () => {
        usersQueries.findUserByEmail.mockResolvedValue(mockUser); // Email exists

        await expect(register({
            email: 'test@example.com',
            password: 'Password123!',
            full_name: 'Test User'
        })).rejects.toMatchObject({
            code: 'AUTH_REG_001',
            statusCode: 400
        });

        expect(usersQueries.createUser).not.toHaveBeenCalled();
    });

    it('Should handle unique constraint error from DB (AUTH_REG_001)', async () => {
        usersQueries.findUserByEmail.mockResolvedValue(null);
        passwordUtil.hashPassword.mockResolvedValue('hashed_password');
        
        const dbError = new Error('Email already exists');
        dbError.code = 'AUTH_REG_001';
        dbError.statusCode = 400;
        usersQueries.createUser.mockRejectedValue(dbError);

        await expect(register({
            email: 'test@example.com',
            password: 'Password123!',
            full_name: 'Test User'
        })).rejects.toMatchObject({
            code: 'AUTH_REG_001'
        });
    });

    it('Should throw EmailDeliveryError if sending email fails, but still create user and token', async () => {
        usersQueries.findUserByEmail.mockResolvedValue(null);
        passwordUtil.hashPassword.mockResolvedValue('hashed_password');
        usersQueries.createUser.mockResolvedValue(mockUser);
        generateOpaqueToken.mockReturnValue({ raw: 'raw_token_abc' });
        passwordUtil.hashOTP.mockReturnValue('hashed_token_abc');
        tokensQueries.createVerificationToken.mockResolvedValue({ id: 'token-123' });
        
        const emailError = new emailUtil.EmailDeliveryError('SMTP Timeout');
        emailUtil.sendVerificationEmail.mockRejectedValue(emailError);

        await expect(register({
            email: 'test@example.com',
            password: 'Password123!',
            full_name: 'Test User'
        })).rejects.toThrow('SMTP Timeout');

        // Verify that DB records were still attempted
        expect(usersQueries.createUser).toHaveBeenCalled();
        expect(tokensQueries.createVerificationToken).toHaveBeenCalled();
    });
});
