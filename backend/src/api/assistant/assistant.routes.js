const express = require('express');
const rateLimit = require('express-rate-limit');
const rateLimitFactory = require('../../middleware/rateLimit');
const assistantController = require('./assistant.controller');

const router = express.Router();
const { assistantLimiter } = rateLimitFactory(rateLimit);

router.post('/chat', assistantLimiter, assistantController.chat);
router.post('/chat/stream', assistantLimiter, assistantController.chatStream);
router.get('/history', assistantController.history);
router.get('/status', assistantController.status);
router.post('/messages/:messageId/rating', assistantController.rateMessage);

module.exports = router;
