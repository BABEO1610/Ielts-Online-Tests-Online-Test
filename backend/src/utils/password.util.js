const bcrypt = require('bcrypt');
const crypto = require('crypto');

const SALT_ROUNDS = 12;

/**
 * Hashing a plain-text password using bcrypt with cost 12.
 * @param {string} password - The plain-text password.
 * @returns {Promise<string>} The hashed password.
 */
async function hashPassword(password) {
  // EARS[Ubiquitous]: THE system SHALL hash all new passwords using bcrypt (cost=12); storing plain-text passwords is STRICTLY PROHIBITED.
  if (!password) {
    throw new Error('Password must be provided');
  }
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifying a plain-text password against a bcrypt hash.
 * @param {string} password - The plain-text password.
 * @param {string} hash - The bcrypt hash to verify against.
 * @returns {Promise<boolean>} True if the password matches the hash.
 */
async function verifyPassword(password, hash) {
  if (!password || !hash) {
    return false;
  }
  return await bcrypt.compare(password, hash);
}

/**
 * Hashing an OTP (One-Time Password) using SHA-256.
 * @param {string|number} otp - The plain-text OTP (usually 6 digits).
 * @returns {string} The SHA-256 hex string of the OTP.
 */
function hashOTP(otp) {
  if (otp === undefined || otp === null || otp === '') {
    throw new Error('OTP must be provided');
  }
  // EARS[Ubiquitous]: OTPs must be hashed using SHA-256 before storing.
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

module.exports = {
  hashPassword,
  verifyPassword,
  hashOTP
};
