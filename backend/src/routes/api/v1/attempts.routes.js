const express = require('express');
const router = express.Router();
const AttemptController = require('../../../controllers/attempt.controller');
const authenticate = require('../../../middleware/authenticate');

// All attempt routes require authentication
router.use(authenticate);

// GET  /api/v1/attempts              — lịch sử làm bài (có thể filter ?skill=reading)
// (Lấy danh sách toàn bộ lịch sử)
router.get('/', AttemptController.getHistory);

// GET  /api/v1/attempts/:attemptId         — tổng quan kết quả 1 lần thi
// (Lấy Metadata: Điểm số, thời gian của 1 bài cụ thể)
router.get('/:attemptId', AttemptController.getAttempt);

// GET  /api/v1/attempts/:attemptId/detail  — chi tiết từng câu hỏi
// (Lấy toàn bộ 40 câu hỏi, đáp án đã chọn, đáp án đúng, giải thích chi tiết)
router.get('/:attemptId/detail', AttemptController.getAttemptDetail);

module.exports = router;
