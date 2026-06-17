/**
 * @file contacts.service.js
 * @description Business logic cho Contact Submissions.
 * Không có HTTP req/res ở đây — chỉ business logic thuần.
 */
const { getAllContacts, markContactResolved } = require('../db/queries/contacts.queries');
const { pool } = require('../db/pool');

/**
 * Lấy danh sách tất cả liên hệ.
 * @returns {Promise<Object[]>}
 */
async function listContacts() {
  return getAllContacts(pool);
}

/**
 * Đánh dấu một liên hệ là đã xử lý.
 * Ném AppError 404 nếu id không tồn tại.
 * @param {string} id - UUID
 * @param {typeof import('../utils/AppError')} AppError
 * @returns {Promise<Object>}
 */
async function resolveContact(id, AppError) {
  const updated = await markContactResolved(pool, id);
  if (!updated) {
    throw new AppError('Contact not found.', 404, 'CONTACT_NOT_FOUND');
  }
  return updated;
}

module.exports = { listContacts, resolveContact };
