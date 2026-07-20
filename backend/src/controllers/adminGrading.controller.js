/**
 * @file backend/src/controllers/adminGrading.controller.js
 * @description Controller for Admin Grading Oversight (IELTS-06).
 *
 * Endpoints:
 *  GET  /admin/submissions         — List all writing + speaking submissions
 *  POST /admin/submissions/:type/:id/retry — Reset status to 'pending' to re-trigger AI grading
 */

const GradingOversightService = require('../services/grading.oversight.service');

/**
 * GET /admin/submissions
 * Trả về danh sách bài nộp (writing + speaking) để Admin giám sát.
 * Query params: status, limit, offset
 */
const listSubmissions = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;
    const status = req.query.status || null;

    const rows = await GradingOversightService.listSubmissions({
      status,
      limit,
      offset
    });

    const counts = await GradingOversightService.getStatusCounts();
    
    let total = 0;
    if (status) {
      total = counts[status] || 0;
    } else {
      total = Object.values(counts).reduce((a, b) => a + b, 0);
    }

    res.status(200).json({
      success: true,
      data: rows,
      error: null,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        counts
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /admin/submissions/:type/:id/retry
 * Reset trạng thái bài nộp về pending để AI chấm lại.
 * :type — 'writing' | 'speaking'
 * :id   — UUID của bài nộp
 */
const retryGrading = async (req, res, next) => {
  try {
    const { type, id } = req.params;

    if (!['writing', 'speaking'].includes(type)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: "type must be 'writing' or 'speaking'" },
        meta: null
      });
    }

    const result = await GradingOversightService.retryGrading(type, id);

    res.status(200).json({
      success: true,
      data: result,
      error: null,
      meta: { message: `Submission ${id} has been queued for re-grading.` }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listSubmissions,
  retryGrading
};
