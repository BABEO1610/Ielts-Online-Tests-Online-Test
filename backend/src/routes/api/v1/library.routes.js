const express = require('express');
const router = express.Router();
const path = require('path');

const authenticate = require('../../../middleware/authenticate');
const authorizeFactory = require('../../../middleware/authorize');
const AppError = require('../../../utils/AppError');
const upload = require('../../../config/multer');
const libraryController = require('../../../controllers/library.controller');

const authorize = authorizeFactory(AppError);

// ── Public routes (student có thể xem danh sách + tải file) ─────────────────

// GET    /api/v1/library          — danh sách tài liệu (public, ai cũng xem được)
router.get('/', libraryController.listResources);

// GET    /api/v1/library/files/:filename — serve file (public download)
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

// GET    /api/v1/library/:id      — chi tiết tài liệu (public)
router.get('/:id', libraryController.getResource);

// ── Protected routes (tutor/admin mới được tạo/sửa/xóa) ────────────────────

// POST   /api/v1/library          — tạo mới (multipart/form-data, 1 file)
router.post(
  '/',
  authenticate,
  authorize(['tutor', 'admin']),
  upload.single('file'),
  libraryController.createResource
);

// PUT    /api/v1/library/:id      — cập nhật metadata và file đính kèm
router.put(
  '/:id',
  authenticate,
  authorize(['tutor', 'admin']),
  upload.single('file'),
  libraryController.updateResource
);

// DELETE /api/v1/library/:id      — xóa tài liệu
router.delete('/:id', authenticate, authorize(['tutor', 'admin']), libraryController.deleteResource);

module.exports = router;

