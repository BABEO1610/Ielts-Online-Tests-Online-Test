const express = require('express');
const router = express.Router();
const usersController = require('../../../controllers/users.controller');
const authenticate = require('../../../middleware/authenticate');

// Get Profile
router.get('/me', authenticate, usersController.getProfile);

// Update Profile
router.put('/me', authenticate, usersController.updateProfile);

module.exports = router;
