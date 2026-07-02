/**
 * @file backend/src/controllers/aiGrading.controller.js
 * Controller for AI Writing grading endpoint.
 * Handles auth, validation, idempotency, and orchestrates grading.
 */

const { pool } = require('../db/pool');
const { gradeWriting, countWords } = require('../ai/grading.service');
const {
  AI_GRADE_ERRORS, WORD_COUNT_THRESHOLDS, REPORT_STATUS,
} = require('../ai/aiGrading.constants');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/v1/submissions/writing/:submissionId/ai-grade
 */
const requestAiGrade = async (req, res, next) => {
  const requestId = uuidv4();
  const { submissionId } = req.params;
  const userId = req.user.id;
  let submission = null;

  try {
    if (req.user.role !== 'student') {
      return sendError(res, AI_GRADE_ERRORS.AIGRADE_006, requestId);
    }

    submission = await fetchAndValidateSubmission(
      submissionId, userId
    );
    const taskType = submission.task_number === 1 ? 'task1' : 'task2';

    // Idempotency check
    const cached = await findExistingReport(submissionId);
    if (cached) {
      return sendCachedResult(res, cached, requestId);
    }

    // Word count check before calling AI provider
    const wordCount = countWords(submission.response_text);
    const threshold = WORD_COUNT_THRESHOLDS[taskType];
    if (wordCount < threshold.systemMin) {
      return sendError(res, AI_GRADE_ERRORS.AIGRADE_001, requestId, {
        wordCount, required: threshold.systemMin,
      });
    }

    // Call AI grading service
    const result = await gradeWriting(submission, taskType, {
      testTitle: submission.test_title,
    });

    // Save result to DB in transaction
    const report = await saveGradingResult(
      submissionId, taskType, result
    );

    // Emit socket event
    emitGradingCompleted(req, submissionId, userId, result);

    return res.status(200).json({
      success: true,
      data: report,
      error: null,
      meta: { request_id: requestId },
    });
  } catch (err) {
    if (shouldPersistAiFailure(err, submission)) {
      await handleGradingError(err, submissionId, requestId);
      emitGradingFailed(req, submissionId, userId, err.errorCode);
    }
    if (err instanceof AppError) {
      return sendError(res, {
        code: err.errorCode || 'AIGRADE_004',
        message: err.message,
        status: err.statusCode,
      }, requestId);
    }
    next(err);
  }
};

const fetchAndValidateSubmission = async (submissionId, userId) => {
  const { rows } = await pool.query(
    `SELECT ws.*, mt.title AS test_title
     FROM writing_submissions ws
     LEFT JOIN mock_tests mt ON mt.id = ws.test_id
     WHERE ws.id = $1`,
    [submissionId]
  );
  if (rows.length === 0) {
    throw new AppError(
      AI_GRADE_ERRORS.AIGRADE_005.message,
      AI_GRADE_ERRORS.AIGRADE_005.status, 'AIGRADE_005'
    );
  }
  const sub = rows[0];
  if (sub.user_id !== userId) {
    throw new AppError(
      AI_GRADE_ERRORS.AIGRADE_006.message,
      AI_GRADE_ERRORS.AIGRADE_006.status, 'AIGRADE_006'
    );
  }
  if (sub.grader !== 'ai') {
    throw new AppError(
      AI_GRADE_ERRORS.AIGRADE_007.message,
      AI_GRADE_ERRORS.AIGRADE_007.status, 'AIGRADE_007'
    );
  }
  if (!sub.submitted_at || !['pending', 'ai_graded'].includes(sub.status)) {
    throw new AppError(
      AI_GRADE_ERRORS.AIGRADE_007.message,
      AI_GRADE_ERRORS.AIGRADE_007.status, 'AIGRADE_007'
    );
  }
  if (!sub.task_number || ![1, 2].includes(sub.task_number)) {
    throw new AppError(
      AI_GRADE_ERRORS.AIGRADE_009.message,
      AI_GRADE_ERRORS.AIGRADE_009.status, 'AIGRADE_009'
    );
  }
  return sub;
};

const AI_REPORT_INSERT_ORDER = [
  'submission_id',
  'submission_type',
  'band_score',
  'task_achievement_score',
  'coherence_score',
  'lexical_score',
  'grammar_score',
  'error_highlights',
  'suggestions',
  'criteria_json',
  'feedback_json',
  'raw_ai_response',
  'improved_version',
  'computed_band',
  'band_validation_warning',
  'model_name',
  'prompt_version',
  'status',
  'error_message',
];

const getAiReportColumns = async (db = pool) => {
  const { rows } = await db.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'ai_grading_reports'`
  );
  return new Set(rows.map(row => row.column_name));
};

const insertAiReport = async (db, valuesByColumn) => {
  const columns = await getAiReportColumns(db);
  const required = ['submission_id', 'submission_type'];
  const missingRequired = required.filter(column => !columns.has(column));
  if (missingRequired.length > 0) {
    throw new AppError(
      'AI grading reports table is not ready. Please run database migrations.',
      AI_GRADE_ERRORS.AIGRADE_010.status,
      'AIGRADE_010'
    );
  }

  const insertColumns = AI_REPORT_INSERT_ORDER.filter(column =>
    columns.has(column)
    && Object.prototype.hasOwnProperty.call(valuesByColumn, column)
  );
  const values = insertColumns.map(column => valuesByColumn[column]);
  const placeholders = insertColumns
    .map((_, index) => `$${index + 1}`)
    .join(', ');

  const { rows } = await db.query(
    `INSERT INTO ai_grading_reports (${insertColumns.join(', ')})
     VALUES (${placeholders})
     RETURNING *`,
    values
  );
  return rows[0];
};

const findExistingReport = async (submissionId) => {
  const { rows } = await pool.query(
    `SELECT * FROM ai_grading_reports
     WHERE submission_id = $1
       AND submission_type = 'writing'
       AND band_score IS NOT NULL
     ORDER BY generated_at DESC
     LIMIT 1`,
    [submissionId]
  );
  return rows.length > 0 ? rows[0] : null;
};

const sendCachedResult = (res, report, requestId) => {
  return res.status(200).json({
    success: true,
    data: formatReportResponse(report),
    error: null,
    meta: { request_id: requestId, cached: true },
  });
};

const formatReportResponse = (report) => ({
  id: report.id,
  bandScore: parseFloat(report.band_score),
  computedBand: report.computed_band
    ? parseFloat(report.computed_band) : null,
  criteria: report.criteria_json || null,
  feedback: report.feedback_json || null,
  improvedVersion: report.improved_version || null,
  status: report.status || REPORT_STATUS.COMPLETED,
  generatedAt: report.generated_at,
});

const saveGradingResult = async (submissionId, taskType, result) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const c = result.criteria;
    const feedbackJson = {
      summary: result.summary,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      majorErrors: result.majorErrors,
      nextStudyAdvice: result.nextStudyAdvice,
      wordCountFeedback: result.wordCountFeedback,
      disclaimer: result.disclaimer,
    };
    const suggestions = [
      result.summary,
      result.nextStudyAdvice,
    ].filter(Boolean).join('\n\n');

    const report = await insertAiReport(client, {
      submission_id: submissionId,
      submission_type: 'writing',
      band_score: result.overallBand,
      task_achievement_score: c.taskAchievementOrResponse.band,
      coherence_score: c.coherenceCohesion.band,
      lexical_score: c.lexicalResource.band,
      grammar_score: c.grammarRangeAccuracy.band,
      error_highlights: JSON.stringify(result.majorErrors || []),
      suggestions,
      criteria_json: JSON.stringify(result.criteria),
      feedback_json: JSON.stringify(feedbackJson),
      raw_ai_response: JSON.stringify(result.rawResponse || result),
      improved_version: result.improvedVersion || null,
      computed_band: result.computedBand,
      band_validation_warning: result.bandValidationWarning || null,
      model_name: result.modelName,
      prompt_version: result.promptVersion,
      status: REPORT_STATUS.COMPLETED,
    });

    await client.query(
      `UPDATE writing_submissions SET grader = 'ai', status = 'ai_graded'
       WHERE id = $1`, [submissionId]
    );

    await client.query('COMMIT');
    return report;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Failed to save AI grading result', {
      submissionId, error: err.message,
    });
    throw new AppError(
      AI_GRADE_ERRORS.AIGRADE_010.message,
      AI_GRADE_ERRORS.AIGRADE_010.status, 'AIGRADE_010'
    );
  } finally {
    client.release();
  }
};

const shouldPersistAiFailure = (err, submission) => {
  if (!submission || !(err instanceof AppError)) return false;
  return ['AIGRADE_003', 'AIGRADE_004', 'AIGRADE_008', 'AIGRADE_010']
    .includes(err.errorCode);
};

const handleGradingError = async (err, submissionId, requestId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await insertAiReport(client, {
      submission_id: submissionId,
      submission_type: 'writing',
      status: REPORT_STATUS.FAILED,
      error_message: err.message,
      raw_ai_response: JSON.stringify({
        requestId,
        errorCode: err.errorCode,
        message: err.message,
      }),
    });
    await client.query(
      `UPDATE writing_submissions
       SET grader = 'ai', status = 'pending'
       WHERE id = $1`,
      [submissionId]
    );
    await client.query('COMMIT');
  } catch (saveErr) {
    await client.query('ROLLBACK');
    logger.error('Failed to save grading error', {
      submissionId, requestId, error: saveErr.message,
    });
  } finally {
    client.release();
  }
};

const emitGradingCompleted = (req, submissionId, userId, result) => {
  const io = req.app.get('io');
  if (!io) return;
  io.to(userId).emit('grading_completed', {
    submissionId,
    studentId: userId,
    grader: 'ai',
    status: 'ai_graded',
    overallBand: result.overallBand,
    completedAt: new Date().toISOString(),
  });
};

const emitGradingFailed = (req, submissionId, userId, errorCode) => {
  const io = req.app.get('io');
  if (!io) return;
  io.to(userId).emit('grading_failed', {
    submissionId,
    studentId: userId,
    grader: 'ai',
    status: 'pending',
    errorCode,
  });
};

const sendError = (res, errDef, requestId, extra = {}) => {
  return res.status(errDef.status || 500).json({
    success: false,
    data: null,
    error: {
      code: errDef.code,
      message: errDef.message,
      request_id: requestId,
      ...extra,
    },
    meta: {},
  });
};

module.exports = { requestAiGrade };
