const express = require('express');
const router = express.Router();

const AppError = require('../../../utils/AppError');
const usersService = require('../../../services/users.service');
const adminControllerFactory = require('../../../controllers/admin.controller');
const authorizeFactory = require('../../../middleware/authorize');
const authenticate = require('../../../middleware/authenticate');

const adminController = adminControllerFactory(usersService, AppError);
const authorize = authorizeFactory(AppError);

// T039: API quản lý user dành cho Admin
router.get('/users', authenticate, authorize('admin'), adminController.listUsers);
router.put('/users/:id/role', authenticate, authorize('admin'), adminController.updateUserRole);
router.put('/users/:id/status', authenticate, authorize('admin'), adminController.updateUserStatus);

module.exports = router;
