/**
 * @file backend/src/controllers/support.controller.js
 * @description Controllers cho các route liên quan đến support/contact.
 */

const { pool } = require('../db/pool');
const supportQueries = require('../db/queries/support.queries');

/**
 * Xử lý yêu cầu gửi tin nhắn liên hệ Admin
 */
const submitContact = async (req, res, next) => {
  try {
    const { message } = req.body;
    
    // req.user (từ JWT) chỉ có id (sub), role. Cần query DB để lấy email và full_name
    const userId = req.user.id;
    const userQuery = 'SELECT email, full_name FROM users WHERE id = $1';
    const { rows } = await pool.query(userQuery, [userId]);
    const userDb = rows[0] || {};
    
    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Message content is required' },
        meta: null
      });
    }

    // Default subject do frontend không gửi
    const subject = "Technical Issue from Process Tracking";
    const name = userDb.full_name || "Unknown User";
    const email = userDb.email || "unknown@example.com";

    const submission = await supportQueries.insertContactMessage(pool, {
      name,
      email,
      subject,
      message
    });

    res.status(201).json({
      success: true,
      data: submission,
      error: null,
      meta: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Xử lý yêu cầu lấy lịch sử liên hệ của học viên
 */
const getContactHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userQuery = 'SELECT email FROM users WHERE id = $1';
    const { rows } = await pool.query(userQuery, [userId]);
    const email = rows[0]?.email;
    
    if (!email) {
      return res.status(200).json({
        success: true,
        data: [],
        error: null,
        meta: null
      });
    }

    const history = await supportQueries.getContactHistoryByEmail(pool, email);

    res.status(200).json({
      success: true,
      data: history,
      error: null,
      meta: { total: history.length }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitContact,
  getContactHistory
};
