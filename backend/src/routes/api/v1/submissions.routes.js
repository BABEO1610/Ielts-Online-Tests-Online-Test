const express = require('express');
const router = express.Router();
const SubmissionController = require('../../../controllers/submission.controller');
const authenticate = require('../../../middleware/authenticate');
const uploadMiddleware = require('../../../middleware/upload.middleware');

// Apply auth middleware to all submission routes
router.use(authenticate);

// Submit a writing task response
router.post('/writing', SubmissionController.submitWriting);

// Upload audio temp (speaking)
router.post(
  '/speaking/upload',
  uploadMiddleware,
  SubmissionController.uploadSpeakingAudio
);

// Submit speaking (legacy - per part)
router.post('/speaking', SubmissionController.submitSpeaking);

// Get feedback for a submission
router.get('/:id/feedback', SubmissionController.getFeedback);

module.exports = router;
