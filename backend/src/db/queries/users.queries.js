/**
 * @file backend/src/db/queries/users.queries.js
 * @description User-related database queries.
 */

const { pool } = require('../pool');

/**
 * Finds a user by their email address.
 * EARS[Event]: WHEN findUserByEmail is called, THE system SHALL return the user record if it exists.
 * @param {string} email
 * @returns {Promise<Object|null>} The user object or null
 */
const findUserByEmail = async (email) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
};

/**
 * Finds a user by their ID.
 * EARS[Event]: WHEN findUserById is called, THE system SHALL return the user record if it exists.
 * @param {string} id
 * @returns {Promise<Object|null>} The user object or null
 */
const findUserById = async (id) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Creates a new user in the database.
 * EARS[Event]: WHEN createUser is called with valid data, THE system SHALL insert a new record into users table.
 * EARS[Unwanted]: WHERE the email already exists, THE system SHALL throw an error (mapped to AUTH_REG_001).
 * @param {Object} userData
 * @param {string} userData.email
 * @param {string} userData.password_hash
 * @param {string} userData.full_name
 * @returns {Promise<Object>} The created user object
 */
const createUser = async ({ email, password_hash, full_name }) => {
  try {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [email, password_hash, full_name]
    );
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique violation code
      const uniqueError = new Error('Email already exists');
      uniqueError.code = 'AUTH_REG_001';
      throw uniqueError;
    }
    throw error;
  }
};

/**
 * Updates a user's profile information.
 * EARS[Event]: WHEN updateProfile is called, THE system SHALL update the users table and return the updated user object.
 * @param {string} id
 * @param {Object} profileData
 * @param {string} profileData.full_name
 * @param {string} [profileData.avatar_url]
 * @param {number} [profileData.target_band_score]
 * @returns {Promise<Object>} The updated user object
 */
const updateProfile = async (id, { full_name, avatar_url, target_band_score }) => {
  const result = await pool.query(
    `UPDATE users
     SET full_name = COALESCE($2, full_name),
         avatar_url = COALESCE($3, avatar_url),
         target_band_score = COALESCE($4, target_band_score)
     WHERE id = $1
     RETURNING *`,
    [id, full_name, avatar_url, target_band_score]
  );
  return result.rows[0];
};

/**
 * Updates a user's role.
 * EARS[Event]: WHEN updateRole is called, THE system SHALL update the user's role.
 * @param {string} id
 * @param {string} role
 * @returns {Promise<Object>} The updated user object
 */
const updateRole = async (id, role) => {
  const result = await pool.query(
    `UPDATE users
     SET role = $2
     WHERE id = $1
     RETURNING *`,
    [id, role]
  );
  return result.rows[0];
};

/**
 * Updates a user's status.
 * EARS[Event]: WHEN updateStatus is called, THE system SHALL update the user's status.
 * @param {string} id
 * @param {string} status
 * @returns {Promise<Object>} The updated user object
 */
const updateStatus = async (id, status) => {
  const result = await pool.query(
    `UPDATE users
     SET status = $2
     WHERE id = $1
     RETURNING *`,
    [id, status]
  );
  return result.rows[0];
};

/**
 * Upserts a Google user (creates if not exists, updates if exists).
 * EARS[Event]: WHEN upsertGoogleUser is called, THE system SHALL create a new active user or update the existing user.
 * @param {Object} data
 * @param {string} data.email
 * @param {string} data.full_name
 * @param {string} [data.avatar_url]
 * @returns {Promise<Object>} An object containing the id, is_new boolean, and the user object
 */
const upsertGoogleUser = async ({ email, full_name, avatar_url }) => {
  const result = await pool.query(
    `INSERT INTO users (email, full_name, avatar_url, password_hash, status, role)
     VALUES ($1, $2, $3, NULL, 'active', 'student')
     ON CONFLICT (email) DO UPDATE 
     SET full_name = EXCLUDED.full_name,
         avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
         status = CASE WHEN users.status = 'pending' THEN 'active'::account_status ELSE users.status END
     RETURNING *, (xmax = 0) AS is_new`,
    [email, full_name, avatar_url]
  );
  return {
    id: result.rows[0].id,
    is_new: result.rows[0].is_new,
    user: result.rows[0]
  };
};

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  updateProfile,
  updateRole,
  updateStatus,
  upsertGoogleUser,
};
