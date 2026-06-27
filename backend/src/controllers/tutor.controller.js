const TutorService = require('../services/tutor.service');
const AuditLogService = require('../services/audit.service');

class TutorController {
  /**
   * GET /api/v1/tutors/queue
   * Fetch pending grading queue for tutors
   */
  static async getTutorQueue(req, res, next) {
    try {
      const { submission_type, search } = req.query;

      const filters = {
        submission_type: submission_type?.toLowerCase(),
        search: search?.trim(),
        tutorId: req.user.id
      };

      const queueData = await TutorService.getQueue(filters);

      res.status(200).json({
        success: true,
        data: queueData,
        error: null,
        meta: {
          total: queueData.length,
          filters: {
            submission_type: filters.submission_type || null,
            search: filters.search || null
          }
        }
      });
    } catch (err) {
      next(err); // Centralized error handler
    }
  }

  /**
   * GET /api/v1/tutors/dashboard-stats
   * Fetch dashboard stats for tutor
   */
  static async getDashboardStats(req, res, next) {
    try {
      const tutorId = req.user.id;
      const stats = await TutorService.getDashboardStats(tutorId);

      res.status(200).json({
        success: true,
        data: stats,
        error: null,
        meta: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/tutors/grading-history
   */
  static async getGradingHistory(req, res, next) {
    try {
      const tutorId = req.user.id;
      const { page, limit, export: isExport } = req.query;

      const result = await TutorService.getGradingHistory(tutorId, { page, limit, export: isExport });

      res.status(200).json({
        success: true,
        data: result.history,
        error: null,
        meta: result.meta
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/tutors/grading-history/stats
   */
  static async getGradingHistoryStats(req, res, next) {
    try {
      const tutorId = req.user.id;
      const stats = await TutorService.getGradingHistoryStats(tutorId);

      res.status(200).json({
        success: true,
        data: stats,
        error: null,
        meta: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/tutors/submissions/:type/:submissionId
   */
  static async getSubmissionDetail(req, res, next) {
    try {
      const { type, submissionId } = req.params;
      if (!['writing', 'speaking'].includes(type)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid type' }, data: null, meta: null });
      }

      const detail = await TutorService.getSubmissionDetail(type, submissionId);
      if (!detail) {
        return res.status(404).json({ success: false, error: { message: 'Submission not found' }, data: null, meta: null });
      }

      // Format response base on type as plan
      let responseData = detail;

      res.status(200).json({
        success: true,
        data: responseData,
        error: null,
        meta: null
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/tutors/submissions/:type/:submissionId/grade
   */
  static async gradeSubmission(req, res, next) {
    try {
      const { type, submissionId } = req.params;
      const tutorId = req.user.id; // From authenticate middleware
      const payload = req.body;

      if (!['writing', 'speaking'].includes(type)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid type' }, data: null, meta: null });
      }

      // Call service using transaction
      const result = await TutorService.gradeSubmission(type, submissionId, tutorId, payload, req.ip);

      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.to(result.studentId).emit('grading_completed', {
          type,
          submissionId,
          status: 'tutor_graded'
        });
      }

      res.status(200).json({
        success: true,
        data: { message: 'Grade submitted successfully' },
        error: null,
        meta: null
      });
    } catch (error) {
      // Pass the AppError to the error handler (it handles the status code 409 etc.)
      next(error);
    }
  }
  /**
   * POST /api/v1/tutors/submissions/speaking/:partId/transcribe
   */
  static async transcribeSpeaking(req, res, next) {
    try {
      const { partId } = req.params;
      const transcript = await TutorService.transcribeSpeakingPart(partId);
      
      res.status(200).json({
        success: true,
        data: { transcript },
        error: null,
        meta: null
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * GET /api/v1/tutors/grading-history/:submissionId
   */
  static async getGradingHistoryById(req, res, next) {
    try {
      const data = await TutorService.getGradingHistoryById(req.user.id, req.params.submissionId);
      res.status(200).json({ success: true, data, error: null, meta: null });
    } catch (err) {
      if (err.message.includes('Không tìm thấy')) {
        return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: err.message }, meta: null });
      }
      next(err);
    }
  }

  /**
   * PATCH /api/v1/tutors/grading-history/:submissionId/revoke
   */
  static async revokeGradingResult(req, res, next) {
    try {
      await TutorService.revokeGradingResult(req.user.id, req.params.submissionId);
      res.status(200).json({ success: true, data: { message: 'Thu hồi thành công' }, error: null, meta: null });
    } catch (err) {
      if (err.message.includes('Không tìm thấy') || err.message.includes('không có quyền')) {
        return res.status(403).json({ success: false, data: null, error: { code: 'FORBIDDEN', message: err.message }, meta: null });
      }
      next(err);
    }
  }

  /**
   * PATCH /api/v1/tutors/grading-history/:submissionId/score
   */
  static async updateGradingResult(req, res, next) {
    try {
      await TutorService.updateGradingResult(req.user.id, req.params.submissionId, req.body);
      res.status(200).json({ success: true, data: { message: 'Cập nhật thành công' }, error: null, meta: null });
    } catch (err) {
      if (err.message.includes('Không tìm thấy') || err.message.includes('không có quyền')) {
        return res.status(403).json({ success: false, data: null, error: { code: 'FORBIDDEN', message: err.message }, meta: null });
      }
      next(err);
    }
  }

  /**
   * GET /api/v1/tutors/activity-logs
   */
  static async listActivityLogs(req, res, next) {
    try {
      const { page, limit, action, target, severity, dateRange } = req.query;
      
      const filters = {
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 20,
        actorId: req.user.id, // Only tutor's own logs
        action: action || null,
        targetTable: target || null,
        severity: severity || null,
      };

      // Handle frontend "7 days" filter logic if passed
      if (dateRange === '7_days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        filters.startDate = d.toISOString();
      }

      const result = await AuditLogService.listActivityLogs(filters);

      res.status(200).json({
        success: true,
        data: result.logs,
        error: null,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/tutors/activity-logs/stats
   */
  static async getActivityLogStats(req, res, next) {
    try {
      const stats = await TutorService.getActivityLogStats(req.user.id);

      res.status(200).json({
        success: true,
        data: stats,
        error: null,
        meta: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = TutorController;
