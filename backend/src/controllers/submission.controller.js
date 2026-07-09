const SubmissionService = require('../services/submission.service');
const AppError = require('../utils/AppError');
const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const SUPABASE_BUCKET = process.env.SUPABASE_SPEAKING_BUCKET || 'speaking-audio';

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
   * Submit full writing test (both tasks)
   */
  static async submitFullWriting(req, res, next) {
    try {
      const userId = req.user.id;
      const { test_id, grader, tasks } = req.body;
      
      if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        throw new AppError('Tasks are required', 400, 'MISSING_FIELD');
      }

      const result = await SubmissionService.submitFullWriting(userId, test_id, grader, tasks);

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

  /**
   * Upload audio temp (speaking)
   */
  static async uploadSpeakingAudio(req, res, next) {
    try {
      if (!req.file) {
        throw new AppError('No audio file uploaded', 400, 'NO_FILE');
      }

      const userId = req.user.id;

      // Đoán extension từ mimetype
      const mimeType = req.file.mimetype.split(';')[0].trim();
      const extMap = {
        'audio/webm': '.webm',
        'audio/mpeg': '.mp3',
        'audio/wav': '.wav',
        'audio/x-wav': '.wav',
        'audio/ogg': '.ogg',
        'audio/mp4': '.m4a',
        'audio/m4a': '.m4a',
      };
      const ext = extMap[mimeType] || path.extname(req.file.originalname) || '.audio';
      const filename = `${uuidv4()}${ext}`;

      // Path trong Supabase bucket: speaking/{userId}/{uuid}.ext
      const storagePath = `speaking/${userId}/${filename}`;

      // Upload buffer lên Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(storagePath, req.file.buffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        throw new AppError(`Supabase upload failed: ${uploadError.message}`, 500, 'STORAGE_UPLOAD_ERROR');
      }

      const { data: publicUrlData } = supabase.storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(storagePath);

      res.status(200).json({
        success: true,
        data: {
          temp_s3_key: storagePath,
          audio_url: publicUrlData?.publicUrl || null
        },
        error: null,
        meta: null
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submit speaking (legacy - per part, deprecated)
   * Kept for backward compatibility. Wraps submitFullSpeaking with single part.
   */
  static async submitSpeaking(req, res, next) {
    try {
      const userId = req.user.id;
      let { test_id, part_number, temp_s3_key, grader } = req.body;

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
      if (grader === 'ai') {
        throw new AppError(
          'AI Speaking grading requires all 3 parts. Use /submissions/speaking/full.',
          400,
          'SPEAKING_FULL_SUBMISSION_REQUIRED'
        );
      }

      // Delegate to submitFullSpeaking with single part (speaking_group_id will be generated)
      const result = await SubmissionService.submitFullSpeaking(userId, test_id, grader, [
        { part_number: parseInt(part_number, 10), temp_s3_key }
      ]);

      res.status(201).json({
        success: true,
        data: result.parts[0],
        error: null,
        meta: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAudioUrl(req, res, next) {
    try {
      const { id } = req.params;
      const { type = 'speaking' } = req.query;

      if (type !== 'speaking') {
        throw new AppError('type must be speaking', 400, 'INVALID_FIELD');
      }

      const audioUrl = await SubmissionService.getSpeakingAudioUrl(id, req.user);

      res.status(200).json({
        success: true,
        data: {
          presigned_url: audioUrl,
          audio_url: audioUrl
        },
        error: null,
        meta: null
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get submission history for a student
   */
  static async getHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const history = await SubmissionService.getHistory(userId);
      res.status(200).json({
        success: true,
        data: history,
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
   * Route for submitting a full speaking test
   */
  static async submitFullSpeaking(req, res, next) {
    try {
      const userId = req.user.id;
      const { test_id, grader, parts } = req.body;

      if (!parts || !Array.isArray(parts) || parts.length !== 3) {
        throw new AppError('Full speaking submission requires exactly 3 parts', 400, 'INVALID_FIELD');
      }

      const result = await SubmissionService.submitFullSpeaking(userId, test_id, grader, parts);

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
