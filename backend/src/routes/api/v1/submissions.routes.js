const express = require('express');
const router = express.Router();
const SubmissionController = require('../../../controllers/submission.controller');
const authenticate = require('../../../middleware/authenticate');

// Route for submitting a test
router.post('/:testId', authenticate, SubmissionController.submitTest);

// Route for fetching submission result
router.get('/:attemptId', authenticate, SubmissionController.getSubmissionResult);

module.exports = router;
