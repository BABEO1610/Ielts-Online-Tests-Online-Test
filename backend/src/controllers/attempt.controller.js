const AttemptService = require('../services/attempt.service');

class AttemptController {
  /**
   * POST /api/v1/tests/:id/attempts
   * Submit a completed test attempt.
   *
   * Expected body:
   *   { answers: { [questionOrder]: string }, timeSpent: number, practiceMode?: boolean }
   *
   * Security (IDOR): userId is ALWAYS taken from req.user.id (JWT auth middleware),
   * never from the request body — student can only submit for themselves.
   *
   * Validation:
   *   - answers must be a plain object (not null/array)
   *   - timeSpent must be a non-negative integer
   *   - testId must be a valid UUID (validated by service layer)
   */
  static async submitAttempt(req, res, next) {
    try {
      const testId = req.params.id;
      const userId = req.user.id; // IDOR: from JWT, not from body
      const { answers, timeSpent, practiceMode = false } = req.body;

      // ── Input validation ─────────────────────────────────────────────────
      if (answers === null || answers === undefined || typeof answers !== 'object' || Array.isArray(answers)) {
        return res.status(400).json({
          success: false,
          data: null,
          meta: null,
          error: { code: 'INVALID_PAYLOAD', message: '`answers` phải là một object { [questionOrder]: string }' },
        });
      }

      const parsedTimeSpent = Number(timeSpent);
      if (!Number.isFinite(parsedTimeSpent) || parsedTimeSpent < 0) {
        return res.status(400).json({
          success: false,
          data: null,
          meta: null,
          error: { code: 'INVALID_PAYLOAD', message: '`timeSpent` phải là số giây không âm' },
        });
      }

      const result = await AttemptService.submitAttempt(
        testId,
        userId,
        answers,
        Math.floor(parsedTimeSpent),
        Boolean(practiceMode)
      );

      res.status(201).json({
        success: true,
        data: result,
        meta: null,
        error: null,
      });
    } catch (error) {
      // Map service-level errors to HTTP status codes
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          data: null,
          meta: null,
          error: { message: error.message },
        });
      }
      next(error);
    }
  }


  /**
   * GET /api/v1/attempts/:attemptId
   * Get attempt summary (band score, raw score, time spent).
   */
  static async getAttempt(req, res, next) {
    try {
      const { attemptId } = req.params;
      const userId = req.user.id;

      const attempt = await AttemptService.getAttemptById(attemptId, userId);

      if (!attempt) {
        return res.status(404).json({
          success: false,
          data: null,
          meta: null,
          error: { message: 'Attempt not found' },
        });
      }

      res.status(200).json({
        success: true,
        data: attempt,
        meta: null,
        error: null,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/attempts/:attemptId/detail
   * Get per-question breakdown of attempt (for answer review page).
   */
  static async getAttemptDetail(req, res, next) {
    try {
      const { attemptId } = req.params;
      const userId = req.user.id;

      const detail = await AttemptService.getAttemptDetail(attemptId, userId);

      if (!detail) {
        return res.status(404).json({
          success: false,
          data: null,
          meta: null,
          error: { message: 'Attempt not found' },
        });
      }

      res.status(200).json({
        success: true,
        data: detail,
        meta: null,
        error: null,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/attempts?skill=reading
   * Get all attempts for the authenticated user, optionally filtered by skill.
   */
  static async getHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const { skill } = req.query;

      const history = await AttemptService.getAttemptHistory(
        userId,
        skill || null
      );

      res.status(200).json({
        success: true,
        data: history,
        meta: { total: history.length },
        error: null,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AttemptController;
