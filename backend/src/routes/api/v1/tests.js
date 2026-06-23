const express = require('express');
const router = express.Router();
const TestController = require('../../../controllers/testController');
const AttemptController = require('../../../controllers/attempt.controller');
const authenticate = require('../../../middleware/authenticate');

// Define route for creating tests
router.post('/', TestController.createTest);

// Define route for fetching tests list
router.get('/', TestController.getTests);

// Define route for fetching a single test by ID
// Must put /writing before /:id so it doesn't match as an ID
router.get('/writing', TestController.getWritingTests);
router.get('/:id', TestController.getTestById);

// Define route for a student to take a test (fetches test without answers)
router.get('/:id/take', TestController.getTestForStudent);

// Define route for updating a test
router.put('/:id', TestController.updateTest);

// Define route for deleting a test
router.delete('/:id', TestController.deleteTest);

// POST /api/v1/tests/:id/attempts — Nộp bài thi (yêu cầu đăng nhập)
router.post('/:id/attempts', authenticate, AttemptController.submitAttempt);

module.exports = router;
