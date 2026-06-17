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
const upsertGoogleUser = async ({ provider_user_id, email, full_name, avatar_url }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Upsert users
    const result = await client.query(
      `INSERT INTO users (email, full_name, avatar_url, password_hash, status, role)
       VALUES ($1, $2, $3, NULL, 'active', 'student')
       ON CONFLICT (email) DO UPDATE 
       SET full_name = COALESCE(EXCLUDED.full_name, users.full_name),
           avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
           status = CASE WHEN users.status = 'pending' THEN 'active'::account_status ELSE users.status END
       RETURNING *, (xmax = 0) AS is_new`,
      [email, full_name, avatar_url]
    );

    const user = result.rows[0];
    const is_new = user.is_new;

    // 2. Upsert oauth_accounts
    if (provider_user_id) {
      await client.query(
        `INSERT INTO oauth_accounts (user_id, provider, provider_user_id, provider_email, linked_at, updated_at)
         VALUES ($1, 'google', $2, $3, NOW(), NOW())
         ON CONFLICT (provider, provider_user_id) DO UPDATE 
         SET provider_email = EXCLUDED.provider_email,
             updated_at = NOW()`,
        [user.id, provider_user_id, email]
      );
    }

    await client.query('COMMIT');
    
    return {
      id: user.id,
      is_new,
      user
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Lists users with pagination and optional filters.
 * EARS[Event]: WHEN listUsers is called, THE system SHALL return paginated users based on query parameters.
 * @param {Object} filters
 * @param {number} filters.page
 * @param {number} filters.limit
 * @param {string} [filters.role]
 * @param {string} [filters.status]
 * @returns {Promise<Object>} An object containing rows (users) and total (count)
 */
const listUsers = async ({ page, limit, role, status, search }) => {
  const offset = (page - 1) * limit;
  const values = [];
  let whereClause = 'WHERE 1=1';
  let paramIndex = 1;

  if (role) {
    whereClause += ` AND role = $${paramIndex}`;
    values.push(role);
    paramIndex++;
  }

  if (status) {
    whereClause += ` AND status = $${paramIndex}`;
    values.push(status);
    paramIndex++;
  }

  if (search) {
    whereClause += ` AND (full_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
    values.push(`%${search}%`);
    paramIndex++;
  }

  const countQuery = `SELECT COUNT(*)::int AS total FROM users ${whereClause}`;
  const dataQuery = `
    SELECT * FROM users 
    ${whereClause} 
    ORDER BY created_at DESC 
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  
  const countValues = [...values];
  values.push(limit, offset);

  const [countResult, dataResult] = await Promise.all([
    pool.query(countQuery, countValues),
    pool.query(dataQuery, values)
  ]);

  return {
    rows: dataResult.rows,
    total: countResult.rows[0].total
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
  listUsers,
};
