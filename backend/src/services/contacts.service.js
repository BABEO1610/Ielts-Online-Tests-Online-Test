/**
 * @file contacts.service.js
 * @description Business logic cho Contact Submissions.
 * Không có HTTP req/res ở đây — chỉ business logic thuần.
 */
const { getAllContacts, updateContactStatus } = require('../db/queries/contacts.queries');
const { pool } = require('../db/pool');

/**
 * Lấy danh sách tất cả liên hệ.
 * @returns {Promise<Object[]>}
 */
async function listContacts() {
  return getAllContacts(pool);
}

/**
 * Cập nhật trạng thái và phản hồi cho liên hệ.
 * Ném AppError 404 nếu id không tồn tại.
 * @param {string} id - UUID
 * @param {string} status - Trạng thái mới
 * @param {string} admin_notes - Ghi chú nội bộ
 * @param {string} reply_message - Trả lời học viên
 * @param {string} admin_id - UUID của admin đang xử lý
 * @param {typeof import('../utils/AppError')} AppError
 * @returns {Promise<Object>}
 */
async function updateContact(id, status, admin_notes, reply_message, admin_id, AppError) {
  const updated = await updateContactStatus(pool, id, status, admin_notes, reply_message, admin_id);
  if (!updated) {
    throw new AppError('Contact not found.', 404, 'CONTACT_NOT_FOUND');
  }
  return updated;
}

module.exports = { listContacts, updateContact };
