/**
 * @file backend/src/db/queries/sessions.queries.js
 * @description Data access layer for user sessions.
 */

const { pool } = require('../pool');

/**
 * Create a new user session
 * EARS[Event]: WHEN a User submits valid credentials and the account is active, THE system SHALL create a new record in user_sessions
 */
const createSession = async (userId, sessionToken, ipAddress, userAgent, expiresAt, isOauth = false, oauthProvider = null) => {
  const query = `
    INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at, is_oauth, oauth_provider)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;
  const values = [userId, sessionToken, ipAddress, userAgent, expiresAt, isOauth, oauthProvider];
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
      ORDER BY last_active_at ASC
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

/**
 * List all active sessions — dùng cho Admin panel
 * Sử dụng view v_active_sessions (JOIN users) từ migration 010
 * EARS[Event]: WHEN an Admin requests the active sessions list, THE system SHALL return all active sessions with user info.
 */
const listAllActiveSessions = async () => {
  const query = `
    SELECT
      id,
      user_id,
      email,
      full_name,
      ip_address,
      user_agent,
      is_oauth,
      oauth_provider,
      last_active_at,
      expires_at,
      created_at
    FROM v_active_sessions
    ORDER BY last_active_at DESC;
  `;
  const { rows } = await pool.query(query);
  return rows;
};

/**
 * Revoke a session by its UUID (id column)
 * Frontend gọi revokeSession(r.id) → cần revoke theo UUID, không phải session_token
 * EARS[Event]: WHEN an Admin revokes a specific session, THE system SHALL set revoked_at = NOW() for that session.
 */
const revokeSessionById = async (sessionId) => {
  const query = `
    UPDATE user_sessions
    SET revoked_at = NOW()
    WHERE id = $1
      AND revoked_at IS NULL
    RETURNING id, user_id, session_token, expires_at, revoked_at;
  `;
  const values = [sessionId];
  const { rows } = await pool.query(query, values);
  return rows[0] || null;
};

module.exports = {
  createSession,
  findActiveSession,
  revokeSession,
  countActiveSessions,
  revokeOldestSession,
  revokeAllSessionsForUser,
  listAllActiveSessions,
  revokeSessionById
};
