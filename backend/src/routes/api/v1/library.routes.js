const express = require('express');
const router = express.Router();
const path = require('path');

const authenticate = require('../../../middleware/authenticate');
const authorizeFactory = require('../../../middleware/authorize');
const AppError = require('../../../utils/AppError');
const upload = require('../../../config/multer');
const libraryController = require('../../../controllers/library.controller');

const authorize = authorizeFactory(AppError);

// Tất cả routes yêu cầu authenticate + role tutor hoặc admin (SEC-07)
router.use(authenticate);
router.use(authorize(['tutor', 'admin']));

// Serve uploaded files (chỉ cho tutor/admin đã authenticated)
// ADR-004: file lưu local trước
router.get(
  '/files/:filename',
  (req, res, next) => {
    const filename = path.basename(req.params.filename); // ngăn path traversal
    const filePath = path.resolve(__dirname, '../../../../uploads/library', filename);
    res.sendFile(filePath, (err) => {
      if (err) next(new AppError('File không tồn tại.', 404, 'FILE_NOT_FOUND'));
    });
  }
);

// GET    /api/v1/library          — danh sách tài liệu (có filter category)
router.get('/', libraryController.listResources);

// GET    /api/v1/library/:id      — chi tiết tài liệu
router.get('/:id', libraryController.getResource);

// POST   /api/v1/library          — tạo mới (multipart/form-data, 1 file)
router.post(
  '/',
  upload.single('file'),
  libraryController.createResource
);

// PUT    /api/v1/library/:id      — cập nhật metadata và file đính kèm
router.put(
  '/:id',
  upload.single('file'),
  libraryController.updateResource
);

// DELETE /api/v1/library/:id      — xóa tài liệu
router.delete('/:id', libraryController.deleteResource);

module.exports = router;
