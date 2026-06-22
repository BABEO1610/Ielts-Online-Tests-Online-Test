const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const usersRoutes = require('./users.routes');
const adminRoutes = require('./admin.routes');
const testRoutes = require('./tests');
const libraryRoutes = require('./library.routes');
const attemptRoutes = require('./attempts.routes');

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
router.use('/library', libraryRoutes);
router.use('/attempts', attemptRoutes);

module.exports = router;
