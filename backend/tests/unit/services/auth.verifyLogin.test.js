const { verifyLogin } = require('../../../src/services/auth.service');
const { findUserByEmail } = require('../../../src/db/queries/users.queries');
const { verifyPassword } = require('../../../src/utils/password.util');
const { pool } = require('../../../src/db/pool');

/**
 * Traceability Matrix:
 * - USER-05: As a Student/Tutor/Admin, I want to log in with Email/Password to access my dashboard.
 * - EARS[Event]: WHEN a User submits valid credentials and the account is active, THE system SHALL call the DB function handle_successful_login()
 * - EARS[Unwanted]: WHERE a User inputs an incorrect password, THE system SHALL call the DB function handle_failed_login().
 * - EARS[Unwanted]: WHERE a User has failed_login_attempts >= 5, THE system SHALL lock the login flow for 15 minutes (based on locked_until) and return HTTP 429 Too Many Requests.
 */

jest.mock('../../../src/db/queries/users.queries');
jest.mock('../../../src/utils/password.util');
jest.mock('../../../src/db/pool', () => ({
    pool: {
        query: jest.fn()
    }
}));

describe('Auth Service - verifyLogin', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockEmail = 'test@example.com';
    const mockPassword = 'password123';
    const mockUser = {
        id: 'user-uuid',
        email: mockEmail,
        password_hash: 'hashedpassword',
        status: 'active',
        locked_until: null,
        failed_login_attempts: 0
    };

    it('should successfully verify login and return safe user', async () => {
        // Happy path
        findUserByEmail.mockResolvedValueOnce(mockUser) // First findUserByEmail
                       .mockResolvedValueOnce({ ...mockUser }); // Second findUserByEmail (updated user)
        verifyPassword.mockResolvedValueOnce(true);
        pool.query.mockResolvedValueOnce();

        const result = await verifyLogin(mockEmail, mockPassword);

        expect(findUserByEmail).toHaveBeenCalledWith(mockEmail);
        expect(verifyPassword).toHaveBeenCalledWith(mockPassword, mockUser.password_hash);
        expect(pool.query).toHaveBeenCalledWith('SELECT handle_successful_login($1)', [mockUser.id]);
        
        // safeUser should not have password_hash
        expect(result).toHaveProperty('email', mockEmail);
        expect(result).not.toHaveProperty('password_hash');
    });

    it('should throw 401 AUTH_LOG_001 if user not found', async () => {
        findUserByEmail.mockResolvedValueOnce(null);

        await expect(verifyLogin(mockEmail, mockPassword)).rejects.toMatchObject({
            message: 'Incorrect email or password.',
            code: 'AUTH_LOG_001',
            statusCode: 401
        });

        expect(verifyPassword).not.toHaveBeenCalled();
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('should throw 429 AUTH_LOG_002 if account is temporarily locked', async () => {
        const lockedUser = {
            ...mockUser,
            locked_until: new Date(Date.now() + 15 * 60 * 1000).toISOString() // Locked for 15 minutes
        };
        findUserByEmail.mockResolvedValueOnce(lockedUser);

        await expect(verifyLogin(mockEmail, mockPassword)).rejects.toMatchObject({
            message: 'Account temporarily locked due to multiple failed attempts. Try again in 15 minutes.',
            code: 'AUTH_LOG_002',
            statusCode: 429
        });

        expect(verifyPassword).not.toHaveBeenCalled();
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('should call handle_failed_login and throw 401 if password is incorrect', async () => {
        findUserByEmail.mockResolvedValueOnce(mockUser);
        verifyPassword.mockResolvedValueOnce(false);
        pool.query.mockResolvedValueOnce();

        await expect(verifyLogin(mockEmail, 'wrongpassword')).rejects.toMatchObject({
            message: 'Incorrect email or password.',
            code: 'AUTH_LOG_001',
            statusCode: 401
        });

        expect(verifyPassword).toHaveBeenCalledWith('wrongpassword', mockUser.password_hash);
        expect(pool.query).toHaveBeenCalledWith('SELECT handle_failed_login($1)', [mockUser.id]);
    });

    it('should throw 403 AUTH_PERM_001 if account is pending', async () => {
        const pendingUser = {
            ...mockUser,
            status: 'pending'
        };
        findUserByEmail.mockResolvedValueOnce(pendingUser);
        verifyPassword.mockResolvedValueOnce(true);

        await expect(verifyLogin(mockEmail, mockPassword)).rejects.toMatchObject({
            message: 'You do not have permission to perform this action.',
            code: 'AUTH_PERM_001',
            statusCode: 403
        });

        expect(pool.query).not.toHaveBeenCalled();
    });

    it('should throw 403 AUTH_PERM_001 if account is banned', async () => {
        const bannedUser = {
            ...mockUser,
            status: 'banned'
        };
        findUserByEmail.mockResolvedValueOnce(bannedUser);
        verifyPassword.mockResolvedValueOnce(true);

        await expect(verifyLogin(mockEmail, mockPassword)).rejects.toMatchObject({
            message: 'You do not have permission to perform this action.',
            code: 'AUTH_PERM_001',
            statusCode: 403
        });

        expect(pool.query).not.toHaveBeenCalled();
    });
});
