/**
 * @file contacts.queries.js
 * @description Raw SQL queries for contact_submissions table.
 * ADR-001: No ORM — parameterized queries ($1, $2) only.
 */

/**
 * Lấy tất cả liên hệ, sắp xếp mới nhất lên đầu.
 * @param {import('pg').Pool} pool
 * @returns {Promise<Object[]>}
 */
async function getAllContacts(pool) {
  const sql = `
    SELECT id, name, email, subject, message, resolved, created_at
    FROM contact_submissions
    ORDER BY created_at DESC
  `;
  const { rows } = await pool.query(sql);
  return rows;
}

/**
 * Lấy danh sách liên hệ theo trạng thái resolved.
 * @param {import('pg').Pool} pool
 * @param {boolean} resolved
 * @returns {Promise<Object[]>}
 */
async function getContactsByStatus(pool, resolved) {
  const sql = `
    SELECT id, name, email, subject, message, resolved, created_at
    FROM contact_submissions
    WHERE resolved = $1
    ORDER BY created_at DESC
  `;
  const { rows } = await pool.query(sql, [resolved]);
  return rows;
}

/**
 * Đánh dấu một liên hệ là đã xử lý.
 * @param {import('pg').Pool} pool
 * @param {string} id - UUID của contact_submission
 * @returns {Promise<Object|null>} row đã cập nhật, hoặc null nếu không tìm thấy
 */
async function markContactResolved(pool, id) {
  const sql = `
    UPDATE contact_submissions
    SET resolved = TRUE
    WHERE id = $1
    RETURNING id, name, email, subject, resolved, created_at
  `;
  const { rows } = await pool.query(sql, [id]);
  return rows[0] ?? null;
}

module.exports = { getAllContacts, getContactsByStatus, markContactResolved };
