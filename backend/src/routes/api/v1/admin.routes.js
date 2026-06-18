const express = require('express');
const router = express.Router();

const AppError = require('../../../utils/AppError');
const usersService = require('../../../services/users.service');
const sessionsService = require('../../../services/sessions.service');
const contactsService = require('../../../services/contacts.service');
const auditService = require('../../../services/audit.service');
const adminControllerFactory = require('../../../controllers/admin.controller');
const authorizeFactory = require('../../../middleware/authorize');
const authenticate = require('../../../middleware/authenticate');

// Inject dependencies (Dependency Injection pattern)
const adminController = adminControllerFactory(usersService, AppError, sessionsService, contactsService, auditService);
const authorize = authorizeFactory(AppError);

// T039: API quản lý user dành cho Admin
router.get('/users', authenticate, authorize('admin'), adminController.listUsers);
router.put('/users/:id/role', authenticate, authorize('admin'), adminController.updateUserRole);
router.put('/users/:id/status', authenticate, authorize('admin'), adminController.updateUserStatus);

// API quản lý phiên đăng nhập (Sessions) — Safety S-04/S-05
// SEC-07: Mọi endpoint mutating (DELETE) phải có auth middleware
router.get('/sessions', authenticate, authorize('admin'), adminController.listSessions);
router.delete('/sessions/:id', authenticate, authorize('admin'), adminController.revokeSession);

// API hộp thư liên hệ (Contact Inbox)
// SEC-07: GET read-only cũng cần authenticate vì dữ liệu nhạy cảm
router.get('/contacts', authenticate, authorize('admin'), adminController.listContacts);
router.put('/contacts/:id/resolve', authenticate, authorize('admin'), adminController.resolveContact);

// API nhật ký duyệt & thay đổi
router.get('/change-logs', authenticate, authorize('admin'), adminController.listChangeLogs);
router.get('/change-logs/:id', authenticate, authorize('admin'), adminController.getChangeLogDetail);
router.post('/change-logs/:id/undo', authenticate, authorize('admin'), adminController.undoChangeLog);

module.exports = router;
