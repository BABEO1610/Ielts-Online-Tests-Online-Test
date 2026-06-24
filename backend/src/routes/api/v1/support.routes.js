/**
 * @file backend/src/routes/api/v1/support.routes.js
 * @description Routes cho tính năng support/contact.
 */

const express = require('express');
const router = express.Router();
const supportController = require('../../../controllers/support.controller');
const authenticate = require('../../../middleware/authenticate');

// Tạo mới tin nhắn liên hệ. Route: POST /api/v1/support/contact
router.post('/contact', authenticate, supportController.submitContact);

// Lấy lịch sử liên hệ. Route: GET /api/v1/support/history
router.get('/history', authenticate, supportController.getContactHistory);

module.exports = router;
