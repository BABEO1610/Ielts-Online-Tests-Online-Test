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
    const { status, limit = 50, offset = 0 } = req.query;

    const rows = await GradingOversightService.listSubmissions({
      status: status || null,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });

    const counts = await GradingOversightService.getStatusCounts();

    res.status(200).json({
      success: true,
      data: rows,
      error: null,
      meta: {
        total: rows.length,
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
