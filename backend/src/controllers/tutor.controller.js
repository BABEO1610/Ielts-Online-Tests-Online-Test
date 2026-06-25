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
      let responseData;
      if (type === 'writing') {
        responseData = {
          type: 'writing',
          submissionId: detail.submission_id,
          student: {
            id: detail.student_id,
            fullName: detail.student_name
          },
          taskNumber: detail.task_number,
          promptText: detail.prompt_text,
          responseText: detail.response_text,
          fileUrl: detail.file_url,
          submittedAt: detail.submitted_at,
          status: detail.status,
          grader: detail.grader
        };
      } else {
        responseData = {
          type: 'speaking',
          submissionId: detail.submission_id,
          student: {
            id: detail.student_id,
            fullName: detail.student_name
          },
          partNumber: detail.part_number,
          promptText: detail.prompt_text,
          audioUrl: detail.audio_url,
          transcript: detail.transcript,
          submittedAt: detail.submitted_at,
          status: detail.status,
          grader: detail.grader
        };
      }

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
}

module.exports = TutorController;
