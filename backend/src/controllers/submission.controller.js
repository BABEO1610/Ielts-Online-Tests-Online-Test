const SubmissionService = require('../services/submission.service');
const AppError = require('../utils/AppError');

class SubmissionController {
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

      if (!part_number || ![1, 2, 3].includes(parseInt(part_number))) {
        throw new AppError('part_number must be 1, 2, or 3', 400, 'INVALID_FIELD');
      }
      if (!temp_s3_key) throw new AppError('temp_s3_key is required', 400, 'MISSING_FIELD');
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
  static async getFeedback(req, res, next) {
    try {
      const { id } = req.params;
      const { type } = req.query; // 'speaking' | 'writing'

      const { pool } = require('../db/pool');

      let submission = null;
      let report = null;

      if (type === 'speaking') {
        const subRes = await pool.query(
          'SELECT * FROM speaking_submissions WHERE id = $1 AND user_id = $2',
          [id, req.user.id]
        );
        if (subRes.rows.length === 0) {
          throw new AppError('Submission not found', 404, 'NOT_FOUND');
        }
        submission = subRes.rows[0];

        if (submission.status === 'pending') {
          return res.status(202).json({
            success: true,
            data: { status: 'pending', message: 'Bài đang được chấm, vui lòng chờ...' },
            error: null,
            meta: null
          });
        }

        // Try to get AI report
        const aiRes = await pool.query(
          'SELECT * FROM ai_grading_reports WHERE submission_id = $1 AND submission_type = $2',
          [id, 'speaking']
        );
        if (aiRes.rows.length > 0) report = { ai_report: aiRes.rows[0] };

        // Try to get tutor report
        const tutorRes = await pool.query(
          'SELECT * FROM tutor_grading_reports WHERE submission_id = $1 AND submission_type = $2',
          [id, 'speaking']
        );
        if (tutorRes.rows.length > 0) report = { ...(report || {}), tutor_report: tutorRes.rows[0] };

      } else if (type === 'writing') {
        const subRes = await pool.query(
          'SELECT * FROM writing_submissions WHERE id = $1 AND user_id = $2',
          [id, req.user.id]
        );
        if (subRes.rows.length === 0) {
          throw new AppError('Submission not found', 404, 'NOT_FOUND');
        }
        submission = subRes.rows[0];

        if (submission.status === 'pending') {
          return res.status(202).json({
            success: true,
            data: { status: 'pending', message: 'Bài đang được chấm, vui lòng chờ...' },
            error: null,
            meta: null
          });
        }

        const aiRes = await pool.query(
          'SELECT * FROM ai_grading_reports WHERE submission_id = $1 AND submission_type = $2',
          [id, 'writing']
        );
        if (aiRes.rows.length > 0) report = { ai_report: aiRes.rows[0] };

        const tutorRes = await pool.query(
          'SELECT * FROM tutor_grading_reports WHERE submission_id = $1 AND submission_type = $2',
          [id, 'writing']
        );
        if (tutorRes.rows.length > 0) report = { ...(report || {}), tutor_report: tutorRes.rows[0] };

      } else {
        throw new AppError('type must be speaking or writing', 400, 'INVALID_FIELD');
      }

      res.status(200).json({
        success: true,
        data: report || {},
        error: null,
        meta: null
      });
    } catch (error) {
      next(error);
    }
  }

}

module.exports = SubmissionController;
