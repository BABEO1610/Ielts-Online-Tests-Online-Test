const express = require('express');
const router = express.Router();
const authenticateToken = require('../../../middleware/authenticate');
const uploadMiddleware = require('../../../middleware/upload.middleware');
const SubmissionController = require('../../../controllers/submission.controller');

// Upload audio temp
router.post(
  '/speaking/upload',
  authenticateToken,
  uploadMiddleware,
  SubmissionController.uploadSpeakingAudio
);

// Submit speaking (legacy - per part)
router.post(
  '/speaking',
  authenticateToken,
  SubmissionController.submitSpeaking
);



// Get feedback for a submission
router.get(
  '/:id/feedback',
  authenticateToken,
  SubmissionController.getFeedback
);

module.exports = router;
