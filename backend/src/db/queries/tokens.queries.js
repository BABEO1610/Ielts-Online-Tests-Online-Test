/**
 * @file tokens.queries.js
 * @description Queries for managing email verification and password reset tokens (Task T012).
 */

/**
 * EARS[Event]: WHEN a Guest submits a Registration form, THE system SHALL create a new user (status = 'pending', role = 'student'), generate a token in email_verification_tokens, and send a verification email.
 */
const createVerificationToken = async (pool, { user_id, token_hash, expires_at }) => {
    const query = `
        INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
        RETURNING id;
    `;
    const result = await pool.query(query, [user_id, token_hash, expires_at]);
    return { id: result.rows[0].id };
};

/**
 * EARS[Event]: WHEN a Guest accesses a valid verification link (< 24h), THE system SHALL update status = 'active', record used_at = NOW(), and redirect to the Login page.
 */
const findVerificationToken = async (pool, tokenHash) => {
    const query = `
        SELECT id, user_id, expires_at, used_at
        FROM email_verification_tokens
        WHERE token_hash = $1 AND used_at IS NULL;
    `;
    const result = await pool.query(query, [tokenHash]);
    return result.rows[0] || null;
};

/**
 * EARS[Event]: WHEN a Guest accesses a valid verification link (< 24h), THE system SHALL update status = 'active', record used_at = NOW(), and redirect to the Login page.
 */
const markVerificationTokenUsed = async (pool, tokenId) => {
    const query = `
        UPDATE email_verification_tokens
        SET used_at = NOW()
        WHERE id = $1;
    `;
    await pool.query(query, [tokenId]);
};

/**
 * EARS[Event]: WHEN a Guest requests a password reset, THE system SHALL create a Reset Token (expires in 1 hour) in password_reset_tokens and email the link.
 */
const createPasswordResetToken = async (pool, { user_id, token_hash, expires_at }) => {
    const query = `
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
        RETURNING id;
    `;
    const result = await pool.query(query, [user_id, token_hash, expires_at]);
    return { id: result.rows[0].id };
};

/**
 * EARS[Event]: WHEN a Guest submits a new password via a valid reset link, THE system SHALL update password_hash and set used_at = NOW().
 */
const findPasswordResetToken = async (pool, tokenHash) => {
    const query = `
        SELECT id, user_id, expires_at, used_at
        FROM password_reset_tokens
        WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW();
    `;
    const result = await pool.query(query, [tokenHash]);
    return result.rows[0] || null;
};

/**
 * EARS[Event]: WHEN a Guest submits a new password via a valid reset link, THE system SHALL update password_hash and set used_at = NOW().
 */
const markResetTokenUsed = async (pool, tokenId) => {
    const query = `
        UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE id = $1;
    `;
    await pool.query(query, [tokenId]);
};

module.exports = {
    createVerificationToken,
    findVerificationToken,
    markVerificationTokenUsed,
    createPasswordResetToken,
    findPasswordResetToken,
    markResetTokenUsed
};
