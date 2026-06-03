/**
 * Traceability Matrix:
 * - Requirement: T015 - Implement HashUtil
 * - SPEC Reference: Ubiquitous (Password Hashing), PLAN §2.4 (SHA-256 for OTP)
 * - Test Cases:
 *   - TC01: hashPassword should generate a valid bcrypt hash
 *   - TC02: hashPassword should throw error for empty or invalid input
 *   - TC03: verifyPassword should return true for correct password
 *   - TC04: verifyPassword should return false for incorrect password
 *   - TC05: verifyPassword should return false for missing parameters
 *   - TC06: hashOTP should generate a valid SHA-256 hex string
 *   - TC07: hashOTP should consistently generate same hash for same input
 *   - TC08: hashOTP should stringify non-string inputs (e.g. number)
 *   - TC09: hashOTP should throw error for empty or invalid input
 */

const { hashPassword, verifyPassword, hashOTP } = require('../../../src/utils/password.util');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

describe('HashUtil (password.util.js)', () => {
  describe('hashPassword', () => {
    it('TC01: should generate a valid bcrypt hash with cost 12', async () => {
      const password = 'StrongPassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      // A typical bcrypt hash starts with $2b$12$, $2a$12$, or $2y$12$
      expect(hash.startsWith('$2b$12$') || hash.startsWith('$2a$12$') || hash.startsWith('$2y$12$')).toBe(true);
      
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('TC02: should throw an error when password is empty or null', async () => {
      await expect(hashPassword('')).rejects.toThrow('Password must be provided');
      await expect(hashPassword(null)).rejects.toThrow('Password must be provided');
      await expect(hashPassword(undefined)).rejects.toThrow('Password must be provided');
    });
  });

  describe('verifyPassword', () => {
    it('TC03: should return true when the password matches the hash', async () => {
      const password = 'AnotherStrongPassword456';
      const hash = await bcrypt.hash(password, 12);
      
      const result = await verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it('TC04: should return false when the password does not match the hash', async () => {
      const password = 'AnotherStrongPassword456';
      const hash = await bcrypt.hash(password, 12);
      
      const result = await verifyPassword('WrongPassword', hash);
      expect(result).toBe(false);
    });

    it('TC05: should return false when parameters are missing or empty', async () => {
      const hash = await bcrypt.hash('test', 12);
      expect(await verifyPassword('', hash)).toBe(false);
      expect(await verifyPassword('test', '')).toBe(false);
      expect(await verifyPassword(null, hash)).toBe(false);
      expect(await verifyPassword('test', null)).toBe(false);
    });
  });

  describe('hashOTP', () => {
    it('TC06: should generate a valid SHA-256 hex string', () => {
      const otp = '123456';
      const hash = hashOTP(otp);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).toHaveLength(64); // SHA-256 hex string is 64 characters long
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('TC07: should consistently generate the same hash for the same input', () => {
      const otp = '654321';
      const hash1 = hashOTP(otp);
      const hash2 = hashOTP(otp);
      const expectedHash = crypto.createHash('sha256').update(otp).digest('hex');
      
      expect(hash1).toBe(hash2);
      expect(hash1).toBe(expectedHash);
    });
    
    it('TC08: should stringify non-string inputs', () => {
      const otpNumber = 123456;
      const otpString = '123456';
      
      expect(hashOTP(otpNumber)).toBe(hashOTP(otpString));
    });

    it('TC09: should throw an error when OTP is empty or null', () => {
      expect(() => hashOTP('')).toThrow('OTP must be provided');
      expect(() => hashOTP(null)).toThrow('OTP must be provided');
      expect(() => hashOTP(undefined)).toThrow('OTP must be provided');
    });
  });
});
