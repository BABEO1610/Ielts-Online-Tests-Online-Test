/**
 * @fileoverview Token Utility for JWT and Opaque Tokens
 * EARS[Ubiquitous]: The TokenUtil MUST provide pure functions without side effects for generating and verifying tokens.
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate an Access Token
 * EARS[Event]: WHEN user logs in or refreshes token, system MUST generate an access token expiring in 15 minutes.
 * 
 * @param {Object} payload - Must contain at least { sub, role, session_token }
 * @returns {string} Signed JWT string
 */
const generateAccessToken = (payload) => {
    // EARS[Unwanted]: IF JWT_SECRET is not defined, system MUST throw an error.
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured in environment variables');
    }

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '15m'
    });
};

/**
 * Generate a Refresh Token
 * EARS[Event]: WHEN user logs in, system MUST generate a refresh token expiring in 7 days.
 * 
 * @param {Object} payload - Must contain at least { sub, session_token }
 * @returns {string} Signed JWT string
 */
const generateRefreshToken = (payload) => {
    // EARS[Unwanted]: IF JWT_REFRESH_SECRET is not defined, system MUST throw an error.
    if (!process.env.JWT_REFRESH_SECRET) {
        throw new Error('JWT_REFRESH_SECRET is not configured in environment variables');
    }

    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: '7d'
    });
};

/**
 * Verify an Access Token
 * EARS[Event]: WHEN a request is made to a protected route, system MUST verify the access token.
 * EARS[Unwanted]: IF the access token is invalid or expired, system MUST return null and NOT throw an exception.
 * 
 * @param {string} token 
 * @returns {Object|null} Decoded payload or null
 */
const verifyAccessToken = (token) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured in environment variables');
    }

    if (!token) return null;

    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
};

/**
 * Verify a Refresh Token
 * EARS[Event]: WHEN user requests to refresh token, system MUST verify the refresh token.
 * EARS[Unwanted]: IF the refresh token is invalid or expired, system MUST return null and NOT throw an exception.
 * 
 * @param {string} token 
 * @returns {Object|null} Decoded payload or null
 */
const verifyRefreshToken = (token) => {
    if (!process.env.JWT_REFRESH_SECRET) {
        throw new Error('JWT_REFRESH_SECRET is not configured in environment variables');
    }

    if (!token) return null;

    try {
        return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
        return null;
    }
};

/**
 * Generate an opaque random token
 * EARS[Event]: WHEN system creates a verification or reset token, it MUST generate an opaque UUID token.
 * 
 * @returns {{ raw: string }} Object containing the raw token string
 */
const generateOpaqueToken = () => {
    return {
        raw: crypto.randomUUID()
    };
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    generateOpaqueToken
};
