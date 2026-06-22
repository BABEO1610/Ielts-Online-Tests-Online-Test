const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const usersRoutes = require('./users.routes');
const adminRoutes = require('./admin.routes');
const testRoutes = require('./tests');
const submissionsRoutes = require('./submissions.routes');
const libraryRoutes = require('./library.routes');
const audioRoutes = require('./audio.routes');
const submissionRoutes = require('./submissions.routes');

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

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/admin', adminRoutes);
router.use('/tests', testRoutes);
router.use('/submissions', submissionsRoutes);
router.use('/library', libraryRoutes);
router.use('/audio', audioRoutes);
router.use('/submissions', submissionRoutes);

module.exports = router;
