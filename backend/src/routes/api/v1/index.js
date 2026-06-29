const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const usersRoutes = require('./users.routes');
const adminRoutes = require('./admin.routes');
const testRoutes = require('./tests');
const submissionsRoutes = require('./submissions.routes');
const libraryRoutes = require('./library.routes');
const attemptRoutes = require('./attempts.routes');
const audioRoutes = require('./audio.routes');
const supportRoutes = require('./support.routes');
const trackingRoutes = require('./tracking.routes');
const assistantRoutes = require('../../../api/assistant/assistant.routes');

// Health check endpoint for API v1
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'UP',
      version: 'v1'
    },
    error: null,
    meta: null
  });
});

router.get('/debug-db', async (req, res) => {
  const { pool } = require('../../../db/pool');
  try {
    const r = await pool.query('SELECT * FROM test_attempts');
    res.json(r.rows);
  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/admin', adminRoutes);
router.use('/tests', testRoutes);
router.use('/submissions', submissionsRoutes);
router.use('/library', libraryRoutes);
router.use('/tutors', require('./tutors.routes'));
router.use('/attempts', attemptRoutes);
router.use('/audio', audioRoutes);
router.use('/support', supportRoutes);
router.use('/tracking', trackingRoutes);
router.use('/assistant', assistantRoutes);

module.exports = router;
