const express = require('express');
const router = express.Router();

const AppError = require('../../../utils/AppError');
const usersService = require('../../../services/users.service');
const sessionsService = require('../../../services/sessions.service');
const adminControllerFactory = require('../../../controllers/admin.controller');
const authorizeFactory = require('../../../middleware/authorize');
const authenticate = require('../../../middleware/authenticate');

// Inject sessionsService vào factory (Dependency Injection pattern)
const adminController = adminControllerFactory(usersService, AppError, sessionsService);
const authorize = authorizeFactory(AppError);

// T039: API quản lý user dành cho Admin
router.get('/users', authenticate, authorize('admin'), adminController.listUsers);
router.put('/users/:id/role', authenticate, authorize('admin'), adminController.updateUserRole);
router.put('/users/:id/status', authenticate, authorize('admin'), adminController.updateUserStatus);

// API quản lý phiên đăng nhập (Sessions) — Safety S-04/S-05
// SEC-07: Mọi endpoint mutating (DELETE) phải có auth middleware
router.get('/sessions', authenticate, authorize('admin'), adminController.listSessions);
router.delete('/sessions/:id', authenticate, authorize('admin'), adminController.revokeSession);

module.exports = router;
