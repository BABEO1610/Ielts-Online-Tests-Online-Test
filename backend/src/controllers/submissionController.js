const SubmissionService = require('../services/submission.service');

class SubmissionController {
  static async submitWriting(req, res, next) {
    try {
      const userId = req.user.id;

      const submission = await SubmissionService.submitWriting(userId, req.body);
      
      res.status(201).json({
        success: true,
        data: {
          submission_id: submission.id,
          status: submission.status,
          submitted_at: submission.submitted_at
        },
        meta: null,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async getFeedback(req, res, next) {
    try {
      const { id } = req.params;
      
      // For Sprint 1, we just return empty reports since they are pending.
      // If we query the database, we could check the status, but an empty object works for the UI.
      res.status(200).json({
        success: true,
        data: {
          // Returning empty means "Chưa có kết quả chấm điểm"
        },
        meta: null,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SubmissionController;
