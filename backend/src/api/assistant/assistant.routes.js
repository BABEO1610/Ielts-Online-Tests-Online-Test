const express = require('express');
const assistantController = require('./assistant.controller');

const router = express.Router();

router.post('/chat', assistantController.chat);
router.post('/chat/stream', assistantController.chatStream);
router.get('/history', assistantController.history);
router.get('/status', assistantController.status);
router.post('/messages/:messageId/rating', assistantController.rateMessage);

module.exports = router;
