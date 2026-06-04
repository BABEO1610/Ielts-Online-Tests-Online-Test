/**
 * @file backend/src/db/queries/sessions.queries.js
 * @description Data access layer for user sessions.
 */

const { pool } = require('../pool');

/**
 * Create a new user session
 * EARS[Event]: WHEN a User submits valid credentials and the account is active, THE system SHALL create a new record in user_sessions
 */
const createSession = async (userId, sessionToken, ipAddress, userAgent, expiresAt) => {
  const query = `
    INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const values = [userId, sessionToken, ipAddress, userAgent, expiresAt];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

/**
 * Find an active session by session_token
 * EARS[State-driven]: WHILE a request passes through the Authenticated Middleware, THE system SHALL decode the JWT and match the session_token against user_sessions.
 */
const findActiveSession = async (sessionToken) => {
  const query = `
    SELECT * FROM v_active_sessions
    WHERE session_token = $1;
  `;
  const values = [sessionToken];
  const { rows } = await pool.query(query, values);
  return rows[0] || null;
};

/**
 * Revoke a session by session_token
 * EARS[Event]: WHEN a User calls the Logout API, THE system SHALL update revoked_at = NOW() for the corresponding user_sessions record
 */
const revokeSession = async (sessionToken) => {
  const query = `
    UPDATE user_sessions
    SET revoked_at = NOW()
    WHERE session_token = $1
    RETURNING *;
  `;
  const values = [sessionToken];
  const { rows } = await pool.query(query, values);
  return rows[0] || null;
};

/**
 * Count active sessions for a user
 * EARS[Unwanted]: WHERE a User successfully logs in but already has >= 3 active sessions... (Helper for counting)
 */
const countActiveSessions = async (userId) => {
  const query = `
    SELECT COUNT(*)::int AS count
    FROM v_active_sessions
    WHERE user_id = $1;
  `;
  const values = [userId];
  const { rows } = await pool.query(query, values);
  return rows[0].count;
};

/**
 * Revoke the oldest active session for a user
 * EARS[Unwanted]: WHERE a User successfully logs in but already has >= 3 active sessions, THE system SHALL automatically set revoked_at = NOW() for the oldest session before creating a new session.
 */
const revokeOldestSession = async (userId) => {
  const query = `
    UPDATE user_sessions
    SET revoked_at = NOW()
    WHERE id = (
      SELECT id
      FROM v_active_sessions
      WHERE user_id = $1
      ORDER BY updated_at ASC
      LIMIT 1
    )
    RETURNING *;
  `;
  const values = [userId];
  const { rows } = await pool.query(query, values);
  return rows[0] || null;
};

/**
 * Revoke all active sessions for a user
 * EARS[Event]: WHEN a User is deactivated or their role is changed, THE system SHALL revoke all their sessions.
 */
const revokeAllSessionsForUser = async (userId) => {
  const query = `
    UPDATE user_sessions
    SET revoked_at = NOW()
    WHERE user_id = $1 AND revoked_at IS NULL
    RETURNING *;
  `;
  const values = [userId];
  const { rows } = await pool.query(query, values);
  return rows;
};

module.exports = {
  createSession,
  findActiveSession,
  revokeSession,
  countActiveSessions,
  revokeOldestSession,
  revokeAllSessionsForUser
};
