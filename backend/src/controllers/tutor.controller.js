const TutorService = require('../services/tutor.service');

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
        search: search?.trim()
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
      const result = await TutorService.gradeSubmission(type, submissionId, tutorId, payload);

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
}

module.exports = TutorController;
