const express = require('express');
const router = express.Router();

const SubmissionController = require('../../../controllers/submission.controller');
const AiGradingController = require('../../../controllers/aiGrading.controller');
const authenticate = require('../../../middleware/authenticate');
const uploadMiddleware = require('../../../middleware/upload.middleware');

// Apply auth middleware to all submission routes
router.use(authenticate);

// AI grading for a writing submission (must be before generic routes)
router.post('/writing/:submissionId/ai-grade', AiGradingController.requestAiGrade);

// Submit a writing task response
router.post('/writing', SubmissionController.submitWriting);

// Submit full writing test
router.post('/writing/full', SubmissionController.submitFullWriting);

// Upload audio temp (speaking)
router.post(
  '/speaking/upload',
  uploadMiddleware,
  SubmissionController.uploadSpeakingAudio
);

// Submit full speaking test (must be BEFORE generic /speaking to avoid Express match issue)
router.post('/speaking/full', SubmissionController.submitFullSpeaking);

// Submit speaking (legacy - per part, deprecated)
router.post(
  '/speaking',
  SubmissionController.submitSpeaking
);

// Get submission history for a student
router.get('/history', SubmissionController.getHistory);

// Get feedback for a submission
router.get('/:id/feedback', SubmissionController.getFeedback);

// Route for submitting a test (Listening / Reading)
router.post('/:testId', SubmissionController.submitTest);

// Route for fetching submission result
router.get('/:attemptId', SubmissionController.getSubmissionResult);

module.exports = router;
