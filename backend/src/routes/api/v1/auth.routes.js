const express = require('express');
const router = express.Router();
const authController = require('../../../controllers/auth.controller');
const authenticate = require('../../../middleware/authenticate');

const rateLimit = require('express-rate-limit');
const rateLimitFactory = require('../../../middleware/rateLimit');
const { loginLimiter, registerLimiter, forgotPasswordLimiter } = rateLimitFactory(rateLimit);

// Register
router.post('/register', registerLimiter, authController.registerValidator, authController.register);

// Verify Email
router.post('/verify-email', authController.verifyEmailValidator, authController.verifyEmail);

// Login
router.post('/login', loginLimiter, authController.loginValidator, authController.login);

// Refresh Token
router.post('/refresh-token', authController.refreshToken);

// Logout
router.post('/logout', authenticate, authController.logout);

// Forgot Password
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPasswordValidator, authController.forgotPassword);

// Reset Password
router.post('/reset-password', authController.resetPasswordValidator, authController.resetPassword);

// Google OAuth
router.get('/google', authController.googleRedirect);
router.get('/google/callback', authController.googleCallback);

module.exports = router;
