const express = require('express');
const router = express.Router();
const usersController = require('../../../controllers/users.controller');
const authenticate = require('../../../middleware/authenticate');
const uploadImageMiddleware = require('../../../middleware/uploadImage.middleware');

// Get Profile
router.get('/me', authenticate, usersController.getProfile);

// Update Profile
router.put('/me', authenticate, usersController.updateProfile);
router.patch('/me', authenticate, usersController.updateProfile);

// Upload Avatar
router.post('/me/avatar', authenticate, uploadImageMiddleware, usersController.uploadAvatar);

module.exports = router;
