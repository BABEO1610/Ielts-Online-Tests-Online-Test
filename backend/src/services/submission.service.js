const { pool } = require('../db/pool');
const crypto = require('node:crypto');
const { getBandScore, calcWeightedWritingOverall, isValidHalfBandScore } = require('../utils/scoring');
const TestService = require('./test.service');
const AppError = require('../utils/AppError');
const supabase = require('../config/supabase');
const { gradeWriting, countWords } = require('../ai/grading.service');
const { REPORT_STATUS } = require('../ai/aiGrading.constants');
const logger = require('../utils/logger');
const { validateWritingWordThreshold, sanitizeWritingText } = require('../ai/grading.validator');
const { aiGradingConfig } = require('../config/aiGrading.config');
const { reserveOriginalWithQuota, utcDate } = require('./aiQuota.service');
const aiJobQueries = require('../db/queries/aiGradingJobs.queries');
const { sanitizeDiagnostic } = require('./aiUsage.service');

const SUPABASE_BUCKET = process.env.SUPABASE_SPEAKING_BUCKET || 'speaking-audio';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeOptionalUuid = (value) => {
  if (!value) return null;
  const text = String(value);
  return UUID_REGEX.test(text) ? text : null;
};

const parseMaybeJson = (value, fallback = null) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const calculateWeightedWritingBand = calcWeightedWritingOverall;

const requireWritingIdempotencyKey = (value) => {
  const key = String(value || '').trim();
  if (key.length < 16 || key.length > 128 || /\p{Cc}/u.test(key)) {
    throw new AppError('Idempotency-Key phải dài từ 16 đến 128 ký tự.', 400, 'INVALID_IDEMPOTENCY_KEY');
  }
  return key;
};

const buildWritingFingerprint = ({ testId, tasks }) => crypto.createHash('sha256').update(JSON.stringify({
  schema: 'writing-submit-v1',
  test_id: testId || null,
  tasks: tasks.map((task) => ({
    task_number: task.task_number,
    prompt_sha256: crypto.createHash('sha256').update(task.prompt_text || '').digest('hex'),
    response_sha256: crypto.createHash('sha256').update(task.response_text).digest('hex'),
  })),
})).digest('hex');

const loadWritingReplayOutcome = async (writingGroupId) => {
  const tasksResult = await pool.query(
    `SELECT * FROM writing_submissions
     WHERE writing_group_id = $1
     ORDER BY task_number`,
    [writingGroupId]
  );
  const tasks = tasksResult.rows;
  const reportsResult = tasks.length ? await pool.query(
    `SELECT DISTINCT ON (submission_id)
       submission_id, task_number, band_score, status, error_message
     FROM ai_grading_reports
     WHERE submission_type = 'writing' AND submission_id = ANY($1::uuid[])
       AND deleted_at IS NULL
     ORDER BY submission_id, generated_at DESC`,
    [tasks.map((task) => task.id)]
  ) : { rows: [] };
  const reports = new Map(reportsResult.rows.map((row) => [row.submission_id, row]));
  const aiResults = tasks.map((task) => {
    const report = reports.get(task.id);
    return {
      taskNumber: task.task_number,
      status: report?.status || 'pending',
      overallBand: toNumberOrNull(report?.band_score),
      errorMessage: report?.error_message || null,
    };
  });
  const completed = tasks.length === 2 && aiResults.every((item) => item.status === REPORT_STATUS.COMPLETED && item.overallBand !== null);
  const task1 = aiResults.find((item) => Number(item.taskNumber) === 1);
  const task2 = aiResults.find((item) => Number(item.taskNumber) === 2);
  return {
    writing_group_id: writingGroupId,
    aiStatus: completed ? REPORT_STATUS.COMPLETED : (aiResults.some((item) => item.status === REPORT_STATUS.FAILED) ? REPORT_STATUS.FAILED : 'pending'),
    tutorStatus: 'pending',
    overallAiBand: completed ? calculateWeightedWritingBand(task1.overallBand, task2.overallBand) : null,
    tasks,
    aiResults,
    replayed: true,
  };
};

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

const columnExpr = (columns, column, fallback) =>
  (columns.has(column) ? `ws.${column}` : fallback);

const normalizeWritingTasks = (tasks, { enforceAiThreshold = false } = {}) => {
  if (!Array.isArray(tasks) || tasks.length !== 2) {
    throw new AppError('Writing submission requires exactly Task 1 and Task 2', 400, 'INVALID_FIELD');
  }

  const byTaskNumber = new Map();
  for (const task of tasks) {
    const taskNumber = Number(task.task_number ?? task.taskNumber);
    if (![1, 2].includes(taskNumber)) {
      throw new AppError('task_number must be 1 or 2', 400, 'INVALID_FIELD');
    }
    if (byTaskNumber.has(taskNumber)) {
      throw new AppError(`Duplicate Writing Task ${taskNumber}`, 400, 'INVALID_FIELD');
    }

    const responseText = sanitizeWritingText(task.response_text ?? task.studentResponse ?? '');
    if (!responseText) {
      throw new AppError(`Writing Task ${taskNumber} response is required`, 400, 'MISSING_FIELD');
    }

    byTaskNumber.set(taskNumber, {
      task_number: taskNumber,
      prompt_text: task.prompt_text ?? task.prompt ?? '',
      response_text: responseText,
      word_count: countWords(responseText),
    });
  }

  if (!byTaskNumber.has(1) || !byTaskNumber.has(2)) {
    throw new AppError('Writing submission must include both Task 1 and Task 2', 400, 'MISSING_FIELD');
  }

  const normalized = [byTaskNumber.get(1), byTaskNumber.get(2)];
  if (enforceAiThreshold) {
    normalized.forEach((task) => {
      const validated = validateWritingWordThreshold(
        task.response_text,
        task.task_number === 1 ? 'task1' : 'task2'
      );
      task.response_text = validated.text;
      task.word_count = validated.wordCount;
    });
  }
  return normalized;
};

const AI_REPORT_INSERT_ORDER = [
  'submission_id',
  'submission_type',
  'task_number',
  'writing_group_id',
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
  const insertColumns = AI_REPORT_INSERT_ORDER.filter(column =>
    columns.has(column)
    && Object.prototype.hasOwnProperty.call(valuesByColumn, column)
  );

  if (!columns.has('submission_id') || !columns.has('submission_type')) {
    throw new AppError('AI grading reports table is not ready. Please run database migrations.', 500, 'AIGRADE_010');
  }

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

const buildAiFeedbackJson = (result) => ({
  summary: result.summary || '',
  strengths: result.strengths || [],
  weaknesses: result.weaknesses || [],
  majorErrors: result.majorErrors || [],
  detailedFeedback: result.detailedFeedback || {},
  vocabularySuggestions: result.vocabularySuggestions || [],
  grammarCorrections: result.grammarCorrections || [],
  actionPlan: result.actionPlan || [],
  nextStudyAdvice: result.nextStudyAdvice || '',
  wordCountFeedback: result.wordCountFeedback || null,
  disclaimer: result.disclaimer || 'AI score is an estimated IELTS band.',
});

const buildCriterionScores = (report, parsedCriteria = null) => {
  if (report?.submission_type === 'speaking') {
    const fallback = {
      fluencyCoherence: toNumberOrNull(report.fluency_score),
      lexicalResource: toNumberOrNull(report.lexical_score),
      grammaticalRangeAccuracy: toNumberOrNull(report.grammar_score),
      pronunciation: toNumberOrNull(report.pronunciation_score),
    };
    if (!parsedCriteria) return fallback;
    return {
      ...fallback,
      ...parsedCriteria,
    };
  }

  const fallback = {
    taskAchievementOrResponse: toNumberOrNull(report.task_achievement_score),
    coherenceCohesion: toNumberOrNull(report.coherence_score),
    lexicalResource: toNumberOrNull(report.lexical_score),
    grammarRangeAccuracy: toNumberOrNull(report.grammar_score),
  };
  if (!parsedCriteria) return fallback;
  return {
    ...fallback,
    ...parsedCriteria,
  };
};

const buildDetailedFeedback = (feedback, criteria) => {
  if (feedback.detailedFeedback && Object.keys(feedback.detailedFeedback).length > 0) {
    return feedback.detailedFeedback;
  }
  if (criteria?.fluencyCoherence !== undefined || criteria?.pronunciation !== undefined) {
    return {
      fluencyCoherence: criteria?.fluencyCoherence?.feedback || '',
      lexicalResource: criteria?.lexicalResource?.feedback || '',
      grammaticalRangeAccuracy: criteria?.grammaticalRangeAccuracy?.feedback || '',
      pronunciation: criteria?.pronunciation?.feedback || '',
    };
  }
  return {
    taskAchievementOrResponse: criteria?.taskAchievementOrResponse?.feedback || '',
    coherenceCohesion: criteria?.coherenceCohesion?.feedback || '',
    lexicalResource: criteria?.lexicalResource?.feedback || '',
    grammarRangeAccuracy: criteria?.grammarRangeAccuracy?.feedback
      || criteria?.grammaticalRangeAccuracy?.feedback
      || '',
  };
};

const getAiReportStatus = (report) => {
  if (report.status) return report.status;
  if (report.error_message) return REPORT_STATUS.FAILED;
  const rawAiResponse = parseMaybeJson(report.raw_ai_response, {});
  const hasBand = [
    report.band_score,
    rawAiResponse.overallBand,
    rawAiResponse.bandScore,
    rawAiResponse.aiBand,
  ].some(value => toNumberOrNull(value) !== null);
  return hasBand ? REPORT_STATUS.COMPLETED : 'pending';
};

const saveCompletedAiReport = async (task, result) => {
  const c = result.criteria;
  const feedbackJson = buildAiFeedbackJson(result);
  const suggestions = [
    result.summary,
    ...(Array.isArray(result.actionPlan) ? result.actionPlan : []),
    result.nextStudyAdvice,
  ].filter(Boolean).join('\n\n');

  return insertAiReport(pool, {
    submission_id: task.id,
    submission_type: 'writing',
    task_number: task.task_number,
    writing_group_id: task.writing_group_id,
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
};

const safeAiFailureMessage = (error) => sanitizeDiagnostic(error?.message, 500)
  || 'Chấm AI tạm thời thất bại.';

const saveFailedAiReport = async (task, error) => {
  const message = safeAiFailureMessage(error);
  return insertAiReport(pool, {
    submission_id: task.id,
    submission_type: 'writing',
    task_number: task.task_number,
    writing_group_id: task.writing_group_id,
    status: REPORT_STATUS.FAILED,
    error_message: message,
    raw_ai_response: JSON.stringify({
      errorCode: error.errorCode || error.code || 'AI_GRADING_FAILED',
      message,
    }),
  });
};

const mapAiReport = (report) => {
  if (!report) return null;
  const rawAiResponse = parseMaybeJson(report.raw_ai_response, {});
  const feedback = parseMaybeJson(report.feedback_json, null) || rawAiResponse.feedback || rawAiResponse || {};
  const parsedCriteriaPayload = parseMaybeJson(report.criteria_json, null)
    || rawAiResponse.criteria
    || rawAiResponse.criterionScores
    || null;
  const parsedCriteria = parsedCriteriaPayload?.criteria || parsedCriteriaPayload;
  const criterionScores = buildCriterionScores(report, parsedCriteria);
  return {
    id: report.id,
    status: getAiReportStatus(report),
    errorMessage: report.error_message || null,
    overallBand: toNumberOrNull(report.band_score)
      ?? toNumberOrNull(rawAiResponse.overallBand)
      ?? toNumberOrNull(rawAiResponse.bandScore)
      ?? toNumberOrNull(rawAiResponse.aiBand),
    computedBand: toNumberOrNull(report.computed_band)
      ?? toNumberOrNull(rawAiResponse.computedBand),
    criterionScores,
    summary: feedback.summary || report.suggestions || '',
    strengths: Array.isArray(feedback.strengths) ? feedback.strengths : [],
    weaknesses: Array.isArray(feedback.weaknesses) ? feedback.weaknesses : [],
    majorErrors: Array.isArray(feedback.majorErrors)
      ? feedback.majorErrors
      : parseMaybeJson(report.error_highlights, []),
    detailedFeedback: buildDetailedFeedback(feedback, criterionScores),
    improvedVersion: report.improved_version || feedback.improvedVersion || '',
    vocabularySuggestions: Array.isArray(feedback.vocabularySuggestions)
      ? feedback.vocabularySuggestions : [],
    grammarCorrections: Array.isArray(feedback.grammarCorrections)
      ? feedback.grammarCorrections : [],
    actionPlan: Array.isArray(feedback.actionPlan)
      ? feedback.actionPlan
      : (feedback.nextStudyAdvice ? [feedback.nextStudyAdvice] : []),
    nextStudyAdvice: feedback.nextStudyAdvice || '',
    wordCountFeedback: feedback.wordCountFeedback || null,
    transcriptNotes: feedback.transcriptNotes || '',
    partFeedback: Array.isArray(feedback.partFeedback) ? feedback.partFeedback : [],
    bandWarning: report.band_validation_warning || null,
    rawAiResponse: parseMaybeJson(report.raw_ai_response, null),
    generatedAt: report.generated_at,
    taskNumber: report.task_number,
    partNumber: report.part_number,
    submissionType: report.submission_type,
  };
};

const mapTutorGrade = (report) => {
  if (!report) return null;
  
  if (report.speaking_submission_id != null || report.fluency_score != null || report.pronunciation_score != null) {
    const fluency = report.fluency_score ? parseFloat(report.fluency_score) : null;
    const lexical = report.lexical_score ? parseFloat(report.lexical_score) : null;
    const grammar = report.grammar_score ? parseFloat(report.grammar_score) : null;
    const pronunciation = report.pronunciation_score ? parseFloat(report.pronunciation_score) : null;
    return {
      id: report.id,
      overallBand: report.band_score ? parseFloat(report.band_score) : null,
      criterionScores: {
        fluencyCoherence: fluency,
        lexicalResource: lexical,
        grammaticalRangeAccuracy: grammar,
        pronunciation,
      },
      scores: {
        fluency,
        lexical,
        grammar,
        pronunciation,
      },
      writtenFeedback: report.written_feedback || '',
      createdAt: report.created_at,
      updatedAt: report.updated_at,
    };
  }

  return {
    id: report.id,
    overallBand: report.band_score ? parseFloat(report.band_score) : null,
    criterionScores: {
      taskAchievementOrResponse: report.task_achievement_score
        ? parseFloat(report.task_achievement_score) : null,
      coherenceCohesion: report.coherence_score ? parseFloat(report.coherence_score) : null,
      lexicalResource: report.lexical_score ? parseFloat(report.lexical_score) : null,
      grammaticalRangeAccuracy: report.grammar_score ? parseFloat(report.grammar_score) : null,
    },
    writtenFeedback: report.written_feedback || '',
    createdAt: report.created_at,
    updatedAt: report.updated_at,
  };
};

const roundToNearestHalf = (value) => Math.round(Number(value) * 2) / 2;

const averageReportField = (reports, field) => {
  const values = reports
    .map(report => toNumberOrNull(report[field]))
    .filter(value => value !== null);
  if (values.length === 0) return null;
  return roundToNearestHalf(values.reduce((sum, value) => sum + value, 0) / values.length);
};

const buildSpeakingAggregateReport = (reports, parts) => {
  const completedReports = reports.filter(report =>
    report && report.status !== REPORT_STATUS.FAILED && report.band_score !== null
  );
  if (completedReports.length === 0) return null;

  const fluency = averageReportField(completedReports, 'fluency_score');
  const lexical = averageReportField(completedReports, 'lexical_score');
  const grammar = averageReportField(completedReports, 'grammar_score');
  const pronunciation = averageReportField(completedReports, 'pronunciation_score');
  const criteriaValues = [fluency, lexical, grammar, pronunciation].filter(value => value !== null);
  const overall = criteriaValues.length === 4
    ? roundToNearestHalf(criteriaValues.reduce((sum, value) => sum + value, 0) / 4)
    : averageReportField(completedReports, 'band_score');
  const mappedReports = completedReports.map(mapAiReport);

  return {
    ...completedReports[0],
    id: completedReports[0].id,
    submission_id: parts[0]?.id,
    submission_type: 'speaking',
    speaking_group_id: parts[0]?.speaking_group_id,
    part_number: null,
    band_score: overall,
    computed_band: overall,
    fluency_score: fluency,
    lexical_score: lexical,
    grammar_score: grammar,
    pronunciation_score: pronunciation,
    suggestions: mappedReports.map(report => report?.summary).filter(Boolean).join('\n\n'),
    criteria_json: JSON.stringify({
      fluencyCoherence: {
        band: fluency,
        feedback: mappedReports.map(report => report?.detailedFeedback?.fluencyCoherence).filter(Boolean).join('\n\n'),
      },
      lexicalResource: {
        band: lexical,
        feedback: mappedReports.map(report => report?.detailedFeedback?.lexicalResource).filter(Boolean).join('\n\n'),
      },
      grammaticalRangeAccuracy: {
        band: grammar,
        feedback: mappedReports.map(report => report?.detailedFeedback?.grammaticalRangeAccuracy).filter(Boolean).join('\n\n'),
      },
      pronunciation: {
        band: pronunciation,
        feedback: mappedReports.map(report => report?.detailedFeedback?.pronunciation).filter(Boolean).join('\n\n'),
      },
    }),
    feedback_json: JSON.stringify({
      summary: mappedReports.map(report => report?.summary).filter(Boolean).join('\n\n'),
      strengths: mappedReports.flatMap(report => report?.strengths || []),
      weaknesses: mappedReports.flatMap(report => report?.weaknesses || []),
      majorErrors: mappedReports.flatMap(report => report?.majorErrors || []),
      detailedFeedback: {},
      actionPlan: mappedReports.flatMap(report => report?.actionPlan || []),
      nextStudyAdvice: mappedReports.map(report => report?.nextStudyAdvice).filter(Boolean).join('\n\n'),
      transcriptNotes: 'Aggregated from earlier per-part AI reports.',
      partFeedback: mappedReports.map((report, index) => ({
        partNumber: parts[index]?.part_number || report?.partNumber || index + 1,
        summary: report?.summary || '',
        strengths: report?.strengths || [],
        weaknesses: report?.weaknesses || [],
      })),
    }),
  };
};

const insertWritingTask = async (client, columns, valuesByColumn) => {
  if (!columns.has('writing_group_id')) {
    throw new AppError(
      'Writing grouped submission requires database migration 017_add_writing_group_id.sql',
      500,
      'WRITING_SCHEMA_NOT_READY'
    );
  }

  const insertOrder = [
    'user_id',
    'test_id',
    'task_number',
    'prompt_text',
    'response_text',
    'word_count',
    'grader',
    'status',
    'writing_group_id',
    'ai_status',
    'tutor_status',
    'submitted_at',
    'created_at',
    'updated_at',
  ];
  const timestampColumns = new Set(['submitted_at', 'created_at', 'updated_at']);
  const insertColumns = insertOrder.filter(column =>
    columns.has(column)
    && (timestampColumns.has(column) || Object.prototype.hasOwnProperty.call(valuesByColumn, column))
  );
  const values = [];
  const placeholders = insertColumns.map((column) => {
    if (timestampColumns.has(column)) return 'NOW()';
    values.push(valuesByColumn[column]);
    return `$${values.length}`;
  });

  const { rows } = await client.query(
    `INSERT INTO writing_submissions (${insertColumns.join(', ')})
     VALUES (${placeholders.join(', ')})
     RETURNING *`,
    values
  );
  return rows[0];
};

const mapSpeakingDbError = (err) => {
  if (err.code === '42P01') {
    return new AppError(
      'Speaking tables are missing. Run backend migrations, then restart the server.',
      500,
      'SPEAKING_SCHEMA_MISSING'
    );
  }
  if (err.code === '23503') {
    return new AppError('Referenced speaking test or user was not found', 400, 'SPEAKING_REFERENCE_INVALID');
  }
  return err;
};

const toPublicSpeakingAudioUrl = (audioUrlOrPath) => {
  if (!audioUrlOrPath) return null;
  if (/^https?:\/\//i.test(audioUrlOrPath)) return audioUrlOrPath;

  const storagePath = String(audioUrlOrPath).replace(/^\/+/, '');
  const { data: publicUrlData } = supabase
    .storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl(storagePath);

  return publicUrlData?.publicUrl || storagePath;
};

class SubmissionService {
  static async submitObjectiveTest(userId, testId, answers, timeSpentSeconds = 0) {
    const test = await TestService.getTestById(testId);
    if (!test) {
      throw new AppError('Test not found', 404, 'TEST_NOT_FOUND');
    }
    if (test.skill !== 'listening' && test.skill !== 'reading') {
      throw new AppError('This endpoint only supports listening and reading tests', 400, 'INVALID_TEST_SKILL');
    }

    const allQuestions = [];
    if (test.passages) {
      test.passages.forEach(p => {
        (p.blocks || []).forEach(b => {
          (b.questions || []).forEach(q => { allQuestions.push(q); });
        });
      });
    }

    let rawScore = 0;
    const gradedAnswers = allQuestions.map(q => {
      const qOrder = String(q.questionOrder);
      const studentAnswer = answers[qOrder] || '';
      let isCorrect = false;

      if (q.correctAnswers && Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0) {
        const correctOptMatch = q.correctAnswers.some(ansId => {
          if (q.options && Array.isArray(q.options)) {
            const optIdx = q.options.findIndex(o => String(o.id) === String(ansId) || (o.label && String(o.label) === String(ansId)));
            if (optIdx !== -1) {
              const opt = q.options[optIdx];
              const autoLabel = String.fromCharCode(65 + optIdx);
              const studentAnsLower = studentAnswer.trim().toLowerCase();
              return (
                (opt.label && String(opt.label).toLowerCase() === studentAnsLower) ||
                (opt.text && String(opt.text).trim().toLowerCase() === studentAnsLower) ||
                autoLabel.toLowerCase() === studentAnsLower
              );
            }
          }
          return false;
        });
        if (correctOptMatch) isCorrect = true;
      } else if (q.correctAnswer) {
        const studentAnsLower = studentAnswer.trim().toLowerCase();
        const correctAnsLower = q.correctAnswer.trim().toLowerCase();
        if (studentAnsLower === correctAnsLower) {
          isCorrect = true;
        } else if (q.options && Array.isArray(q.options)) {
          const optIdx = q.options.findIndex(o => String(o.id) === String(q.correctAnswer) || (o.label && String(o.label) === String(q.correctAnswer)));
          if (optIdx !== -1) {
            const autoLabel = String.fromCharCode(65 + optIdx).toLowerCase();
            const opt = q.options[optIdx];
            if (
              studentAnsLower === autoLabel ||
              (opt.label && String(opt.label).toLowerCase() === studentAnsLower) ||
              (opt.text && String(opt.text).trim().toLowerCase() === studentAnsLower)
            ) {
              isCorrect = true;
            }
          }
        }
      }

      if (isCorrect) rawScore++;
      return { questionId: q.id, questionOrder: q.questionOrder, givenAnswer: studentAnswer, isCorrect };
    });

    const totalQuestions = allQuestions.length || 40;
    const normalizedRawScore = Math.min(rawScore, 40);
    const scaledRawScore = totalQuestions > 0 ? Math.round((normalizedRawScore / totalQuestions) * 40) : 0;
    const bandScore = getBandScore(test.skill, scaledRawScore);

    const client = await pool.connect();
    let attemptId;
    try {
      await client.query('BEGIN');
      const attemptRes = await client.query(
        `INSERT INTO test_attempts (user_id, test_id, mode, submitted_at, band_score, time_spent)
         VALUES ($1, $2, 'timed', NOW(), $3, $4) RETURNING id`,
        [userId, testId, bandScore, Math.max(0, Number(timeSpentSeconds) || 0)]
      );
      attemptId = attemptRes.rows[0].id;
      for (const ga of gradedAnswers) {
        await client.query(
          `INSERT INTO question_answers (attempt_id, question_id, given_answer, is_correct) VALUES ($1, $2, $3, $4)`,
          [attemptId, ga.questionId, ga.givenAnswer, ga.isCorrect]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return { attemptId, bandScore, rawScore: normalizedRawScore, totalQuestions };
  }

  static async getSubmissionResult(attemptId, userId) {
    const attemptRes = await pool.query(
      `SELECT ta.*, mt.title as test_title, mt.skill
       FROM test_attempts ta
       JOIN mock_tests mt ON mt.id = ta.test_id
       WHERE ta.id = $1 AND ta.user_id = $2`,
      [attemptId, userId]
    );
    if (attemptRes.rows.length === 0) return null;
    const attempt = attemptRes.rows[0];

    const answersRes = await pool.query(
      `SELECT qa.given_answer, qa.is_correct, q.question_order, q.question_text,
              q.correct_answer, q.correct_answers, q.explanation, q.options
       FROM question_answers qa
       JOIN questions q ON q.id = qa.question_id
       WHERE qa.attempt_id = $1
       ORDER BY q.question_order ASC`,
      [attemptId]
    );

    let rawScore = 0;
    const mappedAnswers = answersRes.rows.map(row => {
      if (row.is_correct) rawScore++;
      let displayCorrectAnswer = row.correct_answer;
      if (row.correct_answers && Array.isArray(row.correct_answers) && row.correct_answers.length > 0) {
        if (Array.isArray(row.options)) {
          const mapped = row.correct_answers.map(ansId => {
            const optIdx = row.options.findIndex(o => String(o.id) === String(ansId) || (o.label && String(o.label) === String(ansId)));
            if (optIdx !== -1) return String.fromCharCode(65 + optIdx);
            return ansId;
          });
          displayCorrectAnswer = mapped.join(', ');
        } else {
          displayCorrectAnswer = row.correct_answers.join(', ');
        }
      } else if (row.correct_answer) {
        if (Array.isArray(row.options)) {
          const optIdx = row.options.findIndex(o => String(o.id) === String(row.correct_answer) || (o.label && String(o.label) === String(row.correct_answer)));
          if (optIdx !== -1) {
            displayCorrectAnswer = String.fromCharCode(65 + optIdx);
          }
        }
      }
      return {
        order: row.question_order,
        text: row.question_text,
        yourAnswer: row.given_answer,
        correctAnswer: displayCorrectAnswer,
        isCorrect: row.is_correct,
        explanation: row.explanation
      };
    });

    const totalQuestions = mappedAnswers.length;
    const submittedAt = new Date(attempt.submitted_at);
    const createdAt = new Date(attempt.created_at);
    const timeSpentMs = submittedAt.getTime() - createdAt.getTime();
    const timeSpentMins = Math.floor(timeSpentMs / 60000);
    const timeSpentSecs = Math.floor((timeSpentMs % 60000) / 1000);

    return {
      testTitle: attempt.test_title,
      skill: attempt.skill,
      bandScore: parseFloat(attempt.band_score),
      rawScore,
      totalQuestions,
      timeSpent: `${timeSpentMins.toString().padStart(2, '0')}:${timeSpentSecs.toString().padStart(2, '0')}`,
      submittedAt: attempt.submitted_at,
      correctCount: rawScore,
      incorrectCount: totalQuestions - rawScore,
      answers: mappedAnswers
    };
  }

  /**
   * Submit full speaking test.
   * Receives an array of parts and saves them within one transaction, generating a group UUID.
   */
  static async submitFullSpeaking(userId, testId, grader, parts) {
    if (!['ai', 'tutor'].includes(grader)) {
      throw new AppError('grader phải là ai hoặc tutor.', 400, 'INVALID_FIELD');
    }
    if (grader === 'ai') {
      throw new AppError(
        'AI Speaking grading chỉ hỗ trợ luồng bất đồng bộ có private upload.',
        409,
        'AI_SPEAKING_ASYNC_REQUIRED'
      );
    }
    const normalizedTestId = normalizeOptionalUuid(testId);
    if (testId && !normalizedTestId) {
      throw new AppError('test_id không hợp lệ.', 400, 'INVALID_TEST_ID');
    }
    if (normalizedTestId) {
      try {
        const testRes = await pool.query('SELECT id FROM mock_tests WHERE id = $1', [normalizedTestId]);
        if (testRes.rows.length === 0) {
          throw new AppError('Không tìm thấy bài thi Speaking.', 404, 'TEST_NOT_FOUND');
        }
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError('test_id không hợp lệ.', 400, 'INVALID_TEST_ID');
      }
    }

    const { randomUUID } = require('crypto');
    const speakingGroupId = randomUUID();
    const insertedParts = [];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const part of parts) {
        // Validate the uploaded Supabase object belongs to this user.
        const storagePath = String(part.temp_s3_key || '').replace(/^\/+/, '');
        const expectedPrefix = `speaking/${userId}/`;
        if (!storagePath.startsWith(expectedPrefix) || storagePath.includes('..')) {
          throw new AppError('Invalid speaking audio path', 400, 'INVALID_AUDIO_PATH');
        }
        const audioUrl = toPublicSpeakingAudioUrl(storagePath);
        
        const insertRes = await client.query(
          `INSERT INTO speaking_submissions (user_id, test_id, part_number, prompt_text, audio_url, grader, status, speaking_group_id)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7) RETURNING *`,
          [userId, normalizedTestId, part.part_number, part.prompt_text, audioUrl, grader, speakingGroupId]
        );
        insertedParts.push(insertRes.rows[0]);
      }

      await client.query('COMMIT');
      return {
        speaking_group_id: speakingGroupId,
        aiStatus: 'pending',
        overallAiBand: null,
        parts: insertedParts,
        aiReports: [],
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw mapSpeakingDbError(err);

    } finally {
      client.release();
    }
  }

  static async submitWriting() {
    throw new AppError(
      'Writing submission must include both Task 1 and Task 2. Use /submissions/writing/full.',
      400,
      'WRITING_FULL_SUBMISSION_REQUIRED'
    );
  }

  static async processWritingTasksAsync(userId, writingGroupId, testTitle, persistedTasks, writingJob, io) {
  try {
    const aiResults = [];
    for (const task of persistedTasks) {
      try {
        const result = await gradeWriting(
          task,
          task.task_number === 1 ? 'task1' : 'task2',
          {
            testTitle: task.test_title || testTitle,
            usageContext: {
              userId,
              feature: 'writing_grading',
              entityType: 'writing_submission',
              entityId: task.id,
            },
          }
        );
        await saveCompletedAiReport(task, result);
        aiResults.push({
          taskNumber: task.task_number,
          status: REPORT_STATUS.COMPLETED,
          overallBand: result.overallBand,
        });
      } catch (err) {
        logger.warn('Writing AI grading failed during full submission', {
          writingGroupId,
          taskId: task.id,
          taskNumber: task.task_number,
          errorCode: err.errorCode || err.code || 'AI_GRADING_FAILED',
        });
        try {
          await saveFailedAiReport(task, err);
        } catch (saveErr) {
          logger.error('Failed to persist Writing AI failure report', {
            writingGroupId,
            taskId: task.id,
            errorCode: saveErr.errorCode || saveErr.code || 'AI_REPORT_SAVE_FAILED',
          });
        }
        aiResults.push({
          taskNumber: task.task_number,
          status: REPORT_STATUS.FAILED,
          errorMessage: safeAiFailureMessage(err),
        });
      }
    }

    const task1Ai = aiResults.find(result => result.taskNumber === 1);
    const task2Ai = aiResults.find(result => result.taskNumber === 2);
    const aiStatus = aiResults.every(result => result.status === REPORT_STATUS.COMPLETED)
      ? REPORT_STATUS.COMPLETED
      : REPORT_STATUS.FAILED;
    const overallAiBand = aiStatus === REPORT_STATUS.COMPLETED
      ? calculateWeightedWritingBand(task1Ai.overallBand, task2Ai.overallBand)
      : null;

    const finalStatus = aiStatus === REPORT_STATUS.COMPLETED ? 'ai_graded' : 'pending';

    const writingColumns = await getTableColumns(pool, 'writing_submissions');
    const updateValues = [];
    const setClauses = [];
    if (writingColumns.has('ai_status')) {
      updateValues.push(aiStatus);
      setClauses.push(`ai_status = $${updateValues.length}`);
    }
    if (writingColumns.has('overall_ai_band')) {
      updateValues.push(overallAiBand);
      setClauses.push(`overall_ai_band = $${updateValues.length}`);
    }
    updateValues.push(finalStatus);
    setClauses.push(`status = $${updateValues.length}`);
    if (writingColumns.has('updated_at')) {
      setClauses.push('updated_at = NOW()');
    }
    updateValues.push(writingGroupId);
    await pool.query(
      `UPDATE writing_submissions
       SET ${setClauses.join(', ')}
       WHERE writing_group_id = $${updateValues.length}`,
      updateValues
    );

    if (writingJob) {
      await pool.query(
        `UPDATE ai_grading_jobs
         SET status = $2, stage = 'finalizing', attempt_count = GREATEST(attempt_count, 1),
             finished_at = NOW(), last_error_code = $3,
             last_error_message = $4, last_error_retryable = FALSE,
             lease_owner = NULL, lease_expires_at = NULL
         WHERE id = $1 AND submission_type = 'writing' AND status NOT IN ('completed','needs_review','failed')`,
        [writingJob.id, aiStatus === REPORT_STATUS.COMPLETED ? 'completed' : 'failed',
          aiStatus === REPORT_STATUS.COMPLETED ? null : 'WRITING_GRADING_FAILED',
          aiStatus === REPORT_STATUS.COMPLETED ? null : 'Một hoặc nhiều Writing task chấm thất bại.']
      );
    }

    if (io) {
      if (aiStatus === REPORT_STATUS.COMPLETED) {
        io.to(userId).emit('grading_complete', {
          submissionId: writingGroupId,
          studentId: userId,
          grader: 'ai',
          status: 'ai_graded',
          overallBand: overallAiBand,
          completedAt: new Date().toISOString(),
        });
      } else {
        io.to(userId).emit('grading_failed', {
          submissionId: writingGroupId,
          studentId: userId,
          grader: 'ai',
          status: 'pending',
          errorCode: 'WRITING_GRADING_FAILED',
        });
      }
    }
  } catch (error) {
    logger.error('processWritingTasksAsync failed entirely', { writingGroupId, error: error.message });
  }
  }

  static async submitFullWriting(userId, testId, grader, tasks, { idempotencyKey, io } = {}) {
    if (!['ai', 'tutor'].includes(grader)) {
      throw new AppError('grader phải là ai hoặc tutor.', 400, 'INVALID_FIELD');
    }
    const normalizedTasks = normalizeWritingTasks(tasks, { enforceAiThreshold: grader === 'ai' });
    const normalizedTestId = normalizeOptionalUuid(testId);
    if (testId && !normalizedTestId) {
      throw new AppError('test_id không hợp lệ.', 400, 'INVALID_TEST_ID');
    }
    let testTitle = null;
    if (normalizedTestId) {
      try {
        const testRes = await pool.query('SELECT id, title FROM mock_tests WHERE id = $1', [normalizedTestId]);
        if (testRes.rows.length === 0) {
          throw new AppError('Không tìm thấy bài thi Writing.', 404, 'TEST_NOT_FOUND');
        }
        testTitle = testRes.rows[0].title;
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError('test_id không hợp lệ.', 400, 'INVALID_TEST_ID');
      }
    }

    const { randomUUID } = require('node:crypto');
    const writingGroupId = randomUUID();
    const writingFingerprint = grader === 'ai'
      ? buildWritingFingerprint({ testId: normalizedTestId, tasks: normalizedTasks })
      : null;
    const key = grader === 'ai' ? requireWritingIdempotencyKey(idempotencyKey) : null;
    if (grader === 'ai') {
      const fastReplay = await aiJobQueries.lookupJobByIdempotency(pool, userId, key);
      if (fastReplay) {
        if (new Date(fastReplay.idempotency_expires_at).getTime() <= Date.now()) {
          throw new AppError('Cửa sổ phát lại đã hết hạn.', 410, 'IDEMPOTENCY_WINDOW_EXPIRED');
        }
        if (fastReplay.input_fingerprint !== writingFingerprint || fastReplay.submission_type !== 'writing') {
          throw new AppError('Idempotency-Key đã dùng cho yêu cầu khác.', 409, 'IDEMPOTENCY_KEY_REUSED');
        }
        return loadWritingReplayOutcome(fastReplay.group_id);
      }
    }
    const client = await pool.connect();
    let writingJob = null;

    try {
      await client.query('BEGIN');
      if (grader === 'ai') {
        const reservation = await reserveOriginalWithQuota({
          client,
          userId,
          idempotencyKey: key,
          fingerprint: writingFingerprint,
          dailyLimit: aiGradingConfig.dailyQuota,
          date: utcDate(),
          lookupIdempotency: aiJobQueries.lookupJobByIdempotency,
          lookupFingerprint: (db, owner, digest) => aiJobQueries.lookupOriginalByFingerprint(db, owner, 'writing', digest),
          countOriginalUsage: aiJobQueries.countOriginalUsage,
          reserveOriginal: (db) => aiJobQueries.insertRootJob(db, {
            submissionType: 'writing',
            groupId: writingGroupId,
            userId,
            idempotencyKey: key,
            idempotencyExpiresAt: new Date(Date.now() + aiGradingConfig.idempotencyTtlSeconds * 1000).toISOString(),
            inputFingerprint: writingFingerprint,
            pipelineVersion: aiGradingConfig.writingPipelineVersion,
            scoringConfigSha256: aiGradingConfig.writingScoringConfigSha256,
            calibrationBundleSha256: null,
          }),
        });
        if (reservation.kind === 'duplicate') {
          throw new AppError('Bài Writing này đã được gửi chấm bằng khóa khác.', 409, 'DUPLICATE_GRADING_REQUEST');
        }
        if (reservation.kind === 'replay') {
          await client.query('COMMIT');
          return loadWritingReplayOutcome(reservation.value.group_id);
        }
        writingJob = reservation.value;
      }
      const writingColumns = await getTableColumns(client, 'writing_submissions');
      
      for (const task of normalizedTasks) {
        await insertWritingTask(client, writingColumns, {
          user_id: userId,
          test_id: normalizedTestId,
          task_number: task.task_number,
          prompt_text: task.prompt_text,
          response_text: task.response_text,
          word_count: task.word_count,
          grader,
          status: 'pending',
          writing_group_id: writingGroupId,
          ai_status: 'pending',
          tutor_status: 'pending',
        });
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      if (err instanceof AppError) throw err;
      logger.error('Writing submission insert failed', {
        code: err.code,
        constraint: err.constraint,
        column: err.column,
        table: err.table,
      });
      throw new AppError('Lỗi cơ sở dữ liệu khi nộp bài Writing.', 500, 'DB_ERROR');
    } finally {
      client.release();
    }

    const persistedTasksRes = await pool.query(
      `SELECT ws.*, mt.title AS test_title
       FROM writing_submissions ws
       LEFT JOIN mock_tests mt ON mt.id = ws.test_id
       WHERE ws.writing_group_id = $1
       ORDER BY ws.task_number ASC`,
      [writingGroupId]
    );
    const persistedTasks = persistedTasksRes.rows;

    if (grader === 'ai') {
      SubmissionService.processWritingTasksAsync(
        userId, writingGroupId, testTitle, persistedTasks, writingJob, io
      ).catch(err => {
        logger.error('Background async writing grading error', { error: err.message, writingGroupId });
      });
    }

    return {
      writing_group_id: writingGroupId,
      aiStatus: grader === 'ai' ? 'pending' : 'pending',
      tutorStatus: 'pending',
      overallAiBand: null,
      tasks: persistedTasks,
      aiResults: [],
      replayed: false,
    };
  }

  static async getSpeakingAudioUrl(submissionId, user) {
    if (!['student', 'tutor', 'admin'].includes(user.role)) {
      throw new AppError('Bạn không có quyền truy cập audio này.', 403, 'AUTH_PERM_001');
    }
    const normalizedSubmissionId = normalizeOptionalUuid(submissionId);
    if (!normalizedSubmissionId) throw new AppError('submissionId không hợp lệ.', 400, 'INVALID_FIELD');
    const result = await pool.query(
      `SELECT part.id, part.user_id, part.audio_storage_key, part.audio_url,
              CASE WHEN $2::uuid IS NULL THEN FALSE ELSE (
                SELECT COUNT(*) = 3 AND BOOL_AND(group_part.assigned_tutor_id = $2::uuid)
                FROM speaking_submissions group_part
                WHERE group_part.speaking_group_id = part.speaking_group_id
                  AND group_part.deleted_at IS NULL
              ) END AS assigned_tutor_scope
       FROM speaking_submissions part
       WHERE part.id = $1 AND part.deleted_at IS NULL`,
      [normalizedSubmissionId, user.role === 'tutor' ? user.id : null]);
    if (result.rows.length === 0) {
      throw new AppError('Không tìm thấy audio của bài Speaking.', 404, 'AUDIO_NOT_FOUND');
    }
    const part = result.rows[0];
    const allowed = user.role === 'admin'
      || (user.role === 'student' && part.user_id === user.id)
      || (user.role === 'tutor' && part.assigned_tutor_scope === true);
    if (!allowed) throw new AppError('Bạn không có quyền truy cập audio này.', 403, 'AUTH_PERM_001');

    if (part.audio_storage_key) {
      const { aiGradingConfig } = require('../config/aiGrading.config');
      const { createObjectStorageAdapter } = require('../storage/objectStorage.adapter');
      const storage = createObjectStorageAdapter(aiGradingConfig.storage);
      const signed = await storage.createSignedDownload({
        key: part.audio_storage_key,
        expiresInSeconds: aiGradingConfig.storage.signedDownloadTtlSeconds,
      });
      if (!signed) throw new AppError('Bài Speaking không có audio.', 404, 'AUDIO_NOT_FOUND');
      return { url: signed.url, expires_at: signed.expiresAt };
    }
    const { aiGradingConfig } = require('../config/aiGrading.config');
    if (aiGradingConfig.enabled) {
      throw new AppError(
        'Audio legacy phải được chuyển sang private storage trước khi truy cập.',
        409,
        'LEGACY_AUDIO_REQUIRES_PRIVATE_MIGRATION'
      );
    }
    const legacyUrl = toPublicSpeakingAudioUrl(part.audio_url);
    if (!legacyUrl) {
      throw new AppError('Bài Speaking không có audio.', 404, 'AUDIO_NOT_FOUND');
    }
    return { url: legacyUrl, expires_at: null, legacy_public_url: true };
  }



  /**
   * Get student submission history
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  static async getHistory(userId) {
    const [
      writingColumns,
      aiColumns,
      tutorFeedbackColumns,
    ] = await Promise.all([
      getTableColumns(pool, 'writing_submissions'),
      getTableColumns(pool, 'ai_grading_reports'),
      getTableColumns(pool, 'tutor_feedback_reports'),
    ]);

    const writingGroupExpr = columnExpr(writingColumns, 'writing_group_id', 'ws.id');
    const aiJoin = aiColumns.has('submission_id') && aiColumns.has('submission_type')
      ? `LEFT JOIN ai_grading_reports agr
           ON ws.id = agr.submission_id AND agr.submission_type = 'writing'
          ${aiColumns.has('deleted_at') ? 'AND agr.deleted_at IS NULL' : ''}`
      : '';
    const speakingAiJoin = aiColumns.has('submission_id') && aiColumns.has('submission_type')
      ? `LEFT JOIN ai_grading_reports agr
           ON ss.id = agr.submission_id AND agr.submission_type = 'speaking'
          ${aiColumns.has('deleted_at') ? 'AND agr.deleted_at IS NULL' : ''}`
      : '';
    const tutorJoin = tutorFeedbackColumns.has('writing_submission_id')
      ? 'LEFT JOIN tutor_feedback_reports tfr ON ws.id = tfr.writing_submission_id AND tfr.deleted_at IS NULL'
      : '';
    const speakingTutorJoin = tutorFeedbackColumns.has('speaking_submission_id')
      ? 'LEFT JOIN tutor_feedback_reports tfr ON ss.id = tfr.speaking_submission_id AND tfr.deleted_at IS NULL'
      : '';

    const aiFailedExpr = writingColumns.has('ai_status')
      ? "BOOL_OR(ws.ai_status = 'failed')"
      : "BOOL_OR(ws.status = 'pending' AND ws.grader = 'ai')";
    const aiCompletedExpr = writingColumns.has('ai_status')
      ? "BOOL_AND(ws.ai_status = 'completed')"
      : "BOOL_AND(ws.status = 'ai_graded')";
    const tutorGradedExpr = writingColumns.has('tutor_status')
      ? "BOOL_AND(ws.tutor_status = 'graded')"
      : "BOOL_AND(ws.status IN ('tutor_graded', 'reviewed'))";
    const speakingAiFailedExpr = speakingAiJoin && aiColumns.has('error_message')
      ? "BOOL_OR(ss.grader = 'ai' AND agr.error_message IS NOT NULL)"
      : 'FALSE';
    const speakingAiCompletedExpr = speakingAiJoin && aiColumns.has('band_score')
      ? `BOOL_OR(ss.grader = 'ai'
          AND agr.band_score IS NOT NULL
          ${aiColumns.has('status') ? "AND COALESCE(agr.status, 'completed') = 'completed'" : ''})`
      : 'FALSE';

    const bandCandidates = [];
    if (writingColumns.has('overall_tutor_band')) bandCandidates.push('MAX(ws.overall_tutor_band)');
    if (writingColumns.has('overall_ai_band')) bandCandidates.push('MAX(ws.overall_ai_band)');
    if (tutorFeedbackColumns.has('band_score')) bandCandidates.push('MAX(tfr.band_score)');
    if (aiColumns.has('band_score')) bandCandidates.push('MAX(agr.band_score)');
    const bandExpr = bandCandidates.length ? `COALESCE(${bandCandidates.join(', ')})` : 'NULL::numeric';
    const tutorBandExpr = [
      writingColumns.has('overall_tutor_band') ? 'MAX(ws.overall_tutor_band)' : null,
      tutorFeedbackColumns.has('band_score') ? 'MAX(tfr.band_score)' : null,
    ].filter(Boolean);
    const aiBandExpr = [
      writingColumns.has('overall_ai_band') ? 'MAX(ws.overall_ai_band)' : null,
      aiColumns.has('band_score') ? 'MAX(agr.band_score)' : null,
    ].filter(Boolean);

    const query = `
      SELECT 
        COALESCE(${writingGroupExpr}::text, ws.id::text) AS id,
        'writing' AS type,
        NULL::int AS task_number,
        NULL::int AS part_number,
        MIN(ws.submitted_at) AS submitted_at,
        CASE
          WHEN BOOL_OR(ws.status = 'reviewed') THEN 'reviewed'
          WHEN ${tutorGradedExpr} THEN 'tutor_graded'
          WHEN ${aiCompletedExpr} THEN 'ai_graded'
          WHEN ${aiFailedExpr} THEN 'failed'
          ELSE 'pending'
        END AS submission_status,
        CASE
          WHEN ${aiFailedExpr} THEN 'failed'
          WHEN ${aiCompletedExpr} THEN 'completed'
          ELSE 'pending'
        END AS ai_status,
        CASE
          WHEN ${tutorGradedExpr} THEN 'graded'
          ELSE 'pending'
        END AS tutor_status,
        MIN(ws.grader::text) AS grader,
        ${bandExpr} AS band_score,
        ${tutorBandExpr.length ? `COALESCE(${tutorBandExpr.join(', ')})` : 'NULL::numeric'} AS tutor_band_score,
        ${aiBandExpr.length ? `COALESCE(${aiBandExpr.join(', ')})` : 'NULL::numeric'} AS ai_band_score,
        MIN(mt.title) AS test_title,
        MIN(ws.id::text)::uuid AS ai_grading_submission_id,
        json_agg(
          json_build_object(
            'submissionId', ws.id,
            'taskNumber', ws.task_number
          )
          ORDER BY ws.task_number
        ) AS ai_grading_tasks
      FROM writing_submissions ws
      ${tutorJoin}
      ${aiJoin}
      LEFT JOIN mock_tests mt ON mt.id = ws.test_id
      WHERE ws.user_id = $1
      GROUP BY COALESCE(${writingGroupExpr}::text, ws.id::text)

      UNION ALL

      SELECT 
        COALESCE(ss.speaking_group_id::text, ss.id::text) AS id,
        'speaking' AS type,
        NULL::int AS task_number,
        NULL::int AS part_number,
        MIN(ss.submitted_at) AS submitted_at,
        CASE
          WHEN BOOL_OR(ss.status = 'reviewed') THEN 'reviewed'
          WHEN BOOL_OR(ss.status = 'tutor_graded') THEN 'tutor_graded'
          WHEN ${speakingAiCompletedExpr} THEN 'ai_graded'
          WHEN BOOL_OR(ss.status = 'ai_graded') AND BOOL_AND(ss.status = 'ai_graded') THEN 'ai_graded'
          WHEN ${speakingAiFailedExpr} THEN 'failed'
          ELSE 'pending'
        END AS submission_status,
        CASE
          WHEN ${speakingAiFailedExpr} THEN 'failed'
          WHEN ${speakingAiCompletedExpr} THEN 'completed'
          WHEN BOOL_OR(ss.status = 'ai_graded') AND BOOL_AND(ss.status = 'ai_graded') THEN 'completed'
          ELSE 'pending'
        END AS ai_status,
        NULL::text AS tutor_status,
        MIN(ss.grader::text) AS grader,
        ${[
          tutorFeedbackColumns.has('band_score') ? 'MAX(tfr.band_score)' : null,
          aiColumns.has('band_score') ? 'MAX(agr.band_score)' : null,
        ].filter(Boolean).length
          ? `COALESCE(${[
              tutorFeedbackColumns.has('band_score') ? 'MAX(tfr.band_score)' : null,
              aiColumns.has('band_score') ? 'MAX(agr.band_score)' : null,
            ].filter(Boolean).join(', ')})`
          : 'NULL::numeric'} AS band_score,
        ${tutorFeedbackColumns.has('band_score') ? 'MAX(tfr.band_score)' : 'NULL::numeric'} AS tutor_band_score,
        ${aiColumns.has('band_score') ? 'MAX(agr.band_score)' : 'NULL::numeric'} AS ai_band_score,
        MIN(mt.title) AS test_title,
        NULL::uuid AS ai_grading_submission_id,
        NULL::json AS ai_grading_tasks
      FROM speaking_submissions ss
      ${speakingTutorJoin}
      ${speakingAiJoin}
      LEFT JOIN mock_tests mt ON mt.id = ss.test_id
      WHERE ss.user_id = $1 AND ss.deleted_at IS NULL
      GROUP BY COALESCE(ss.speaking_group_id::text, ss.id::text)

      ORDER BY submitted_at DESC
    `;
    const result = await pool.query(query, [userId]);
    const speakingGroupIds = result.rows.filter((row) => row.type === 'speaking').map((row) => row.id);
    const jobs = speakingGroupIds.length ? await pool.query(
      `SELECT root.group_id,
              COALESCE(child.id, root.id) AS job_id,
              COALESCE(child.status, root.status) AS status,
              COALESCE(child.stage, root.stage) AS stage,
              COALESCE(child.attempt_count, root.attempt_count) AS attempt_count,
              COALESCE(child.max_attempts, root.max_attempts) AS max_attempts,
               (child.id IS NULL AND root.status = 'failed') AS can_retry
       FROM ai_grading_jobs root
       LEFT JOIN ai_grading_jobs child
         ON child.retry_of_job_id = root.id AND child.deleted_at IS NULL
       WHERE root.user_id = $1 AND root.retry_of_job_id IS NULL
         AND root.group_id = ANY($2::uuid[]) AND root.deleted_at IS NULL`,
      [userId, speakingGroupIds]) : { rows: [] };
    const jobByGroup = new Map(jobs.rows.map((job) => [String(job.group_id), job]));
    return result.rows.map(row => {
      const job = row.type === 'speaking' ? jobByGroup.get(String(row.id)) : null;
      return ({
      id: row.id,
      type: row.type,
      task_number: row.task_number,
      part_number: row.part_number,
      submitted_at: row.submitted_at,
      status: row.submission_status,
      aiStatus: row.ai_status,
      tutorStatus: row.tutor_status,
      grader: row.grader,
      band_score: row.band_score ? parseFloat(row.band_score) : null,
      tutor_band_score: row.tutor_band_score
        ? parseFloat(row.tutor_band_score) : null,
      ai_band_score: row.ai_band_score ? parseFloat(row.ai_band_score) : null,
      testTitle: row.test_title,
      aiGradingSubmissionId: row.ai_grading_submission_id,
      aiGradingTasks: row.ai_grading_tasks || [],
      gradingJobId: job?.job_id || null,
      gradingStatus: job?.status || null,
      gradingStage: job?.stage || null,
      attemptCount: job?.attempt_count ?? null,
      maxAttempts: job?.max_attempts ?? null,
      canRetry: job?.can_retry === true,
    });
    });
  }

  static async getWritingFeedbackDetail(id, userId) {
    const targetRes = await pool.query(
      `SELECT id, user_id, writing_group_id
       FROM writing_submissions
       WHERE writing_group_id::text = $1 OR id::text = $1
       ORDER BY task_number ASC NULLS LAST
       LIMIT 1`,
      [id]
    );

    if (targetRes.rows.length === 0) {
      throw new AppError('Submission not found', 404, 'NOT_FOUND');
    }

    const target = targetRes.rows[0];
    if (target.user_id !== userId) {
      throw new AppError('You do not have permission to access this submission', 403, 'FORBIDDEN');
    }

    const groupId = target.writing_group_id || target.id;
    const tasksRes = await pool.query(
      `SELECT ws.*, mt.title AS test_title
       FROM writing_submissions ws
       LEFT JOIN mock_tests mt ON mt.id = ws.test_id
       WHERE ws.user_id = $1
         AND (
           ($2::uuid IS NOT NULL AND ws.writing_group_id = $2::uuid)
           OR ws.id = $3::uuid
         )
       ORDER BY ws.task_number ASC`,
      [userId, target.writing_group_id, target.id]
    );

    const tasks = tasksRes.rows;
    if (tasks.length === 0) {
      throw new AppError('Submission not found', 404, 'NOT_FOUND');
    }

    const taskIds = tasks.map(task => task.id);
    const aiRes = await pool.query(
      `SELECT DISTINCT ON (submission_id) *
       FROM ai_grading_reports
       WHERE submission_type = 'writing'
         AND submission_id = ANY($1::uuid[])
         AND deleted_at IS NULL
       ORDER BY submission_id,
                CASE WHEN band_score IS NOT NULL THEN 0 ELSE 1 END,
                generated_at DESC`,
      [taskIds]
    );
    const aiBySubmission = new Map(aiRes.rows.map(row => [row.submission_id, row]));

    const tutorRes = await pool.query(
      `SELECT DISTINCT ON (writing_submission_id) *
       FROM tutor_feedback_reports
       WHERE writing_submission_id = ANY($1::uuid[]) AND deleted_at IS NULL
       ORDER BY writing_submission_id, updated_at DESC, created_at DESC`,
      [taskIds]
    );
    const tutorBySubmission = new Map(tutorRes.rows.map(row => [row.writing_submission_id, row]));

    const first = tasks[0];
    const aiTaskReports = tasks.map(task => mapAiReport(aiBySubmission.get(task.id)));
    const tutorTaskGrades = tasks.map(task => mapTutorGrade(tutorBySubmission.get(task.id)));
    const task1Ai = aiTaskReports.find((report, index) => tasks[index].task_number === 1);
    const task2Ai = aiTaskReports.find((report, index) => tasks[index].task_number === 2);
    const task1Tutor = tutorTaskGrades.find((grade, index) => tasks[index].task_number === 1);
    const task2Tutor = tutorTaskGrades.find((grade, index) => tasks[index].task_number === 2);
    const calculatedOverallAiBand = task1Ai?.overallBand !== null
      && task1Ai?.overallBand !== undefined
      && task2Ai?.overallBand !== null
      && task2Ai?.overallBand !== undefined
      ? calculateWeightedWritingBand(task1Ai.overallBand, task2Ai.overallBand)
      : null;
    const calculatedOverallTutorBand = task1Tutor?.overallBand !== null
      && task1Tutor?.overallBand !== undefined
      && task2Tutor?.overallBand !== null
      && task2Tutor?.overallBand !== undefined
      ? calculateWeightedWritingBand(task1Tutor.overallBand, task2Tutor.overallBand)
      : null;
    const hasAiFailure = aiTaskReports.some(report => report?.status === REPORT_STATUS.FAILED || report?.errorMessage);
    const hasCompletedAiReports = tasks.length === 2
      && aiTaskReports.every(report => report?.overallBand !== null && report?.overallBand !== undefined);
    const aiStatus = tasks.some(task => task.ai_status === 'failed') || hasAiFailure
      ? 'failed'
      : (tasks.length === 2 && (tasks.every(task => task.ai_status === 'completed') || hasCompletedAiReports) ? 'completed' : 'pending');
    const tutorStatus = tasks.length === 2 && (
      tasks.every(task => task.tutor_status === 'graded')
      || tutorTaskGrades.every(grade => grade?.overallBand !== null && grade?.overallBand !== undefined)
    )
      ? 'graded'
      : 'pending';
    const overallAiBand = isValidHalfBandScore(first.overall_ai_band)
      ? parseFloat(first.overall_ai_band)
      : calculatedOverallAiBand;
    const overallTutorBand = isValidHalfBandScore(first.overall_tutor_band)
      ? parseFloat(first.overall_tutor_band)
      : calculatedOverallTutorBand;

    return {
      submissionId: String(groupId),
      testTitle: first.test_title || 'IELTS Writing',
      skill: 'writing',
      submittedAt: first.submitted_at,
      overallWritingBand: overallTutorBand ?? overallAiBand,
      overallAiBand,
      overallTutorBand,
      grader: first.grader,
      aiStatus,
      tutorStatus,
      status: aiStatus === 'failed'
        ? 'failed'
        : (tutorStatus === 'graded' ? 'tutor_graded' : (aiStatus === 'completed' ? 'ai_graded' : 'pending')),
      tasks: tasks.map((task, index) => ({
        taskSubmissionId: task.id,
        submissionId: task.id,
        taskNumber: task.task_number,
        prompt: task.prompt_text || '',
        promptText: task.prompt_text || '',
        studentResponse: task.response_text || '',
        responseText: task.response_text || '',
        wordCount: task.word_count ?? countWords(task.response_text),
        aiFeedback: aiTaskReports[index],
        tutorGrade: tutorTaskGrades[index],
      })),
    };
  }

  static async getSpeakingFeedbackDetail(id, userId) {
    const partsRes = await pool.query(
      `SELECT ss.*, mt.title AS test_title
       FROM speaking_submissions ss
       LEFT JOIN mock_tests mt ON mt.id = ss.test_id
       WHERE (ss.speaking_group_id::text = $1 OR ss.id::text = $1)
         AND ss.user_id = $2
         AND ss.deleted_at IS NULL
       ORDER BY ss.part_number ASC`,
      [id, userId]
    );
    if (partsRes.rows.length === 0) {
      throw new AppError('Submission not found', 404, 'NOT_FOUND');
    }

    const parts = partsRes.rows;
    const partIds = parts.map(part => part.id);
    let asyncStatus = null;
    try {
      const { getSpeakingSubmissionService } = require('./speakingSubmission.service');
      asyncStatus = await getSpeakingSubmissionService().getStatus(
        String(parts[0].speaking_group_id || parts[0].id),
        { id: userId, role: 'student' }
      );
    } catch (error) {
      if (error.errorCode !== 'GRADING_JOB_NOT_FOUND') throw error;
    }

    if (asyncStatus) {
      const artifactRows = await pool.query(
        `SELECT DISTINCT ON (speaking_submission_id)
            speaking_submission_id, asr_transcript, display_transcript
         FROM speaking_analysis_artifacts
         WHERE speaking_submission_id = ANY($1::uuid[])
           AND status IN ('complete', 'partial')
           AND deleted_at IS NULL
         ORDER BY speaking_submission_id, created_at DESC`,
        [partIds]
      );
      const transcriptByPart = new Map(artifactRows.rows.map(artifact => [
        artifact.speaking_submission_id,
        artifact.display_transcript || artifact.asr_transcript || '',
      ]));
      const result = asyncStatus.status === 'completed' ? asyncStatus.result : null;
      const criteria = result?.criteria || {};
      const aiFeedback = result ? {
        id: result.report_id,
        status: 'completed',
        overallBand: result.overall_band,
        computedBand: result.overall_band,
        criterionScores: {
          fluencyCoherence: criteria.fluency_coherence || null,
          lexicalResource: criteria.lexical_resource || null,
          grammaticalRangeAccuracy: criteria.grammatical_range_accuracy || null,
          pronunciation: criteria.pronunciation || null,
        },
        summary: result.text_based_feedback?.coherence || '',
        partFeedback: result.part_feedback || [],
        disclaimer: result.disclaimer,
        evidenceMode: result.evidence_mode,
        submissionType: 'speaking',
      } : null;
      return {
        submissionId: String(parts[0].speaking_group_id || parts[0].id),
        testTitle: parts[0].test_title || 'IELTS Speaking',
        skill: 'speaking',
        submittedAt: parts[0].submitted_at,
        grader: parts[0].grader,
        status: asyncStatus.status === 'completed' ? 'ai_graded' : asyncStatus.status,
        gradingStatus: asyncStatus.status,
        gradingStage: asyncStatus.stage,
        canRetry: asyncStatus.can_retry,
        overallSpeakingBand: result?.overall_band ?? null,
        overallAiBand: result?.overall_band ?? null,
        overallTutorBand: null,
        aiStatus: asyncStatus.status,
        tutorStatus: asyncStatus.status === 'needs_review' ? 'pending' : null,
        aiFeedback,
        tutorGrade: null,
        parts: parts.map(part => ({
          submissionId: part.id,
          partNumber: part.part_number,
          prompt: part.prompt_text || '',
          promptText: part.prompt_text || '',
          audioUrl: '',
          transcript: transcriptByPart.get(part.id) || '',
          aiPartFeedback: result?.part_feedback?.find(item => Number(item.part_number) === Number(part.part_number)) || null,
        })),
      };
    }
    const aiColumns = await getAiReportColumns();
    const aiWhere = ['submission_id = ANY($2::uuid[])'];
    const aiParams = ['speaking', partIds];
    if (aiColumns.has('speaking_group_id') && parts[0].speaking_group_id) {
      aiParams.push(parts[0].speaking_group_id);
      aiWhere.push(`speaking_group_id = $${aiParams.length}`);
    }
    const distinctKey = aiColumns.has('part_number')
      ? 'submission_id, COALESCE(part_number, 0)'
      : 'submission_id';
    const orderKey = aiColumns.has('part_number')
      ? 'submission_id, COALESCE(part_number, 0),'
      : 'submission_id,';
    const aiRes = await pool.query(
      `SELECT DISTINCT ON (${distinctKey}) *
       FROM ai_grading_reports
       WHERE submission_type = $1
         AND (${aiWhere.join(' OR ')})
         AND deleted_at IS NULL
       ORDER BY ${orderKey}
                CASE WHEN band_score IS NOT NULL THEN 0 ELSE 1 END,
                generated_at DESC`,
      aiParams
    );

    const overallReport = aiRes.rows.find(report => report.part_number === null || report.part_number === undefined)
      || buildSpeakingAggregateReport(aiRes.rows, parts);
    const aiFeedback = mapAiReport(overallReport);

    const tutorRes = await pool.query(
      `SELECT DISTINCT ON (speaking_submission_id) *
       FROM tutor_feedback_reports
       WHERE speaking_submission_id = ANY($1::uuid[]) AND deleted_at IS NULL
       ORDER BY speaking_submission_id, updated_at DESC, created_at DESC`,
      [partIds]
    );
    const tutorReport = tutorRes.rows[0] || null;

    return {
      submissionId: String(parts[0].speaking_group_id || parts[0].id),
      testTitle: parts[0].test_title || 'IELTS Speaking',
      skill: 'speaking',
      submittedAt: parts[0].submitted_at,
      grader: parts[0].grader,
      status: parts.every(part => part.status === 'ai_graded') ? 'ai_graded' : parts[0].status,
      overallSpeakingBand: aiFeedback?.overallBand ?? (tutorReport?.band_score ? parseFloat(tutorReport.band_score) : null),
      overallAiBand: aiFeedback?.overallBand ?? null,
      overallTutorBand: tutorReport?.band_score ? parseFloat(tutorReport.band_score) : null,
      aiStatus: aiFeedback?.status === REPORT_STATUS.FAILED || aiFeedback?.errorMessage
        ? 'failed'
        : (aiFeedback ? 'completed' : 'pending'),
      tutorStatus: tutorReport ? 'graded' : 'pending',
      aiFeedback,
      tutorGrade: mapTutorGrade(tutorReport),
      parts: parts.map(part => ({
        submissionId: part.id,
        partNumber: part.part_number,
        prompt: part.prompt_text || '',
        promptText: part.prompt_text || '',
        audioUrl: toPublicSpeakingAudioUrl(part.audio_url) || '',
        transcript: part.transcript || '',
        aiPartFeedback: aiFeedback?.partFeedback?.find(item => Number(item.partNumber) === Number(part.part_number)) || null,
      })),
    };
  }

  static async getFeedback(id, userId, type) {
    if (type !== 'speaking' && type !== 'writing') {
      throw new AppError('type must be speaking or writing', 400, 'INVALID_FIELD');
    }
    if (type === 'writing') {
      return this.getWritingFeedbackDetail(id, userId);
    }
    if (type === 'speaking') {
      return this.getSpeakingFeedbackDetail(id, userId);
    }
    const submissionTable = type === 'speaking' ? 'speaking_submissions' : 'writing_submissions';
    const groupCol = type === 'speaking' ? 'speaking_group_id' : 'writing_group_id';
    
    // Support either legacy id or new group id
    const subRes = await pool.query(
      `SELECT * FROM ${submissionTable} WHERE (${groupCol}::text = $1 OR id::text = $1) AND user_id = $2
       ${type === 'speaking' ? 'AND deleted_at IS NULL' : ''}
       ORDER BY created_at DESC LIMIT 1`,
      [id, userId]
    );
    if (subRes.rows.length === 0) {
      throw new AppError('Submission not found', 404, 'NOT_FOUND');
    }
    const submission = subRes.rows[0];
    let report = {};
    const aiRes = await pool.query(
      `SELECT * FROM ai_grading_reports
       WHERE submission_id = $1 AND submission_type = $2 AND deleted_at IS NULL
       ORDER BY generated_at DESC LIMIT 1`,
      [submission.id, type]
    );
    if (aiRes.rows.length > 0) report.ai_report = aiRes.rows[0];
    
    // For tutor reports, check submission_id but fallback to repTaskId if it's stored differently
    const tutorRes = await pool.query(
      `SELECT * FROM tutor_feedback_reports
       WHERE deleted_at IS NULL
         AND ${type === 'speaking' ? 'speaking_submission_id' : 'writing_submission_id'} IN
           (SELECT id FROM ${submissionTable} WHERE ${groupCol}::text = $1 OR id::text = $1)`,
      [id]
    );
    if (tutorRes.rows.length > 0) report.tutor_report = tutorRes.rows[0];
    if (submission.status === 'pending' && !report.ai_report) {
      return { status: 'pending', message: 'Bài đang được chấm, vui lòng chờ...' };
    }
    if (submission.status === 'pending' && report.ai_report) {
      const aiFailed = report.ai_report.status === 'failed'
        || report.ai_report.error_message;
      return { status: aiFailed ? 'failed' : 'pending', ...report };
    }
    return report;
  }
}

module.exports = SubmissionService;
