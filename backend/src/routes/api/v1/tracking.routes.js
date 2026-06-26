/**
 * @file backend/src/routes/api/v1/tracking.routes.js
 * @description Routes cho tính năng Process Tracking.
 */

const express = require('express');
const router = express.Router();
const trackingController = require('../../../controllers/tracking.controller');
const authenticate = require('../../../middleware/authenticate');

// GET /api/v1/tracking/process
router.get('/process', authenticate, trackingController.getTrackingProcess);

module.exports = router;
