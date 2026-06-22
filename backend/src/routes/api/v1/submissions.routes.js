const express = require('express');
const router = express.Router();
const SubmissionController = require('../../../controllers/submissionController');
const authenticate = require('../../../middleware/authenticate');

// Apply auth middleware to all submission routes
router.use(authenticate);

// Submit a writing task response
router.post('/writing', SubmissionController.submitWriting);

// Get feedback for a submission (placeholder for pending)
router.get('/:id/feedback', SubmissionController.getFeedback);

module.exports = router;
