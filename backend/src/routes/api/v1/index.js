const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const usersRoutes = require('./users.routes');

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

module.exports = router;
