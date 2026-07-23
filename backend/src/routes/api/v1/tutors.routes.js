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

// GET /api/v1/tutors/grading-history/stats
router.get(
  '/grading-history/stats',
  authorize(['tutor', 'admin']),
  TutorController.getGradingHistoryStats
);

// GET /api/v1/tutors/grading-history
router.get(
  '/grading-history',
  authorize(['tutor', 'admin']),
  TutorController.getGradingHistory
);

// GET /api/v1/tutors/ai-reference
router.get(
  '/ai-reference',
  authorize(['tutor', 'admin']),
  TutorController.getAiReferenceList
);

// GET /api/v1/tutors/ai-reference/:submissionId
router.get(
  '/ai-reference/:submissionId',
  authorize(['tutor', 'admin']),
  TutorController.getAiReferenceDetail
);

// GET /api/v1/tutors/grading-history/:submissionId
router.get(
  '/grading-history/:submissionId',
  authorize(['tutor', 'admin']),
  TutorController.getGradingHistoryById
);

// PATCH /api/v1/tutors/grading-history/:submissionId/revoke
router.patch(
  '/grading-history/:submissionId/revoke',
  authorize(['tutor', 'admin']),
  TutorController.revokeGradingResult
);

// PATCH /api/v1/tutors/grading-history/:submissionId/score
router.patch(
  '/grading-history/:submissionId/score',
  authorize(['tutor', 'admin']),
  TutorController.updateGradingResult
);

// POST /api/v1/tutors/submissions/speaking/:speakingGroupId/claim
router.post(
  '/submissions/speaking/:speakingGroupId/claim',
  authorize(['tutor']),
  TutorController.claimSpeakingGroup
);

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

// POST /api/v1/tutors/submissions/:type/:submissionId/ai-prelim
router.post(
  '/submissions/:type/:submissionId/ai-prelim',
  authorize(['tutor', 'admin']),
  TutorController.runAiPrelimCheck
);

// POST /api/v1/tutors/submissions/speaking/:partId/transcribe
router.post(
  '/submissions/speaking/:partId/transcribe',
  authorize(['tutor', 'admin']),
  TutorController.transcribeSpeaking
);

// GET /api/v1/tutors/activity-logs
router.get(
  '/activity-logs',
  authorize(['tutor', 'admin']),
  TutorController.listActivityLogs
);

// GET /api/v1/tutors/activity-logs/stats
router.get(
  '/activity-logs/stats',
  authorize(['tutor', 'admin']),
  TutorController.getActivityLogStats
);

module.exports = router;
