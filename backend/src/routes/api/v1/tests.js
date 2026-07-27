const express = require('express');
const router = express.Router();
const TestController = require('../../../controllers/testController');
const AttemptController = require('../../../controllers/attempt.controller');
const authenticate = require('../../../middleware/authenticate');

// Define route for creating tests
router.post('/', authenticate, TestController.createTest);

// Define route for fetching tests list
router.get('/', TestController.getTests);

// Define route for fetching a single test by ID
// Must put /writing before /:id so it doesn't match as an ID
router.get('/writing', TestController.getWritingTests);
router.get('/:id', TestController.getTestById);

// Define route for a student to take a test (fetches test without answers)
router.get('/:id/take', TestController.getTestForStudent);

// Define route for updating a test
router.put('/:id', authenticate, TestController.updateTest);

// Define route for deleting a test
router.delete('/:id', authenticate, TestController.deleteTest);

// POST /api/v1/tests/:id/attempts — Nộp bài thi (yêu cầu đăng nhập)
// (Route được bảo vệ bởi middleware `authenticate`. Middleware này giải mã JWT Token, trích xuất thông tin người dùng và gắn vào `req.user`. Chặn việc một user giả mạo ID để nộp bài hộ người khác (IDOR))
router.post('/:id/attempts', authenticate, AttemptController.submitAttempt);

module.exports = router;
