/**
 * Traceability Matrix:
 * | Test Case | Requirement | EARS Rule / Component |
 * |-----------|-------------|-----------------------|
 * | Should generate access token | PLAN.md §2.2 | WHEN user logs in, system MUST generate an access token expiring in 15m |
 * | Should generate refresh token | PLAN.md §2.2 | WHEN user logs in, system MUST generate a refresh token expiring in 7d |
 * | Should verify valid access token | PLAN.md §2.2 | WHEN valid access token provided, system MUST decode payload |
 * | Should return null for invalid access token | PLAN.md §2.2 | IF access token is invalid, system MUST return null |
 * | Should return null for expired access token | PLAN.md §2.2 | IF access token is expired, system MUST return null |
 * | Should return null for undefined access token | PLAN.md §2.2 | IF access token is missing, system MUST return null |
 * | Should throw error if JWT_SECRET missing | PLAN.md §2.2 | IF JWT_SECRET is not defined, system MUST throw an error |
 * | Should verify valid refresh token | PLAN.md §2.2 | WHEN valid refresh token provided, system MUST decode payload |
 * | Should return null for invalid refresh token| PLAN.md §2.2 | IF refresh token is invalid, system MUST return null |
 * | Should throw error if JWT_REFRESH_SECRET missing| PLAN.md §2.2 | IF JWT_REFRESH_SECRET is not defined, system MUST throw an error |
 * | Should generate opaque token using UUID | PLAN.md §2.2 | WHEN creating opaque token, system MUST generate a valid UUID |
 */

const {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    generateOpaqueToken
} = require('../../../src/utils/token.util');
const jwt = require('jsonwebtoken');

describe('TokenUtil', () => {
    const ORIGINAL_ENV = process.env;
    const testSecret = 'test-access-secret';
    const testRefreshSecret = 'test-refresh-secret';
    
    beforeEach(() => {
        jest.resetModules();
        process.env = { ...ORIGINAL_ENV };
        process.env.JWT_SECRET = testSecret;
        process.env.JWT_REFRESH_SECRET = testRefreshSecret;
    });
    
    afterAll(() => {
        process.env = ORIGINAL_ENV;
    });

    describe('generateAccessToken', () => {
        it('should generate a valid JWT string expiring in 15m', () => {
            const payload = { sub: 'user123', role: 'student', session_token: 'session123' };
            const token = generateAccessToken(payload);
            
            expect(typeof token).toBe('string');
            
            const decoded = jwt.verify(token, testSecret);
            expect(decoded.sub).toBe(payload.sub);
            expect(decoded.role).toBe(payload.role);
            expect(decoded.session_token).toBe(payload.session_token);
            // Check expiry close to 15m (900 seconds)
            const expectedExp = Math.floor(Date.now() / 1000) + 15 * 60;
            expect(decoded.exp).toBeGreaterThanOrEqual(expectedExp - 2);
            expect(decoded.exp).toBeLessThanOrEqual(expectedExp + 2);
        });

        it('should throw an error if JWT_SECRET is not configured', () => {
            delete process.env.JWT_SECRET;
            expect(() => generateAccessToken({ sub: '123' })).toThrow('JWT_SECRET is not configured in environment variables');
        });
    });

    describe('generateRefreshToken', () => {
        it('should generate a valid JWT string expiring in 7d', () => {
            const payload = { sub: 'user123', session_token: 'session123' };
            const token = generateRefreshToken(payload);
            
            expect(typeof token).toBe('string');
            
            const decoded = jwt.verify(token, testRefreshSecret);
            expect(decoded.sub).toBe(payload.sub);
            expect(decoded.session_token).toBe(payload.session_token);
            // Check expiry close to 7d (604800 seconds)
            const expectedExp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
            expect(decoded.exp).toBeGreaterThanOrEqual(expectedExp - 2);
            expect(decoded.exp).toBeLessThanOrEqual(expectedExp + 2);
        });

        it('should throw an error if JWT_REFRESH_SECRET is not configured', () => {
            delete process.env.JWT_REFRESH_SECRET;
            expect(() => generateRefreshToken({ sub: '123' })).toThrow('JWT_REFRESH_SECRET is not configured in environment variables');
        });
    });

    describe('verifyAccessToken', () => {
        it('should return decoded payload for a valid access token', () => {
            const payload = { sub: 'user123' };
            const token = jwt.sign(payload, testSecret, { expiresIn: '15m' });
            
            const decoded = verifyAccessToken(token);
            expect(decoded).not.toBeNull();
            expect(decoded.sub).toBe(payload.sub);
        });

        it('should return null for an invalid token', () => {
            const token = 'invalid.jwt.token';
            const decoded = verifyAccessToken(token);
            expect(decoded).toBeNull();
        });

        it('should return null for an expired token', () => {
            const payload = { sub: 'user123' };
            const token = jwt.sign(payload, testSecret, { expiresIn: '-1s' });
            
            const decoded = verifyAccessToken(token);
            expect(decoded).toBeNull();
        });
        
        it('should return null if token is not provided (undefined/null/empty)', () => {
            expect(verifyAccessToken(undefined)).toBeNull();
            expect(verifyAccessToken(null)).toBeNull();
            expect(verifyAccessToken('')).toBeNull();
        });

        it('should throw an error if JWT_SECRET is not configured', () => {
            delete process.env.JWT_SECRET;
            expect(() => verifyAccessToken('somatoken')).toThrow('JWT_SECRET is not configured in environment variables');
        });
    });

    describe('verifyRefreshToken', () => {
        it('should return decoded payload for a valid refresh token', () => {
            const payload = { sub: 'user123' };
            const token = jwt.sign(payload, testRefreshSecret, { expiresIn: '7d' });
            
            const decoded = verifyRefreshToken(token);
            expect(decoded).not.toBeNull();
            expect(decoded.sub).toBe(payload.sub);
        });

        it('should return null for an invalid token', () => {
            const token = 'invalid.jwt.token';
            const decoded = verifyRefreshToken(token);
            expect(decoded).toBeNull();
        });

        it('should return null for an expired token', () => {
            const payload = { sub: 'user123' };
            const token = jwt.sign(payload, testRefreshSecret, { expiresIn: '-1s' });
            
            const decoded = verifyRefreshToken(token);
            expect(decoded).toBeNull();
        });

        it('should return null if token is not provided', () => {
            expect(verifyRefreshToken(undefined)).toBeNull();
            expect(verifyRefreshToken(null)).toBeNull();
            expect(verifyRefreshToken('')).toBeNull();
        });

        it('should throw an error if JWT_REFRESH_SECRET is not configured', () => {
            delete process.env.JWT_REFRESH_SECRET;
            expect(() => verifyRefreshToken('sometoken')).toThrow('JWT_REFRESH_SECRET is not configured in environment variables');
        });
    });

    describe('generateOpaqueToken', () => {
        it('should return an object with a valid raw UUID string', () => {
            const result = generateOpaqueToken();
            expect(result).toHaveProperty('raw');
            expect(typeof result.raw).toBe('string');
            
            // Regex to match UUID v4
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            expect(uuidRegex.test(result.raw)).toBe(true);
        });
    });
});
