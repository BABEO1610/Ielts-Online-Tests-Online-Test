const express = require('express');
const router = express.Router();
const AttemptController = require('../../../controllers/attempt.controller');
const authenticate = require('../../../middleware/authenticate');

// All attempt routes require authentication
router.use(authenticate);

// GET  /api/v1/attempts              — lịch sử làm bài (có thể filter ?skill=reading)
router.get('/', AttemptController.getHistory);

// GET  /api/v1/attempts/:attemptId         — tổng quan kết quả 1 lần thi
router.get('/:attemptId', AttemptController.getAttempt);

// GET  /api/v1/attempts/:attemptId/detail  — chi tiết từng câu hỏi
router.get('/:attemptId/detail', AttemptController.getAttemptDetail);

module.exports = router;
