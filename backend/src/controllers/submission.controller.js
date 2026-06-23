const SubmissionService = require('../services/submission.service');
const AppError = require('../utils/AppError');

class SubmissionController {
  /**
   * Submit writing task response
   */
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

  /**
   * Upload audio temp (speaking)
   */
  static async uploadSpeakingAudio(req, res, next) {
    try {
      if (!req.file) {
        throw new AppError('No audio file uploaded', 400, 'NO_FILE');
      }

      // We only return the relative path
      // file.filename contains the UUID.ext
      const tempS3Key = `uploads/temp_audio/${req.user.id}/${req.file.filename}`;

      res.status(200).json({
        success: true,
        data: {
          temp_s3_key: tempS3Key
        },
        error: null,
        meta: null
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submit speaking (legacy - per part)
   */
  static async submitSpeaking(req, res, next) {
    try {
      const userId = req.user.id;
      let { test_id, part_number, temp_s3_key, grader } = req.body;

      // Basic validation
      // Allow test_id to be invalid dummy ID (convert to null) so frontend can test mock exams
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (test_id && !uuidRegex.test(test_id)) {
        test_id = null;
      }

      if (!part_number || ![1, 2, 3].includes(parseInt(part_number, 10))) {
        throw new AppError('part_number must be 1, 2, or 3', 400, 'INVALID_FIELD');
      }
      if (!temp_s3_key) {
        throw new AppError('temp_s3_key is required', 400, 'MISSING_FIELD');
      }
      if (!grader || !['ai', 'tutor'].includes(grader)) {
        throw new AppError('grader must be ai or tutor', 400, 'INVALID_FIELD');
      }

      const submission = await SubmissionService.submitSpeaking(userId, test_id, part_number, temp_s3_key, grader);

      res.status(201).json({
        success: true,
        data: submission,
        error: null,
        meta: null
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get feedback for a submission (speaking / writing)
   */
  static async getFeedback(req, res, next) {
    try {
      const { id } = req.params;
      const { type } = req.query; // 'speaking' | 'writing'
      const userId = req.user.id;

      const result = await SubmissionService.getFeedback(id, userId, type);

      if (result.status === 'pending') {
        return res.status(202).json({
          success: true,
          data: result,
          error: null,
          meta: null
        });
      }

      res.status(200).json({
        success: true,
        data: result,
        error: null,
        meta: null
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Route for submitting a test (Listening / Reading)
   */
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

  /**
   * Route for fetching submission result
   */
  static async getSubmissionResult(req, res, next) {
    try {
      const attemptId = req.params.attemptId;
      const userId = req.user.id;

      const result = await SubmissionService.getSubmissionResult(attemptId, userId);

      if (!result) {
        throw new AppError('Submission not found', 404, 'NOT_FOUND');
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

  /**
   * Route for creating a speaking test attempt
   */
  static async createSpeakingAttempt(req, res, next) {
    try {
      const userId = req.user.id;
      const { test_id } = req.body;

      const result = await SubmissionService.createAttempt(userId, test_id);

      res.status(201).json({
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
