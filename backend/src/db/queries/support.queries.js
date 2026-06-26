/**
 * @file backend/src/db/queries/support.queries.js
 * @description Data access layer for support/contact submissions.
 */

/**
 * Thêm một tin nhắn liên hệ từ người dùng
 */
const insertContactMessage = async (pool, { name, email, subject, message }) => {
  const query = `
    INSERT INTO contact_submissions (name, email, subject, message)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, email, subject, message, status, created_at;
  `;
  const values = [name, email, subject, message];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

/**
 * Lấy lịch sử liên hệ của một user theo email
 */
const getContactHistoryByEmail = async (pool, email) => {
  const query = `
    SELECT id, subject, message, status, reply_message, created_at, resolved_at
    FROM contact_submissions
    WHERE email = $1
    ORDER BY created_at DESC;
  `;
  const { rows } = await pool.query(query, [email]);
  return rows;
};

module.exports = {
  insertContactMessage,
  getContactHistoryByEmail
};
