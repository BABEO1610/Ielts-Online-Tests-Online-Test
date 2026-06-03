/**
 * @file pwd.queries.js
 * @description Queries for managing password history and updating password hashes (Task T012).
 */

/**
 * EARS[Event]: WHEN a Guest submits a new password via a valid reset link or user changes password, THE system SHALL record the hash, reason, and IP.
 * EARS[Event]: WHEN a Guest submits a new password via a valid reset link, THE system SHALL update password_hash and set used_at = NOW().
 * Updates the user's password and records the change in the password history table atomically.
 */
const updatePasswordHash = async (pool, { user_id, new_hash, reason, ip_address }) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Update user's password_hash
        const updateQuery = `
            UPDATE users
            SET password_hash = $1
            WHERE id = $2;
        `;
        await client.query(updateQuery, [new_hash, user_id]);
        
        // Insert into password history
        const insertQuery = `
            INSERT INTO password_history (user_id, hash, reason, changed_from_ip)
            VALUES ($1, $2, $3, $4);
        `;
        await client.query(insertQuery, [user_id, new_hash, reason, ip_address]);
        
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * EARS[Unwanted]: WHERE a User changes their password to one that matches their last 3 hashes in password_history, THE system SHALL return HTTP 400 "Password has been used recently".
 * Returns an array of the last N password hashes for a given user.
 */
const getLastNPasswordHashes = async (pool, userId, n) => {
    const query = `
        SELECT hash
        FROM password_history
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2;
    `;
    const result = await pool.query(query, [userId, n]);
    return result.rows.map(row => row.hash);
};

module.exports = {
    updatePasswordHash,
    getLastNPasswordHashes
};
