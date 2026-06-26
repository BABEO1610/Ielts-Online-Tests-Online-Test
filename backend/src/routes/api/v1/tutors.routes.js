const express = require('express');
const router = express.Router();

const authenticate = require('../../../middleware/authenticate');
const authorizeFactory = require('../../../middleware/authorize');
const AppError = require('../../../utils/AppError');
const TutorController = require('../../../controllers/tutor.controller');

const authorize = authorizeFactory(AppError);

// Apply authentication to all tutor routes
router.use(authenticate);

// GET /api/v1/tutors/queue — Fetch pending grading queue for tutors
router.get(
  '/queue',
  authorize(['tutor', 'admin']),
  TutorController.getTutorQueue
);

// GET /api/v1/tutors/dashboard-stats
router.get(
  '/dashboard-stats',
  authorize(['tutor', 'admin']),
  TutorController.getDashboardStats
);

// GET /api/v1/tutors/submissions/:type/:submissionId
router.get(
  '/submissions/:type/:submissionId',
  authorize(['tutor', 'admin']),
  TutorController.getSubmissionDetail
);

// POST /api/v1/tutors/submissions/:type/:submissionId/grade
router.post(
  '/submissions/:type/:submissionId/grade',
  authorize(['tutor']),
  TutorController.gradeSubmission
);

// POST /api/v1/tutors/submissions/speaking/:partId/transcribe
router.post(
  '/submissions/speaking/:partId/transcribe',
  authorize(['tutor', 'admin']),
  TutorController.transcribeSpeaking
);

module.exports = router;
