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

module.exports = router;
