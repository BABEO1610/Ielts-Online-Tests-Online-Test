/**
 * ==========================================
 * TẦNG 1: GIAO TIẾP (Routing & Validation)
 * ==========================================
 * Nhiệm vụ: Đón nhận các HTTP Request từ Frontend, áp dụng Rate Limit (chống spam) 
 * và chuyển tiếp đến Tầng 2 (Controller).
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const rateLimitFactory = require('../../middleware/rateLimit');
const assistantController = require('./assistant.controller');

const router = express.Router();

// Bộ đếm chống spam: Ngăn chặn gửi quá nhiều tin nhắn chat trong thời gian ngắn
const { assistantLimiter } = rateLimitFactory(rateLimit);

// API gửi tin nhắn thường (trả về cục JSON)
router.post('/chat', assistantLimiter, assistantController.chat);

// API gửi tin nhắn dạng luồng (Server-Sent Events) giống ChatGPT
router.post('/chat/stream', assistantLimiter, assistantController.chatStream);

// API lấy lại lịch sử trò chuyện
router.get('/history', assistantController.history);

// API kiểm tra trạng thái của AI (còn quota hay bảo trì không)
router.get('/status', assistantController.status);

// API đánh giá tin nhắn (Like/Dislike)
router.post('/messages/:messageId/rating', assistantController.rateMessage);

module.exports = router;
