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
    SELECT id, name, email, subject, message, status, reply_message, admin_notes, assigned_to_id, resolved_at, created_at
    FROM contact_submissions
    ORDER BY created_at DESC
  `;
  const { rows } = await pool.query(sql);
  return rows;
}

/**
 * Lấy danh sách liên hệ theo trạng thái status.
 * @param {import('pg').Pool} pool
 * @param {string} status ('pending', 'in_progress', 'resolved', 'unresolved')
 * @returns {Promise<Object[]>}
 */
async function getContactsByStatus(pool, status) {
  const sql = `
    SELECT id, name, email, subject, message, status, reply_message, admin_notes, assigned_to_id, resolved_at, created_at
    FROM contact_submissions
    WHERE status = $1
    ORDER BY created_at DESC
  `;
  const { rows } = await pool.query(sql, [status]);
  return rows;
}

/**
 * Cập nhật trạng thái và phản hồi cho liên hệ
 * @param {import('pg').Pool} pool
 * @param {string} id - UUID của contact_submission
 * @param {string} status - Trạng thái mới
 * @param {string} admin_notes - Ghi chú của admin
 * @param {string} reply_message - Câu trả lời cho học viên
 * @param {string} admin_id - ID của admin xử lý
 * @returns {Promise<Object|null>} row đã cập nhật, hoặc null nếu không tìm thấy
 */
async function updateContactStatus(pool, id, status, admin_notes, reply_message, admin_id) {
  const sql = `
    UPDATE contact_submissions
    SET 
      status = $2,
      admin_notes = COALESCE($3, admin_notes),
      reply_message = COALESCE($4, reply_message),
      assigned_to_id = $5,
      resolved_at = CASE WHEN $2::VARCHAR IN ('resolved', 'unresolved') THEN NOW() ELSE resolved_at END
    WHERE id = $1
    RETURNING id, name, email, subject, status, reply_message, admin_notes, assigned_to_id, resolved_at, created_at
  `;
  const { rows } = await pool.query(sql, [id, status, admin_notes, reply_message, admin_id]);
  return rows[0] ?? null;
}

module.exports = { getAllContacts, getContactsByStatus, updateContactStatus };
