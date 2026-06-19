const { body, param, query, validationResult } = require('express-validator');
const libraryService = require('../services/library.service');
const AppError = require('../utils/AppError');

// ─── Validation rules ───────────────────────────────────────────────────────

const validateCreate = [
  body('title')
    .trim()
    .notEmpty().withMessage('Tiêu đề là bắt buộc.')
    .isLength({ max: 500 }).withMessage('Tiêu đề tối đa 500 ký tự.'),
  body('description')
    .optional({ nullable: true, checkFalsy: true })
    .trim(),
  body('category')
    .optional({ nullable: true, checkFalsy: true })
    .trim(),
];

const validateUpdate = [
  param('id').isUUID().withMessage('ID không hợp lệ.'),
  body('title')
    .trim()
    .notEmpty().withMessage('Tiêu đề là bắt buộc.')
    .isLength({ max: 500 }).withMessage('Tiêu đề tối đa 500 ký tự.'),
  body('description')
    .optional({ nullable: true, checkFalsy: true })
    .trim(),
  body('category')
    .optional({ nullable: true, checkFalsy: true })
    .trim(),
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function checkValidation(req, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg).join('; ');
    return next(new AppError(messages, 422, 'VALIDATION_ERROR'));
  }
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/library
 * Lấy danh sách tài liệu của tutor hiện tại
 */
const listResources = async (req, res, next) => {
  try {
    const { category } = req.query;
    const resources = await libraryService.listResources(category);

    return res.status(200).json({
      success: true,
      data: resources,
      error: null,
      meta: { total: resources.length },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/library/:id
 * Lấy chi tiết một tài liệu
 */
const getResource = async (req, res, next) => {
  try {
    const resource = await libraryService.getResourceDetail(req.params.id, req.user.id);

    return res.status(200).json({
      success: true,
      data: resource,
      error: null,
      meta: null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/library
 * Tạo tài liệu mới — multipart/form-data
 */
const createResource = [
  ...validateCreate,
  async (req, res, next) => {
    const validationErr = checkValidation(req, next);
    if (validationErr) return validationErr;

    try {
      const created = await libraryService.createResource(req.body, req.file, req.user.id);

      return res.status(201).json({
        success: true,
        data: created,
        error: null,
        meta: null,
      });
    } catch (err) {
      next(err);
    }
  },
];

/**
 * PUT /api/v1/library/:id
 * Cập nhật metadata tài liệu (và file đính kèm nếu có)
 */
const updateResource = [
  ...validateUpdate,
  async (req, res, next) => {
    const validationErr = checkValidation(req, next);
    if (validationErr) return validationErr;

    try {
      const updated = await libraryService.updateResource(req.params.id, req.user.id, req.body, req.file);

      return res.status(200).json({
        success: true,
        data: updated,
        error: null,
        meta: null,
      });
    } catch (err) {
      next(err);
    }
  },
];

/**
 * DELETE /api/v1/library/:id
 * Xóa tài liệu (cần user confirmation ở frontend — AGENTS.md rule)
 */
const deleteResource = async (req, res, next) => {
  try {
    await libraryService.deleteResource(req.params.id, req.user.id);

    return res.status(200).json({
      success: true,
      data: { message: 'Tài liệu đã được xóa thành công.' },
      error: null,
      meta: null,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listResources,
  getResource,
  createResource,
  updateResource,
  deleteResource,
};
