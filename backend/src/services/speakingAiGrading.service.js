const { pool } = require('../db/pool');
const { gradeSpeakingSession } = require('../ai/grading.service');
const { REPORT_STATUS } = require('../ai/aiGrading.constants');
const { generateTranscript } = require('./ai.service');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const AI_REPORT_INSERT_ORDER = [
  'submission_id',
  'submission_type',
  'speaking_group_id',
  'part_number',
  'band_score',
  'computed_band',
  'fluency_score',
  'lexical_score',
  'grammar_score',
  'pronunciation_score',
  'error_highlights',
  'suggestions',
  'criteria_json',
  'feedback_json',
  'raw_ai_response',
  'band_validation_warning',
  'model_name',
  'prompt_version',
  'status',
  'error_message',
];

const getTableColumns = async (db, tableName) => {
  const { rows } = await db.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1`,
    [tableName]
  );
  return new Set(rows.map(row => row.column_name));
};

const insertAiReport = async (db, valuesByColumn) => {
  const columns = await getTableColumns(db, 'ai_grading_reports');
  if (!columns.has('submission_id') || !columns.has('submission_type')) {
    throw new AppError('AI grading reports table is not ready. Please run database migrations.', 500, 'AIGRADE_010');
  }

  const insertColumns = AI_REPORT_INSERT_ORDER.filter(column =>
    columns.has(column)
    && Object.prototype.hasOwnProperty.call(valuesByColumn, column)
  );
  const values = insertColumns.map(column => valuesByColumn[column]);
  const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');
  const { rows } = await db.query(
    `INSERT INTO ai_grading_reports (${insertColumns.join(', ')})
     VALUES (${placeholders})
     RETURNING *`,
    values
  );
  return rows[0];
};

const getSpeakingGroupParts = async (submissionIdOrGroupId) => {
  const { rows } = await pool.query(
    `SELECT ss.*, mt.title AS test_title
     FROM speaking_submissions ss
     LEFT JOIN mock_tests mt ON mt.id = ss.test_id
     WHERE ss.id::text = $1 OR ss.speaking_group_id::text = $1
     ORDER BY ss.part_number ASC`,
    [submissionIdOrGroupId]
  );
  if (rows.length === 0) {
    throw new AppError('Speaking submission not found', 404);
  }
  return rows;
};

const getLatestCompletedReports = async (partIds) => {
  if (partIds.length === 0) return new Map();
  const columns = await getTableColumns(pool, 'ai_grading_reports');
  const statusPredicate = columns.has('status')
    ? "AND COALESCE(status, 'completed') = 'completed'"
    : '';
  const { rows } = await pool.query(
    `SELECT DISTINCT ON (submission_id) *
     FROM ai_grading_reports
     WHERE submission_type = 'speaking'
       AND submission_id = ANY($1::uuid[])
       AND band_score IS NOT NULL
       ${statusPredicate}
     ORDER BY submission_id, generated_at DESC`,
    [partIds]
  );
  const reportBySubmission = new Map();
  for (const report of rows) {
    if (report.part_number === null || report.part_number === undefined) {
      partIds.forEach(partId => reportBySubmission.set(partId, report));
    } else {
      reportBySubmission.set(report.submission_id, report);
    }
  }
  return reportBySubmission;
};

const ensureTranscript = async (part) => {
  if (part.transcript && String(part.transcript).trim()) {
    return part.transcript;
  }
  if (!part.audio_url) {
    throw new AppError('Speaking transcript is required before AI grading.', 422, 'SPEAKING_TRANSCRIPT_REQUIRED');
  }
  const transcript = await generateTranscript(part.audio_url);
  await pool.query(
    'UPDATE speaking_submissions SET transcript = $1 WHERE id = $2',
    [transcript, part.id]
  );
  return transcript;
};

const buildFeedbackJson = (result) => ({
  summary: result.summary,
  strengths: result.strengths,
  weaknesses: result.weaknesses,
  majorErrors: result.majorErrors,
  detailedFeedback: result.detailedFeedback,
  actionPlan: result.actionPlan,
  nextStudyAdvice: result.nextStudyAdvice,
  transcriptNotes: result.transcriptNotes,
  partFeedback: result.partFeedback,
  disclaimer: result.disclaimer,
});

const saveCompletedReport = (part, result) => insertAiReport(pool, {
  submission_id: part.id,
  submission_type: 'speaking',
  speaking_group_id: part.speaking_group_id,
  part_number: result.partNumber,
  band_score: result.overallBand,
  computed_band: result.computedBand,
  fluency_score: result.criteria.fluencyCoherence.band,
  lexical_score: result.criteria.lexicalResource.band,
  grammar_score: result.criteria.grammaticalRangeAccuracy.band,
  pronunciation_score: result.criteria.pronunciation.band,
  error_highlights: JSON.stringify(result.majorErrors || []),
  suggestions: result.summary,
  criteria_json: JSON.stringify(result.criteria),
  feedback_json: JSON.stringify(buildFeedbackJson(result)),
  raw_ai_response: result.rawResponse,
  band_validation_warning: result.bandValidationWarning,
  model_name: result.modelName,
  prompt_version: result.promptVersion,
  status: REPORT_STATUS.COMPLETED,
  error_message: null,
});

const saveFailedReport = (part, error) => insertAiReport(pool, {
  submission_id: part.id,
  submission_type: 'speaking',
  speaking_group_id: part.speaking_group_id,
  part_number: part.part_number,
  status: REPORT_STATUS.FAILED,
  error_message: error.message,
  raw_ai_response: JSON.stringify({
    errorCode: error.errorCode || error.code || 'SPEAKING_AI_FAILED',
    message: error.message,
  }),
});

const gradeSpeakingGroup = async (submissionIdOrGroupId, { force = false } = {}) => {
  const parts = await getSpeakingGroupParts(submissionIdOrGroupId);
  if (parts.length !== 3) {
    throw new AppError('Speaking AI grading requires exactly 3 parts.', 400, 'SPEAKING_PARTS_REQUIRED');
  }

  const partIds = parts.map(part => part.id);
  const existingReports = force ? new Map() : await getLatestCompletedReports(partIds);
  const existingOverallReport = existingReports.get(parts[0].id);
  if (existingOverallReport) {
    return {
      speakingGroupId: parts[0].speaking_group_id,
      status: REPORT_STATUS.COMPLETED,
      overallBand: Number(existingOverallReport.band_score),
      reports: [existingOverallReport],
    };
  }

  const representativePart = parts[0];
  try {
    const partsWithTranscripts = [];
    for (const part of parts) {
      partsWithTranscripts.push({
        ...part,
        transcript: await ensureTranscript(part),
      });
    }
    const result = await gradeSpeakingSession(partsWithTranscripts, {
      testTitle: representativePart.test_title,
    });
    const report = await saveCompletedReport(representativePart, result);
    return {
      speakingGroupId: representativePart.speaking_group_id,
      status: REPORT_STATUS.COMPLETED,
      overallBand: Number(report.band_score),
      reports: [report],
    };
  } catch (error) {
    logger.warn('Speaking AI session grading failed', {
      speakingGroupId: representativePart.speaking_group_id,
      error: error.message,
    });
    const report = await saveFailedReport(representativePart, error);
    return {
      speakingGroupId: representativePart.speaking_group_id,
      status: REPORT_STATUS.FAILED,
      overallBand: null,
      reports: [report],
    };
  }
};

module.exports = {
  gradeSpeakingGroup,
  getLatestCompletedReports,
};
