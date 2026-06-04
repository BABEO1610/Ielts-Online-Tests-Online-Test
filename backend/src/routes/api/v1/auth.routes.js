const express = require('express');
const router = express.Router();
const authController = require('../../../controllers/auth.controller');
const authenticate = require('../../../middleware/authenticate');

// Register
router.post('/register', authController.registerValidator, authController.register);

// Verify Email
router.post('/verify-email', authController.verifyEmailValidator, authController.verifyEmail);

// Login
router.post('/login', authController.loginValidator, authController.login);

// Refresh Token
router.post('/refresh-token', authController.refreshToken);

// Logout
router.post('/logout', authenticate, authController.logout);

// Forgot Password
router.post('/forgot-password', authController.forgotPasswordValidator, authController.forgotPassword);

// Reset Password
router.post('/reset-password', authController.resetPasswordValidator, authController.resetPassword);

// Google OAuth
router.get('/google', authController.googleRedirect);
router.get('/google/callback', authController.googleCallback);

module.exports = router;
