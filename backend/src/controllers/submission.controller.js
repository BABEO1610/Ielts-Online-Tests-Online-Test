const SubmissionService = require('../services/submission.service');

class SubmissionController {
  static async submitTest(req, res, next) {
    try {
      const testId = req.params.testId;
      const userId = req.user.id;
      const { answers, timeSpentSeconds } = req.body;

      const result = await SubmissionService.submitObjectiveTest(userId, testId, answers, timeSpentSeconds);

      res.status(200).json({
        success: true,
        data: result,
        meta: null,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSubmissionResult(req, res, next) {
    try {
      const attemptId = req.params.attemptId;
      const userId = req.user.id;

      const result = await SubmissionService.getSubmissionResult(attemptId, userId);

      if (!result) {
        return res.status(404).json({
          success: false,
          data: null,
          meta: null,
          error: { message: 'Submission not found' }
        });
      }

      res.status(200).json({
        success: true,
        data: result,
        meta: null,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SubmissionController;
