const { pool } = require('../db/pool');
const AppError = require('../utils/AppError');
const AuditLogService = require('./audit.service');
const {
  roundToNearestHalf,
  isValidHalfBandScore,
  calcBandFromCriteria,
  calcWeightedWritingOverall,
} = require('../utils/scoring');
const { gradeWriting } = require('../ai/grading.service');
const { REPORT_STATUS } = require('../ai/aiGrading.constants');
const { gradeSpeakingGroup, getLatestCompletedReports } = require('./speakingAiGrading.service');

const countWords = (text) =>
  String(text || '').trim().split(/\s+/).filter(Boolean).length;

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

const calculateDisplayWritingBand = (task1Band, task2Band) => {
  if (
    task1Band === null || task1Band === undefined || task1Band === ''
    || task2Band === null || task2Band === undefined || task2Band === ''
  ) {
    return null;
  }
  const task1 = Number(task1Band);
  const task2 = Number(task2Band);
  if (!Number.isFinite(task1) || !Number.isFinite(task2)) return null;
  return calculateWeightedWritingBand(roundToNearestHalf(task1), roundToNearestHalf(task2));
};

const validateBand = (value, fieldName) => {
  const number = Number(value);
  if (!isValidHalfBandScore(number)) {
    throw new AppError(`${fieldName} must be a number between 0 and 9 in 0.5 steps`, 400);
  }
  return number;
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
  if (
    criteria?.fluencyCoherence !== undefined
    || criteria?.pronunciation !== undefined
  ) {
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

const mapAiReport = (report) => {
  if (!report) return null;
  const rawAiResponse = parseMaybeJson(report.raw_ai_response, {});
  const feedback = parseMaybeJson(report.feedback_json, null) || rawAiResponse || {};
  const parsedCriteria = parseMaybeJson(report.criteria_json, null) || rawAiResponse.criteria || null;
  const criterionScores = buildCriterionScores(report, parsedCriteria);
  return {
    id: report.id,
    submissionType: report.submission_type,
    status: report.status || REPORT_STATUS.COMPLETED,
    errorMessage: report.error_message || null,
    overallBand: toNumberOrNull(report.band_score),
    computedBand: toNumberOrNull(report.computed_band),
    criterionScores,
    summary: feedback.summary || report.suggestions || '',
    strengths: Array.isArray(feedback.strengths) ? feedback.strengths : [],
    weaknesses: Array.isArray(feedback.weaknesses) ? feedback.weaknesses : [],
    majorErrors: Array.isArray(feedback.majorErrors)
      ? feedback.majorErrors
      : parseMaybeJson(report.error_highlights, []),
    improvedVersion: report.improved_version || feedback.improvedVersion || '',
    vocabularySuggestions: Array.isArray(feedback.vocabularySuggestions)
      ? feedback.vocabularySuggestions : [],
    grammarCorrections: Array.isArray(feedback.grammarCorrections)
      ? feedback.grammarCorrections : [],
    actionPlan: Array.isArray(feedback.actionPlan)
      ? feedback.actionPlan
      : (feedback.nextStudyAdvice ? [feedback.nextStudyAdvice] : []),
    detailedFeedback: buildDetailedFeedback(feedback, criterionScores),
    nextStudyAdvice: feedback.nextStudyAdvice || '',
    wordCountFeedback: feedback.wordCountFeedback || null,
    bandWarning: report.band_validation_warning || null,
    generatedAt: report.generated_at,
    taskNumber: report.task_number,
    partNumber: report.part_number,
  };
};

const mapTutorGrade = (report) => {
  if (!report) return null;
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
    updatedAt: report.updated_at,
  };
};

const listSection = (title, items, formatter = item => `- ${item}`) => {
  if (!Array.isArray(items) || items.length === 0) return '';
  return `${title}\n${items.map(formatter).join('\n')}`;
};

const formatErrorItem = (item) => {
  if (typeof item === 'string') return `- ${item}`;
  const quote = item.error || item.quote || item.original || item.text || '';
  const issue = item.explanation || item.problem || item.issue || '';
  const fix = item.correction || item.corrected || item.suggestion || '';
  return `- ${[quote && `"${quote}"`, issue, fix && `Gợi ý: ${fix}`].filter(Boolean).join(' — ')}`;
};

const buildFeedbackDraft = (ai) => [
  ai?.summary ? `Summary\n${ai.summary}` : '',
  ai?.detailedFeedback && Object.keys(ai.detailedFeedback).length > 0
    ? [
        'Criterion feedback',
        ai.detailedFeedback.fluencyCoherence && `- Fluency & Coherence: ${ai.detailedFeedback.fluencyCoherence}`,
        ai.detailedFeedback.taskAchievementOrResponse && `- Task Achievement/Response: ${ai.detailedFeedback.taskAchievementOrResponse}`,
        ai.detailedFeedback.coherenceCohesion && `- Coherence & Cohesion: ${ai.detailedFeedback.coherenceCohesion}`,
        ai.detailedFeedback.lexicalResource && `- Lexical Resource: ${ai.detailedFeedback.lexicalResource}`,
        ai.detailedFeedback.grammarRangeAccuracy && `- Grammar Range & Accuracy: ${ai.detailedFeedback.grammarRangeAccuracy}`,
        ai.detailedFeedback.grammaticalRangeAccuracy && `- Grammatical Range & Accuracy: ${ai.detailedFeedback.grammaticalRangeAccuracy}`,
        ai.detailedFeedback.pronunciation && `- Pronunciation: ${ai.detailedFeedback.pronunciation}`,
      ].filter(Boolean).join('\n')
    : '',
  listSection('Strengths', ai?.strengths),
  listSection('Major errors', ai?.majorErrors, formatErrorItem),
  listSection('Next steps', ai?.actionPlan),
  ai?.nextStudyAdvice ? `Next study advice\n${ai.nextStudyAdvice}` : '',
].filter(Boolean).join('\n\n');

const formatPrelimFromAiFeedback = (taskNumber, ai) => {
  const criteria = ai?.criterionScores || ai?.criteria || {};
  return {
    taskNumber,
    suggestedOverallBand: ai?.overallBand || null,
    suggestedCriteria: {
      taskAchievementOrResponse: criteria.taskAchievementOrResponse?.band
        ?? criteria.taskAchievementOrResponse ?? null,
      coherenceCohesion: criteria.coherenceCohesion?.band
        ?? criteria.coherenceCohesion ?? null,
      lexicalResource: criteria.lexicalResource?.band
        ?? criteria.lexicalResource ?? null,
      grammaticalRangeAccuracy: criteria.grammarRangeAccuracy?.band
        ?? criteria.grammaticalRangeAccuracy?.band
        ?? criteria.grammarRangeAccuracy
        ?? criteria.grammaticalRangeAccuracy
        ?? null,
    },
    feedbackDraft: buildFeedbackDraft(ai),
    keyProblems: ai?.weaknesses || [],
    suggestedRewrite: ai?.improvedVersion || '',
    tutorNotes: Array.isArray(ai?.actionPlan)
      ? ai.actionPlan.join('\n')
      : (ai?.nextStudyAdvice || ''),
    aiFeedback: {
      ...ai,
      taskNumber,
      status: ai?.status || REPORT_STATUS.COMPLETED,
    },
  };
};

const formatPrelimFromAiResult = (taskNumber, result) => formatPrelimFromAiFeedback(taskNumber, {
  status: REPORT_STATUS.COMPLETED,
  overallBand: result.overallBand,
  computedBand: result.computedBand,
  criterionScores: result.criteria,
  summary: result.summary || '',
  strengths: result.strengths || [],
  weaknesses: result.weaknesses || [],
  majorErrors: result.majorErrors || [],
  detailedFeedback: result.detailedFeedback || {},
  improvedVersion: result.improvedVersion || '',
  vocabularySuggestions: result.vocabularySuggestions || [],
  grammarCorrections: result.grammarCorrections || [],
  actionPlan: result.actionPlan || [],
  nextStudyAdvice: result.nextStudyAdvice || '',
  wordCountFeedback: result.wordCountFeedback || null,
  bandWarning: result.bandValidationWarning || null,
});

const formatPrelimFromReport = (report, fallbackTaskNumber = null) => {
  const ai = mapAiReport(report);
  return formatPrelimFromAiFeedback(report.task_number || fallbackTaskNumber, {
    ...ai,
    criterionScores: ai?.criterionScores || {
      taskAchievementOrResponse: report.task_achievement_score,
      coherenceCohesion: report.coherence_score,
      lexicalResource: report.lexical_score,
      grammarRangeAccuracy: report.grammar_score,
    },
  });
};

const formatSpeakingPrelimFromReport = (report, allReports = []) => {
  const ai = mapAiReport(report);
  const completed = allReports
    .map(mapAiReport)
    .filter(item => item?.overallBand !== null && item?.overallBand !== undefined);
  const overall = completed.length === 3
    ? roundToNearestHalf(completed.reduce((sum, item) => sum + Number(item.overallBand), 0) / 3)
    : null;

  return {
    partNumber: report.part_number,
    suggestedOverallBand: ai?.overallBand || null,
    suggestedCriteria: {
      fluencyScore: ai?.criterionScores?.fluencyCoherence?.band
        ?? ai?.criterionScores?.fluencyCoherence
        ?? null,
      lexicalScore: ai?.criterionScores?.lexicalResource?.band
        ?? ai?.criterionScores?.lexicalResource
        ?? null,
      grammarScore: ai?.criterionScores?.grammaticalRangeAccuracy?.band
        ?? ai?.criterionScores?.grammaticalRangeAccuracy
        ?? null,
      pronunciationScore: ai?.criterionScores?.pronunciation?.band
        ?? ai?.criterionScores?.pronunciation
        ?? null,
    },
    feedbackDraft: buildFeedbackDraft(ai),
    keyProblems: ai?.weaknesses || [],
    suggestedRewrite: '',
    tutorNotes: [
      ai?.summary,
      ai?.nextStudyAdvice,
      overall !== null ? `Overall 3-part reference band: ${overall.toFixed(1)}` : '',
    ].filter(Boolean).join('\n\n'),
    groupSummary: {
      overallBand: overall,
      parts: completed.map(item => ({
        partNumber: item.partNumber,
        overallBand: item.overallBand,
        summary: item.summary,
      })),
    },
    aiFeedback: {
      ...ai,
      taskNumber: report.part_number,
      partNumber: report.part_number,
      submissionType: 'speaking',
      status: ai?.status || REPORT_STATUS.COMPLETED,
    },
  };
};

const getAiReportColumns = async () => {
  return getTableColumns(pool, 'ai_grading_reports');
};

class TutorService {
  /**
   * Get pending grading queue for tutors
   * @param {Object} filters
   * @param {string} filters.submission_type - 'writing' or 'speaking'
   * @param {string} filters.search - Search by student name
   */
  static async getQueue(filters = {}) {
    const baseQuery = `
      SELECT 
        'writing' AS submission_type,
        MIN(ws.id::text)::uuid AS submission_id,
        ws.writing_group_id AS speaking_group_id,
        ws.user_id AS student_id,
        u.full_name AS student_name,
        mt.title AS test_title,
        COUNT(ws.id)::int AS parts_count,
        MIN(ws.submitted_at) AS submitted_at,
        MIN(ws.status::text)::submission_status AS status,
        MIN(ws.grader::text)::grader_type AS grader,
        ws.assigned_tutor_id
      FROM writing_submissions ws
      JOIN users u ON u.id = ws.user_id
      LEFT JOIN mock_tests mt ON mt.id = ws.test_id
      WHERE ws.status = 'pending' AND ws.grader = 'tutor'
      GROUP BY ws.writing_group_id, ws.user_id, u.full_name, mt.title, ws.assigned_tutor_id
      
      UNION ALL
      
      SELECT 
        'speaking' AS submission_type,
        MIN(ss.id::text)::uuid AS submission_id,
        ss.speaking_group_id,
        ss.user_id AS student_id,
        u.full_name AS student_name,
        mt.title AS test_title,
        COUNT(ss.id)::int AS parts_count,
        MIN(ss.submitted_at) AS submitted_at,
        MIN(ss.status::text)::submission_status AS status,
        MIN(ss.grader::text)::grader_type AS grader,
        ss.assigned_tutor_id
      FROM speaking_submissions ss
      JOIN users u ON u.id = ss.user_id
      LEFT JOIN mock_tests mt ON mt.id = ss.test_id
      WHERE ss.status = 'pending' AND ss.grader = 'tutor'
      GROUP BY ss.speaking_group_id, ss.user_id, u.full_name, mt.title, ss.assigned_tutor_id
    `;
    let query = `SELECT * FROM (${baseQuery}) q WHERE 1=1`;
    const params = [];

    // Filter by submission_type (writing/speaking)
    if (filters.submission_type && ['writing', 'speaking'].includes(filters.submission_type)) {
      params.push(filters.submission_type);
      query += ` AND submission_type = $${params.length}`;
    }

    // Search by student name
    if (filters.search) {
      params.push(`%${filters.search}%`);
      query += ` AND student_name ILIKE $${params.length}`;
    }

    // Filter by assigned tutor
    if (filters.tutorId) {
      params.push(filters.tutorId);
      query += ` AND assigned_tutor_id = $${params.length}`;
    }

    query += ' ORDER BY submitted_at ASC';

    try {
      const result = await pool.query(query, params);
      return result.rows.map(row => ({
        submissionType: row.submission_type,
        submissionId: row.submission_id,
        speakingGroupId: row.speaking_group_id,
        studentId: row.student_id,
        studentName: row.student_name,
        testTitle: row.test_title,
        partsCount: row.parts_count,
        submittedAt: row.submitted_at,
        status: row.status,
        grader: row.grader
      }));
    } catch (err) {
      // Propagate any DB errors
      throw err;
    }
  }

  /**
   * Get submission detail for grading
   * @param {string} type - 'writing' or 'speaking'
   * @param {string} submissionId 
   */
  static async getSubmissionDetail(type, submissionId) {
    // TEMPORARY FIX: ensure parts consistency before fetching detail
    try {
      if (type === 'speaking') {
        await pool.query(`
          UPDATE speaking_submissions ss_target
          SET status = 'pending' 
          WHERE ss_target.speaking_group_id IN (
            SELECT ss_pending.speaking_group_id
            FROM speaking_submissions ss_pending
            WHERE ss_pending.status = 'pending'
          ) AND ss_target.status = 'tutor_graded'
        `);
      } else {
        await pool.query(`
          UPDATE writing_submissions ws_target
          SET status = 'pending' 
          WHERE ws_target.writing_group_id IN (
            SELECT ws_pending.writing_group_id
            FROM writing_submissions ws_pending
            WHERE ws_pending.status = 'pending'
          ) AND ws_target.status = 'tutor_graded'
        `);
      }
    } catch (err) {
      console.error('Error applying temporary fix:', err);
    }

    if (type === 'writing') {
      const targetRes = await pool.query(
        `SELECT id, writing_group_id
         FROM writing_submissions
         WHERE id::text = $1 OR writing_group_id::text = $1
         ORDER BY task_number ASC NULLS LAST
         LIMIT 1`,
        [submissionId]
      );
      if (targetRes.rows.length === 0) return null;

      const target = targetRes.rows[0];
      const tasksRes = await pool.query(
        `SELECT ws.*, mt.title AS test_title, u.full_name AS student_name
         FROM writing_submissions ws
         JOIN users u ON u.id = ws.user_id
         LEFT JOIN mock_tests mt ON mt.id = ws.test_id
         WHERE (
           ($1::uuid IS NOT NULL AND ws.writing_group_id = $1::uuid)
           OR ws.id = $2::uuid
         )
         ORDER BY ws.task_number ASC`,
        [target.writing_group_id, target.id]
      );
      const tasks = tasksRes.rows;
      if (tasks.length === 0) return null;

      const taskIds = tasks.map(task => task.id);
      const aiRes = await pool.query(
        `SELECT DISTINCT ON (submission_id) *
         FROM ai_grading_reports
         WHERE submission_type = 'writing'
           AND submission_id = ANY($1::uuid[])
         ORDER BY submission_id, generated_at DESC`,
        [taskIds]
      );
      const aiBySubmission = new Map(aiRes.rows.map(report => [report.submission_id, report]));

      const tutorRes = await pool.query(
        `SELECT DISTINCT ON (writing_submission_id) *
         FROM tutor_feedback_reports
         WHERE writing_submission_id = ANY($1::uuid[])
         ORDER BY writing_submission_id, updated_at DESC, created_at DESC`,
        [taskIds]
      );
      const tutorBySubmission = new Map(tutorRes.rows.map(report => [report.writing_submission_id, report]));

      const row = tasks[0];
      const aiTaskReports = tasks.map(task => mapAiReport(aiBySubmission.get(task.id)));
      const tutorTaskGrades = tasks.map(task => mapTutorGrade(tutorBySubmission.get(task.id)));
      const task1Ai = aiTaskReports.find((report, index) => tasks[index].task_number === 1);
      const task2Ai = aiTaskReports.find((report, index) => tasks[index].task_number === 2);
      const task1Tutor = tutorTaskGrades.find((grade, index) => tasks[index].task_number === 1);
      const task2Tutor = tutorTaskGrades.find((grade, index) => tasks[index].task_number === 2);
      const calculatedOverallAiBand = calculateDisplayWritingBand(task1Ai?.overallBand, task2Ai?.overallBand);
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
      return {
        type: 'writing',
        writingGroupId: row.writing_group_id,
        submissionId: row.writing_group_id || row.id,
        student: {
          id: row.user_id,
          fullName: row.student_name
        },
        testTitle: row.test_title,
        submittedAt: row.submitted_at,
        status: tutorStatus === 'graded'
          ? 'tutor_graded'
          : (aiStatus === 'completed' && row.grader === 'ai' ? 'ai_graded' : 'pending'),
        aiStatus,
        tutorStatus,
        overallAiBand: isValidHalfBandScore(row.overall_ai_band)
          ? parseFloat(row.overall_ai_band)
          : calculatedOverallAiBand,
        overallTutorBand: isValidHalfBandScore(row.overall_tutor_band)
          ? parseFloat(row.overall_tutor_band)
          : calculatedOverallTutorBand,
        grader: row.grader,
        parts: tasks.map(task => ({
          submissionId: task.id,
          taskNumber: task.task_number,
          promptText: task.prompt_text,
          responseText: task.response_text,
          wordCount: task.word_count ?? countWords(task.response_text),
          fileUrl: task.file_url,
          aiFeedback: mapAiReport(aiBySubmission.get(task.id)),
          tutorGrade: mapTutorGrade(tutorBySubmission.get(task.id)),
        }))
      };
    } else if (type === 'speaking') {
      const query = `
        WITH base AS (
            SELECT COALESCE(speaking_group_id, id) AS group_id
            FROM speaking_submissions
            WHERE id::text = $1 OR speaking_group_id::text = $1
            ORDER BY part_number ASC NULLS LAST
            LIMIT 1
        )
        SELECT
            ss.speaking_group_id,
            ss.user_id AS student_id,
            u.full_name AS student_name,
            mt.title AS test_title,
            MIN(ss.submitted_at) AS submitted_at,
            MIN(ss.status) AS status,
            MIN(ss.grader) AS grader,
            json_agg(
                json_build_object(
                    'submissionId', ss.id,
                    'partNumber', ss.part_number,
                    'promptText', ss.prompt_text,
                    'audioUrl', ss.audio_url,
                    'transcript', ss.transcript
                )
                ORDER BY ss.part_number
            ) AS parts
        FROM speaking_submissions ss
        JOIN base b ON COALESCE(ss.speaking_group_id, ss.id) = b.group_id
        JOIN users u ON u.id = ss.user_id
        LEFT JOIN mock_tests mt ON mt.id = ss.test_id
        GROUP BY
            ss.speaking_group_id,
            ss.user_id,
            u.full_name,
            mt.title
      `;
      const result = await pool.query(query, [submissionId]);
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      const parts = row.parts || [];
      const aiBySubmission = await getLatestCompletedReports(parts.map(part => part.submissionId));
      return {
        type: 'speaking',
        speakingGroupId: row.speaking_group_id,
        student: {
          id: row.student_id,
          fullName: row.student_name
        },
        testTitle: row.test_title,
        submittedAt: row.submitted_at,
        status: row.status,
        grader: row.grader,
        parts: parts.map(part => ({
          ...part,
          aiFeedback: mapAiReport(aiBySubmission.get(part.submissionId)),
        }))
      };
    }
    return null;
  }

  /**
   * Grade a submission using database transaction
   * @param {string} type 
   * @param {string} submissionId 
   * @param {string} tutorId 
   * @param {Object} payload 
   * @param {string} ipAddress
   */
  static async gradeSubmission(type, submissionId, tutorId, payload, ipAddress = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let studentId;
      let submission;
      let studentName = 'N/A';

      if (type === 'writing') {
        const taskNumber = Number(payload.taskNumber ?? payload.task_number);
        if (![1, 2].includes(taskNumber)) {
          throw new AppError('taskNumber must be 1 or 2', 400);
        }

        const bandScore = payload.bandScore !== undefined && payload.bandScore !== null && payload.bandScore !== ''
          ? validateBand(payload.bandScore, 'bandScore')
          : null;
        const criteriaBands = {
          taskAchievementScore: validateBand(payload.taskAchievementScore, 'taskAchievementScore'),
          coherenceScore: validateBand(payload.coherenceScore, 'coherenceScore'),
          lexicalScore: validateBand(payload.lexicalScore, 'lexicalScore'),
          grammarScore: validateBand(payload.grammarScore, 'grammarScore'),
        };
        const finalTaskBand = bandScore ?? calcBandFromCriteria([
          criteriaBands.taskAchievementScore,
          criteriaBands.coherenceScore,
          criteriaBands.lexicalScore,
          criteriaBands.grammarScore,
        ]);

        const checkQuery = `
          SELECT ws.id, ws.writing_group_id, ws.status, ws.grader, ws.user_id, u.full_name as student_name
          FROM writing_submissions ws
          LEFT JOIN users u ON u.id = ws.user_id
          WHERE ws.id::text = $1 OR ws.writing_group_id::text = $1
          ORDER BY ws.task_number ASC NULLS LAST
          LIMIT 1
          FOR UPDATE OF ws
        `;
        const checkResult = await client.query(checkQuery, [submissionId]);
        if (checkResult.rowCount === 0) {
          throw new AppError('Submission not found', 404);
        }
        submission = checkResult.rows[0];
        studentId = submission.user_id;
        studentName = submission.student_name;

        if (!submission.writing_group_id) {
          throw new AppError('Legacy submission without group ID cannot be graded via grouped API.', 400);
        }

        const groupQuery = `
          SELECT id, task_number, status, grader
          FROM writing_submissions
          WHERE writing_group_id = $1
          ORDER BY task_number ASC
          FOR UPDATE`;
        const groupResult = await client.query(groupQuery, [submission.writing_group_id]);
        if (groupResult.rows.length !== 2) {
          throw new AppError('Writing submission must contain both Task 1 and Task 2', 400);
        }
        if (groupResult.rows.some(task => task.grader !== 'tutor')) {
          throw new AppError('This Writing submission is not assigned to tutor grading.', 409);
        }
        const targetTask = groupResult.rows.find(task => task.task_number === taskNumber);
        if (!targetTask) {
          throw new AppError('taskNumber does not belong to this submission', 400);
        }

        const [feedbackColumns, writingColumns] = await Promise.all([
          getTableColumns(client, 'tutor_feedback_reports'),
          getTableColumns(client, 'writing_submissions'),
        ]);
        const requiredFeedbackColumns = [
          'tutor_id',
          'writing_submission_id',
          'band_score',
          'task_achievement_score',
          'coherence_score',
          'lexical_score',
          'grammar_score',
          'written_feedback',
        ];
        const missingFeedbackColumns = requiredFeedbackColumns.filter(column => !feedbackColumns.has(column));
        if (missingFeedbackColumns.length > 0) {
          throw new AppError('Tutor feedback table is missing required columns.', 500);
        }

        const feedbackValues = {
          tutor_id: tutorId,
          writing_submission_id: targetTask.id,
          band_score: finalTaskBand,
          task_achievement_score: criteriaBands.taskAchievementScore,
          coherence_score: criteriaBands.coherenceScore,
          lexical_score: criteriaBands.lexicalScore,
          grammar_score: criteriaBands.grammarScore,
          written_feedback: payload.writtenFeedback || '',
          task_number: taskNumber,
        };
        const updateValues = [];
        const setClauses = [];
        const addFeedbackSet = (column) => {
          if (!feedbackColumns.has(column)) return;
          updateValues.push(feedbackValues[column]);
          setClauses.push(`${column} = $${updateValues.length}`);
        };
        [
          'tutor_id',
          'band_score',
          'task_achievement_score',
          'coherence_score',
          'lexical_score',
          'grammar_score',
          'written_feedback',
          'task_number',
        ].forEach(addFeedbackSet);
        if (feedbackColumns.has('updated_at')) {
          setClauses.push('updated_at = NOW()');
        }
        updateValues.push(targetTask.id);
        const updateFeedbackResult = await client.query(
          `UPDATE tutor_feedback_reports
           SET ${setClauses.join(', ')}
           WHERE writing_submission_id = $${updateValues.length}
           RETURNING id`,
          updateValues
        );

        if (updateFeedbackResult.rowCount === 0) {
          const insertOrder = [
            'tutor_id',
            'writing_submission_id',
            'band_score',
            'task_achievement_score',
            'coherence_score',
            'lexical_score',
            'grammar_score',
            'written_feedback',
            'task_number',
            'updated_at',
          ];
          const insertColumns = insertOrder.filter(column =>
            feedbackColumns.has(column)
            && (column === 'updated_at' || Object.prototype.hasOwnProperty.call(feedbackValues, column))
          );
          const insertValues = [];
          const placeholders = insertColumns.map((column) => {
            if (column === 'updated_at') return 'NOW()';
            insertValues.push(feedbackValues[column]);
            return `$${insertValues.length}`;
          });
          await client.query(
            `INSERT INTO tutor_feedback_reports (${insertColumns.join(', ')})
             VALUES (${placeholders.join(', ')})`,
            insertValues
          );
        }

        const gradeOrder = feedbackColumns.has('updated_at')
          ? 'tfr.updated_at DESC NULLS LAST, tfr.created_at DESC NULLS LAST'
          : 'tfr.created_at DESC NULLS LAST';
        const gradesResult = await client.query(
          `SELECT DISTINCT ON (ws.id) ws.task_number, tfr.band_score
           FROM writing_submissions ws
           LEFT JOIN tutor_feedback_reports tfr ON tfr.writing_submission_id = ws.id
           WHERE ws.writing_group_id = $1
           ORDER BY ws.id, ${gradeOrder}`,
          [submission.writing_group_id]
        );
        const task1Grade = gradesResult.rows.find(row => row.task_number === 1 && row.band_score !== null);
        const task2Grade = gradesResult.rows.find(row => row.task_number === 2 && row.band_score !== null);
        const hasBothGrades = Boolean(task1Grade && task2Grade);
        const overallTutorBand = hasBothGrades
          ? calculateWeightedWritingBand(task1Grade.band_score, task2Grade.band_score)
          : null;

        const writingUpdateValues = [];
        const writingSetClauses = [];
        const addWritingSet = (column, value) => {
          if (!writingColumns.has(column)) return;
          writingUpdateValues.push(value);
          writingSetClauses.push(`${column} = $${writingUpdateValues.length}`);
        };
        addWritingSet('tutor_status', hasBothGrades ? 'graded' : 'pending');
        addWritingSet('overall_tutor_band', overallTutorBand);
        if (writingColumns.has('status')) {
          writingSetClauses.push(
            hasBothGrades
              ? "status = 'tutor_graded'::submission_status"
              : "status = 'pending'::submission_status"
          );
        }
        if (writingColumns.has('updated_at')) {
          writingSetClauses.push('updated_at = NOW()');
        }
        if (writingSetClauses.length > 0) {
          writingUpdateValues.push(submission.writing_group_id);
          await client.query(
            `UPDATE writing_submissions
             SET ${writingSetClauses.join(', ')}
             WHERE writing_group_id = $${writingUpdateValues.length}`,
            writingUpdateValues
          );
        }

        submission.tutorStatus = hasBothGrades ? 'graded' : 'pending';
        submission.overallTutorBand = overallTutorBand;

      } else if (type === 'speaking') {
        // 1. SELECT FOR UPDATE
        const checkQuery = `
          SELECT ss.id, ss.speaking_group_id, ss.status, ss.grader, ss.user_id, u.full_name as student_name
          FROM speaking_submissions ss
          LEFT JOIN users u ON u.id = ss.user_id
          WHERE ss.id::text = $1 OR ss.speaking_group_id::text = $1
          ORDER BY ss.part_number ASC NULLS LAST
          LIMIT 1
          FOR UPDATE OF ss
        `;
        const checkResult = await client.query(checkQuery, [submissionId]);
        if (checkResult.rowCount === 0) {
          throw new AppError('Submission not found', 404);
        }
        submission = checkResult.rows[0];
        studentId = submission.user_id;
        studentName = submission.student_name;

        if (!submission.speaking_group_id) {
          throw new AppError('Legacy submission without group ID cannot be graded via grouped API.', 400);
        }

        // 2. Check grader for all parts in the group. Re-grading updates the existing report.
        const groupQuery = `SELECT id, status, grader FROM speaking_submissions WHERE speaking_group_id = $1`;
        const groupResult = await client.query(groupQuery, [submission.speaking_group_id]);
        for (const part of groupResult.rows) {
          if (part.grader !== 'tutor') {
            throw new AppError('This Speaking submission is not assigned to tutor grading.', 409);
          }
        }

        // 3. Select representative part to store the feedback reference (usually part 1)
        const repPartQuery = `SELECT id FROM speaking_submissions WHERE speaking_group_id = $1 ORDER BY part_number ASC LIMIT 1`;
        const repPartResult = await client.query(repPartQuery, [submission.speaking_group_id]);
        const repPartId = repPartResult.rows[0].id;

        const speakingScores = {
          bandScore: payload.bandScore !== undefined && payload.bandScore !== null && payload.bandScore !== ''
            ? validateBand(payload.bandScore, 'bandScore')
            : null,
          fluencyScore: validateBand(payload.fluencyScore, 'fluencyScore'),
          lexicalScore: validateBand(payload.lexicalScore, 'lexicalScore'),
          grammarScore: validateBand(payload.grammarScore, 'grammarScore'),
          pronunciationScore: validateBand(payload.pronunciationScore, 'pronunciationScore'),
        };
        const speakingBandScore = speakingScores.bandScore ?? calcBandFromCriteria([
          speakingScores.fluencyScore,
          speakingScores.lexicalScore,
          speakingScores.grammarScore,
          speakingScores.pronunciationScore,
        ]);

        const updateFeedbackQuery = `
          UPDATE tutor_feedback_reports
          SET tutor_id = $1,
              band_score = $2,
              fluency_score = $3,
              lexical_score = $4,
              grammar_score = $5,
              pronunciation_score = $6,
              written_feedback = $7,
              updated_at = NOW()
          WHERE speaking_submission_id = $8
          RETURNING id
        `;
        const updateFeedbackResult = await client.query(updateFeedbackQuery, [
          tutorId,
          speakingBandScore,
          speakingScores.fluencyScore,
          speakingScores.lexicalScore,
          speakingScores.grammarScore,
          speakingScores.pronunciationScore,
          payload.writtenFeedback || '',
          repPartId,
        ]);

        if (updateFeedbackResult.rowCount === 0) {
          const insertFeedbackQuery = `
            INSERT INTO tutor_feedback_reports (
              tutor_id, speaking_submission_id, band_score,
              fluency_score, lexical_score, grammar_score, pronunciation_score,
              written_feedback, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          `;
          await client.query(insertFeedbackQuery, [
            tutorId,
            repPartId,
            speakingBandScore,
            speakingScores.fluencyScore,
            speakingScores.lexicalScore,
            speakingScores.grammarScore,
            speakingScores.pronunciationScore,
            payload.writtenFeedback || '',
          ]);
        }

        // 5. Update status for all parts in the group
        const updateStatusQuery = `
          UPDATE speaking_submissions 
          SET status = 'tutor_graded' 
          WHERE speaking_group_id = $1
        `;
        await client.query(updateStatusQuery, [submission.speaking_group_id]);
        submission.tutorStatus = 'graded';
        submission.overallTutorBand = speakingBandScore;

      } else {
        throw new AppError('Invalid submission type', 400);
      }

      await client.query('COMMIT');
      
      // Ghi audit log sau khi commit thành công
      try {
        await AuditLogService.logAction(
          tutorId,
          'submission_graded',
          type === 'writing' ? 'writing_submissions' : 'speaking_submissions',
          submissionId,
          null, // old_value
          { 
            reason: `Band ${payload.bandScore}`, 
            band_score: payload.bandScore,
            student_name: studentName
          }, // new_value
          ipAddress
        );
      } catch (auditErr) {
        console.error('[TutorService] Failed to insert audit log for gradeSubmission:', auditErr);
      }

      return {
        success: true,
        studentId,
        tutorStatus: submission?.tutorStatus,
        overallTutorBand: submission?.overallTutorBand,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async runAiPrelimCheck(type, submissionId, payload = {}) {
    if (type === 'speaking') {
      return this.runSpeakingAiPrelimCheck(submissionId, payload);
    }
    if (type !== 'writing') {
      throw new AppError('AI prelim check supports writing or speaking submissions only.', 400);
    }

    const taskNumber = Number(payload.taskNumber ?? payload.task_number);
    if (![1, 2].includes(taskNumber)) {
      throw new AppError('taskNumber must be 1 or 2', 400);
    }

    const targetRes = await pool.query(
      `SELECT id, writing_group_id
       FROM writing_submissions
       WHERE id::text = $1 OR writing_group_id::text = $1
       ORDER BY task_number ASC NULLS LAST
       LIMIT 1`,
      [submissionId]
    );
    if (targetRes.rows.length === 0) {
      throw new AppError('Submission not found', 404);
    }

    const target = targetRes.rows[0];
    if (!target.writing_group_id) {
      throw new AppError('Legacy Writing submission without group ID is not supported for prelim check.', 400);
    }

    const taskRes = await pool.query(
      `SELECT ws.*, mt.title AS test_title
       FROM writing_submissions ws
       LEFT JOIN mock_tests mt ON mt.id = ws.test_id
       WHERE ws.writing_group_id = $1
         AND ws.task_number = $2`,
      [target.writing_group_id, taskNumber]
    );
    if (taskRes.rows.length === 0) {
      throw new AppError('taskNumber does not belong to this submission', 400);
    }

    const task = taskRes.rows[0];
    const reportColumns = await getAiReportColumns();
    const completedReportPredicate = reportColumns.has('status')
      ? "AND COALESCE(status, 'completed') = 'completed'"
      : '';
    const reportRes = await pool.query(
      `SELECT *
       FROM ai_grading_reports
       WHERE submission_type = 'writing'
         AND submission_id = $1
         AND band_score IS NOT NULL
         ${completedReportPredicate}
       ORDER BY generated_at DESC
       LIMIT 1`,
      [task.id]
    );
    if (reportRes.rows.length > 0) {
      return formatPrelimFromReport(reportRes.rows[0], taskNumber);
    }

    const result = await gradeWriting(
      task,
      taskNumber === 1 ? 'task1' : 'task2',
      { testTitle: task.test_title }
    );
    return formatPrelimFromAiResult(taskNumber, result);
  }

  static async runSpeakingAiPrelimCheck(submissionId, payload = {}) {
    const partNumber = Number(payload.partNumber ?? payload.taskNumber ?? payload.part_number);
    const result = await gradeSpeakingGroup(submissionId, { force: true });
    const report = result.reports.find(row => row.part_number === partNumber) || result.reports[0];
    if (!report || report.status === REPORT_STATUS.FAILED) {
      throw new AppError(report?.error_message || 'Speaking AI prelim check failed.', 422, 'SPEAKING_AI_FAILED');
    }
    return formatSpeakingPrelimFromReport(report, result.reports);
  }

  static async transcribeSpeakingPart(partId) {
    const res = await pool.query('SELECT audio_url, transcript FROM speaking_submissions WHERE id = $1', [partId]);
    if (res.rows.length === 0) {
      throw new AppError('Speaking part not found', 404);
    }
    const part = res.rows[0];
    if (part.transcript) {
      return part.transcript;
    }
    
    if (!part.audio_url) {
      throw new AppError('No audio URL found for this part', 400);
    }

    const { generateTranscript } = require('./ai.service');
    const transcript = await generateTranscript(part.audio_url);
    
    await pool.query('UPDATE speaking_submissions SET transcript = $1 WHERE id = $2', [transcript, partId]);
    
    return transcript;
  }
  /**
   * Get Dashboard Stats for Tutor
   * @param {string} tutorId 
   */
  static async getDashboardStats(tutorId) {
    // 1. Graded Today
    const gradedTodayQuery = `
      SELECT COUNT(id) AS count 
      FROM tutor_feedback_reports 
      WHERE tutor_id = $1 AND created_at::date = CURRENT_DATE
    `;
    const gradedTodayResult = await pool.query(gradedTodayQuery, [tutorId]);
    const gradedToday = parseInt(gradedTodayResult.rows[0].count, 10);

    // 2. Published Tests
    const publishedTestsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE is_published = true) AS published_tests,
        COUNT(*) AS total_tests
      FROM mock_tests
    `;
    const publishedTestsResult = await pool.query(publishedTestsQuery);
    const publishedTests = parseInt(publishedTestsResult.rows[0].published_tests, 10);
    const totalTests = parseInt(publishedTestsResult.rows[0].total_tests, 10);

    // 3. Graded Chart Data (Last 7 Days)
    const gradedChartQuery = `
      SELECT 
        COUNT(tfr.id) AS count
      FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) d(date)
      LEFT JOIN tutor_feedback_reports tfr ON tfr.created_at::date = d.date::date AND tfr.tutor_id = $1
      GROUP BY d.date::date
      ORDER BY d.date::date ASC;
    `;
    const gradedChartResult = await pool.query(gradedChartQuery, [tutorId]);
    const gradedChartData = gradedChartResult.rows.map(r => parseInt(r.count, 10));

    // 4. Pending Writing Chart Data (Last 7 Days)
    const pendingWritingChartQuery = `
      SELECT 
        COUNT(DISTINCT ws.writing_group_id) AS count
      FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) d(date)
      LEFT JOIN writing_submissions ws ON ws.submitted_at::date = d.date::date AND ws.status = 'pending' AND ws.grader = 'tutor'
      GROUP BY d.date::date
      ORDER BY d.date::date ASC;
    `;
    const pendingWritingChartResult = await pool.query(pendingWritingChartQuery);
    const pendingWritingChartData = pendingWritingChartResult.rows.map(r => parseInt(r.count, 10));

    // 5. Pending Speaking Chart Data (Last 7 Days)
    const pendingSpeakingChartQuery = `
      SELECT 
        COUNT(DISTINCT ss.speaking_group_id) AS count
      FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) d(date)
      LEFT JOIN speaking_submissions ss ON ss.submitted_at::date = d.date::date AND ss.status = 'pending' AND ss.grader = 'tutor'
      GROUP BY d.date::date
      ORDER BY d.date::date ASC;
    `;
    const pendingSpeakingChartResult = await pool.query(pendingSpeakingChartQuery);
    const pendingSpeakingChartData = pendingSpeakingChartResult.rows.map(r => parseInt(r.count, 10));

    // 6. Recent Tests with daily attempts chart data
    const recentTestsQuery = `
      WITH top_tests AS (
        SELECT mt.id, mt.title, COUNT(ta.id) AS attempts_count
        FROM mock_tests mt
        LEFT JOIN test_attempts ta ON ta.test_id = mt.id
        WHERE mt.is_published = true
        GROUP BY mt.id, mt.title
        ORDER BY attempts_count DESC
        LIMIT 3
      )
      SELECT 
        t.id, t.title, t.attempts_count,
        d.date::date AS day,
        COUNT(ta.id) AS daily_attempts
      FROM top_tests t
      CROSS JOIN generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) d(date)
      LEFT JOIN test_attempts ta ON ta.test_id = t.id AND ta.submitted_at::date = d.date::date
      GROUP BY t.id, t.title, t.attempts_count, d.date::date
      ORDER BY t.attempts_count DESC, t.id, d.date::date ASC;
    `;
    const recentTestsResult = await pool.query(recentTestsQuery);
    
    const recentTestsMap = {};
    recentTestsResult.rows.forEach(row => {
      if (!recentTestsMap[row.id]) {
        recentTestsMap[row.id] = {
          id: row.id,
          title: row.title,
          attempts: parseInt(row.attempts_count, 10),
          chartData: []
        };
      }
      recentTestsMap[row.id].chartData.push(parseInt(row.daily_attempts, 10));
    });
    const recentTests = Object.values(recentTestsMap);

    return {
      gradedToday,
      publishedTests,
      totalTests,
      recentTests,
      gradedChartData,
      pendingWritingChartData,
      pendingSpeakingChartData
    };
  }

  /**
   * Get grading history statistics for the current month
   * @param {string} tutorId 
   */
  static async getGradingHistoryStats(tutorId) {
    const query = `
      SELECT 
        COUNT(tfr.id)::int AS total_graded_month,
        ROUND(AVG(tfr.band_score), 1)::numeric AS avg_band_score_month,
        (
          SELECT COUNT(id)::int
          FROM (
            SELECT ws.id FROM writing_submissions ws
            JOIN tutor_feedback_reports t ON t.writing_submission_id = ws.id
            WHERE t.tutor_id = $1 AND ws.status = 'reviewed'
            UNION ALL
            SELECT ss.id FROM speaking_submissions ss
            JOIN tutor_feedback_reports t ON t.speaking_submission_id = ss.id
            WHERE t.tutor_id = $1 AND ss.status = 'reviewed'
          ) AS complaints
        ) AS pending_complaints
      FROM tutor_feedback_reports tfr
      WHERE tfr.tutor_id = $1
        AND DATE_TRUNC('month', tfr.created_at) = DATE_TRUNC('month', CURRENT_DATE)
    `;
    const result = await pool.query(query, [tutorId]);
    return result.rows[0] || { total_graded_month: 0, avg_band_score_month: null, pending_complaints: 0 };
  }

  /**
   * Get graded submissions history with pagination
   * @param {string} tutorId 
   * @param {Object} options 
   */
  static async getGradingHistory(tutorId, options = {}) {
    const page = Math.max(1, parseInt(options.page, 10) || 1);
    const limit = Math.max(1, parseInt(options.limit, 10) || 20);
    const offset = (page - 1) * limit;
    const isExport = options.export === 'true';

    let query = `
      SELECT
          tfr.id AS report_id,
          COALESCE(ws.id, ss.id) AS submission_id,
          COALESCE(ws.writing_group_id, ss.speaking_group_id) AS group_id,
          CASE WHEN ws.id IS NOT NULL THEN 'writing' ELSE 'speaking' END AS skill,
          tfr.created_at AS graded_at,
          u.id AS student_id,
          u.full_name AS student_name,
          mt.title AS test_title,
          tfr.band_score,
          tfr.written_feedback,
          tfr.audio_feedback_url,
          COALESCE(ws.status, ss.status) AS status
      FROM tutor_feedback_reports tfr
      LEFT JOIN writing_submissions ws ON tfr.writing_submission_id = ws.id
      LEFT JOIN speaking_submissions ss ON tfr.speaking_submission_id = ss.id
      LEFT JOIN mock_tests mt ON mt.id = COALESCE(ws.test_id, ss.test_id)
      LEFT JOIN users u ON u.id = COALESCE(ws.user_id, ss.user_id)
      WHERE tfr.tutor_id = $1
      ORDER BY tfr.created_at DESC
    `;

    const countQuery = `SELECT COUNT(*)::int FROM tutor_feedback_reports WHERE tutor_id = $1`;
    const countResult = await pool.query(countQuery, [tutorId]);
    const total = countResult.rows[0].count;

    if (!isExport) {
      query += ` LIMIT $2 OFFSET $3`;
    }

    const params = isExport ? [tutorId] : [tutorId, limit, offset];
    const result = await pool.query(query, params);

    const history = result.rows.map(row => {
      const feedbackTypes = [];
      if (row.written_feedback) feedbackTypes.push('Text');
      if (row.audio_feedback_url) feedbackTypes.push('Audio feedback');

      let displayStatus = 'Đã trả điểm';
      if (row.status === 'reviewed') {
        displayStatus = 'Đang khiếu nại';
      }

      return {
        reportId: row.report_id,
        submissionId: row.submission_id,
        groupId: row.group_id,
        skill: row.skill,
        gradedAt: row.graded_at,
        studentId: row.student_id,
        studentName: row.student_name,
        testTitle: row.test_title,
        bandScore: row.band_score ? parseFloat(row.band_score) : null,
        feedbackTypes,
        status: displayStatus,
        rawStatus: row.status
      };
    });

    return {
      history,
      meta: {
        total,
        page: isExport ? 1 : page,
        limit: isExport ? total : limit,
        totalPages: isExport ? 1 : Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get specific grading history detail
   */
  static async getGradingHistoryById(tutorId, submissionId) {
    const query = `
      SELECT
          tfr.id AS report_id,
          COALESCE(ws.id, ss.id) AS submission_id,
          CASE WHEN ws.id IS NOT NULL THEN 'writing' ELSE 'speaking' END AS skill,
          tfr.created_at AS graded_at,
          u.id AS student_id,
          u.full_name AS student_name,
          u.email AS student_email,
          mt.title AS test_title,
          tfr.band_score,
          tfr.task_achievement_score,
          tfr.coherence_score,
          tfr.lexical_score,
          tfr.grammar_score,
          tfr.fluency_score,
          tfr.pronunciation_score,
          tfr.written_feedback,
          tfr.audio_feedback_url,
          COALESCE(ws.status, ss.status) AS status
      FROM tutor_feedback_reports tfr
      LEFT JOIN writing_submissions ws ON tfr.writing_submission_id = ws.id
      LEFT JOIN speaking_submissions ss ON tfr.speaking_submission_id = ss.id
      LEFT JOIN mock_tests mt ON mt.id = COALESCE(ws.test_id, ss.test_id)
      LEFT JOIN users u ON u.id = COALESCE(ws.user_id, ss.user_id)
      WHERE tfr.tutor_id = $1 AND (ws.id = $2 OR ss.id = $2)
    `;
    const result = await pool.query(query, [tutorId, submissionId]);
    if (!result.rows[0]) throw new Error('Không tìm thấy bài chấm');

    const row = result.rows[0];
    const feedbackTypes = [];
    if (row.written_feedback) feedbackTypes.push('Text');
    if (row.audio_feedback_url) feedbackTypes.push('Audio feedback');

    return {
      reportId: row.report_id,
      submissionId: row.submission_id,
      skill: row.skill,
      time: new Date(row.graded_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      date: new Date(row.graded_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      studentId: row.student_id,
      studentName: row.student_name || 'N/A',
      studentCode: row.student_id ? row.student_id.substring(0, 8) : 'N/A',
      testName: row.test_title || 'N/A',
      band: row.band_score ? parseFloat(row.band_score) : null,
      scores: {
        taskAchievement: row.task_achievement_score,
        coherence: row.coherence_score,
        lexical: row.lexical_score,
        grammar: row.grammar_score,
        fluency: row.fluency_score,
        pronunciation: row.pronunciation_score
      },
      feedbackTypes,
      writtenFeedback: row.written_feedback,
      audioFeedbackUrl: row.audio_feedback_url,
      status: row.status === 'reviewed' ? 'disputed' : 'graded'
    };
  }

  /**
   * Revoke grading result
   */
  static async revokeGradingResult(tutorId, submissionId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const checkQuery = `
        SELECT tfr.id, tfr.writing_submission_id, tfr.speaking_submission_id, u.full_name as student_name
        FROM tutor_feedback_reports tfr
        LEFT JOIN writing_submissions ws ON tfr.writing_submission_id = ws.id
        LEFT JOIN speaking_submissions ss ON tfr.speaking_submission_id = ss.id
        LEFT JOIN users u ON u.id = COALESCE(ws.user_id, ss.user_id)
        WHERE tfr.tutor_id = $1 AND (tfr.writing_submission_id = $2 OR tfr.speaking_submission_id = $2)
      `;
      const checkResult = await client.query(checkQuery, [tutorId, submissionId]);
      if (checkResult.rows.length === 0) {
        throw new Error('Không tìm thấy bài chấm hoặc không có quyền thu hồi');
      }

      const report = checkResult.rows[0];

      if (report.writing_submission_id) {
        await client.query(`
          UPDATE writing_submissions 
          SET status = 'pending' 
          WHERE writing_group_id = (SELECT writing_group_id FROM writing_submissions WHERE id = $1)
        `, [submissionId]);
      } else if (report.speaking_submission_id) {
        await client.query(`
          UPDATE speaking_submissions 
          SET status = 'pending' 
          WHERE speaking_group_id = (SELECT speaking_group_id FROM speaking_submissions WHERE id = $1)
        `, [submissionId]);
      }

      await client.query(`DELETE FROM tutor_feedback_reports WHERE id = $1`, [report.id]);

      const AuditLogService = require('./audit.service');
      try {
        await AuditLogService.logAction(
          tutorId,
          'submission_revoked',
          'tutor_feedback_reports',
          report.id,
          null,
          { 
            reason: `Thu hồi bài chấm`, 
            submission_id: submissionId,
            skill: report.writing_submission_id ? 'writing' : 'speaking',
            student_name: report.student_name
          },
          null
        );
      } catch (logErr) {
        console.warn('Failed to log submission_revoked:', logErr.message);
      }

      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
    
  /**
   * Update grading result
   */
  static async updateGradingResult(tutorId, submissionId, payload) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const checkQuery = `
        SELECT tfr.id, tfr.writing_submission_id, tfr.speaking_submission_id, u.full_name as student_name
        FROM tutor_feedback_reports tfr
        LEFT JOIN writing_submissions ws ON tfr.writing_submission_id = ws.id
        LEFT JOIN speaking_submissions ss ON tfr.speaking_submission_id = ss.id
        LEFT JOIN users u ON u.id = COALESCE(ws.user_id, ss.user_id)
        WHERE tfr.tutor_id = $1 AND (tfr.writing_submission_id = $2 OR tfr.speaking_submission_id = $2)
      `;
      const checkResult = await client.query(checkQuery, [tutorId, submissionId]);
      if (checkResult.rows.length === 0) {
        throw new Error('Không tìm thấy bài chấm hoặc không có quyền cập nhật');
      }

      const report = checkResult.rows[0];

      const updateQuery = `
        UPDATE tutor_feedback_reports 
        SET 
          band_score = $1,
          task_achievement_score = COALESCE($2, task_achievement_score),
          coherence_score = COALESCE($3, coherence_score),
          lexical_score = COALESCE($4, lexical_score),
          grammar_score = COALESCE($5, grammar_score),
          fluency_score = COALESCE($6, fluency_score),
          pronunciation_score = COALESCE($7, pronunciation_score),
          written_feedback = COALESCE($8, written_feedback),
          updated_at = NOW()
        WHERE id = $9
      `;
      await client.query(updateQuery, [
        payload.bandScore,
        payload.taskAchievementScore,
        payload.coherenceScore,
        payload.lexicalScore,
        payload.grammarScore,
        payload.fluencyScore,
        payload.pronunciationScore,
        payload.writtenFeedback,
        report.id
      ]);

      await client.query('COMMIT');

      const AuditLogService = require('./audit.service');
      try {
        await AuditLogService.logAction(
          tutorId,
          'submission_regraded',
          'tutor_feedback_reports',
          report.id,
          null,
          { 
            reason: `Band ${payload.bandScore}`, 
            band_score: payload.bandScore,
            submission_id: submissionId,
            skill: report.writing_submission_id ? 'writing' : 'speaking',
            student_name: report.student_name
          },
          null
        );
      } catch (logErr) {
        console.warn('Failed to log submission_regraded:', logErr.message);
      }
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get Activity Log Stats for Tutor
   */
  static async getActivityLogStats(tutorId) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // TEMPORARY FIX: Apply missing migration 018
    try {
      await pool.query(`
        ALTER TYPE log_action ADD VALUE IF NOT EXISTS 'submission_graded';
        ALTER TYPE log_action ADD VALUE IF NOT EXISTS 'submission_drafted';
        ALTER TYPE log_action ADD VALUE IF NOT EXISTS 'private_note_added';
      `);
      
      // BACKFILL missing logs
      await pool.query(`
        INSERT INTO audit_logs (actor_id, action, target_table, target_id, new_value, ip_address)
        SELECT 
          tutor_id, 
          'submission_graded', 
          CASE WHEN writing_submission_id IS NOT NULL THEN 'writing_submissions' ELSE 'speaking_submissions' END,
          COALESCE(writing_submission_id, speaking_submission_id),
          jsonb_build_object('reason', 'Band ' || band_score, 'band_score', band_score),
          NULL
        FROM tutor_feedback_reports tfr
        WHERE NOT EXISTS (
          SELECT 1 FROM audit_logs al 
          WHERE al.actor_id = tfr.tutor_id 
          AND al.action = 'submission_graded' 
          AND al.target_id = COALESCE(tfr.writing_submission_id, tfr.speaking_submission_id)
        )
      `);
      
      // BACKFILL missing test_updated logs based on mock_tests updated_at > created_at
      await pool.query(`
        INSERT INTO audit_logs (actor_id, action, target_table, target_id, new_value, ip_address, created_at)
        SELECT 
          created_by, 
          'test_updated', 
          'mock_tests',
          id,
          jsonb_build_object('title', title, 'skill', skill),
          NULL,
          updated_at
        FROM mock_tests mt
        WHERE updated_at > created_at
        AND NOT EXISTS (
          SELECT 1 FROM audit_logs al 
          WHERE al.target_id = mt.id 
          AND al.action = 'test_updated'
        )
      `);
    } catch (err) {
      console.error('Error applying migration 018:', err);
    }

    const query = `
      SELECT 
        (SELECT COUNT(*)::int FROM audit_logs WHERE actor_id = $1 AND created_at >= $2) as today_actions,
        (SELECT COUNT(*)::int FROM audit_logs WHERE actor_id = $1 AND action = 'submission_graded' AND created_at >= NOW() - INTERVAL '7 days') as graded_week,
        (SELECT COUNT(*)::int FROM audit_logs WHERE actor_id = $1 AND action IN ('test_created', 'test_updated', 'test_deleted', 'resource_uploaded', 'resource_reviewed', 'test_reviewed')) as content_updates
    `;
    const result = await pool.query(query, [tutorId, todayStart.toISOString()]);
    return result.rows[0] || { today_actions: 0, graded_week: 0, content_updates: 0 };
  }

  /**
   * Get list of AI-graded writing submissions for tutor reference.
   * Includes both successful and failed AI grading reports.
   */
  static async getAiReferenceList(filters = {}) {
    const params = [];
    let whereExtra = '';
    const [reportColumns, writingColumns] = await Promise.all([
      getAiReportColumns(),
      getTableColumns(pool, 'writing_submissions'),
    ]);
    const hasReportStatus = reportColumns.has('status');
    const hasErrorMessage = reportColumns.has('error_message');
    const reportStatusSelect = hasReportStatus
      ? 'agr.status AS ai_report_status'
      : 'NULL::text AS ai_report_status';
    const errorMessageSelect = hasErrorMessage
      ? 'agr.error_message'
      : 'NULL::text AS error_message';
    const failedPredicates = [
      hasReportStatus ? "(ws.status = 'pending' AND agr.status = 'failed')" : null,
      hasErrorMessage ? '(ws.status = \'pending\' AND agr.error_message IS NOT NULL)' : null,
    ].filter(Boolean);
    const failedWhere = failedPredicates.length
      ? `OR ${failedPredicates.join(' OR ')}`
      : '';
    const overallAiBandSelect = writingColumns.has('overall_ai_band')
      ? 'ws.overall_ai_band'
      : 'NULL::numeric AS overall_ai_band';

    if (filters.search) {
      params.push(`%${filters.search}%`);
      whereExtra += ` AND u.full_name ILIKE $${params.length}`;
    }

    const query = `
      SELECT
        ws.id AS submission_id,
        ws.writing_group_id,
        ws.user_id AS student_id,
        u.full_name AS student_name,
        mt.title AS test_title,
        ws.task_number,
        ws.submitted_at,
        ws.status::text AS submission_status,
        ${overallAiBandSelect},
        agr.band_score AS ai_band,
        ${reportStatusSelect},
        ${errorMessageSelect},
        agr.generated_at
      FROM writing_submissions ws
      JOIN users u ON u.id = ws.user_id
      LEFT JOIN mock_tests mt ON mt.id = ws.test_id
      LEFT JOIN (
        SELECT DISTINCT ON (submission_id) *
        FROM ai_grading_reports
        WHERE submission_type = 'writing'
        ORDER BY submission_id,
                 CASE WHEN band_score IS NOT NULL THEN 0 ELSE 1 END,
                 generated_at DESC
      ) agr
        ON agr.submission_id = ws.id
      WHERE ws.grader = 'ai'
        AND (
          ws.status = 'ai_graded'
          ${failedWhere}
        )
        ${whereExtra}
      ORDER BY ws.submitted_at DESC`;

    const { rows } = await pool.query(query, params);
    const grouped = new Map();

    for (const row of rows) {
      const groupId = row.writing_group_id || row.submission_id;
      if (!grouped.has(groupId)) {
        grouped.set(groupId, {
          submissionId: groupId,
          studentId: row.student_id,
          studentName: row.student_name,
          testTitle: row.test_title,
          submittedAt: row.submitted_at,
          submissionStatus: row.submission_status,
          aiBand: isValidHalfBandScore(row.overall_ai_band) ? parseFloat(row.overall_ai_band) : null,
          reportStatus: null,
          errorMessage: null,
          generatedAt: row.generated_at,
          tasks: [],
        });
      }

      const item = grouped.get(groupId);
      const taskBand = row.ai_band ? parseFloat(row.ai_band) : null;
      const taskStatus = row.ai_report_status || (taskBand !== null ? REPORT_STATUS.COMPLETED : null);
      item.tasks.push({
        submissionId: row.submission_id,
        taskNumber: row.task_number,
        aiBand: taskBand,
        reportStatus: taskStatus,
        errorMessage: row.error_message,
      });
      if (!item.errorMessage && row.error_message) item.errorMessage = row.error_message;
      if (!item.generatedAt || (row.generated_at && row.generated_at > item.generatedAt)) {
        item.generatedAt = row.generated_at;
      }
    }

    return Array.from(grouped.values()).map((item) => {
      const task1 = item.tasks.find(task => Number(task.taskNumber) === 1);
      const task2 = item.tasks.find(task => Number(task.taskNumber) === 2);
      const calculatedBand = calculateDisplayWritingBand(task1?.aiBand, task2?.aiBand);
      const hasFailed = item.tasks.some(task => task.reportStatus === REPORT_STATUS.FAILED || task.errorMessage);
      const hasCompleted = item.tasks.length > 0
        && item.tasks.every(task => task.reportStatus === REPORT_STATUS.COMPLETED || task.aiBand !== null);

      return {
        ...item,
        aiBand: item.aiBand ?? calculatedBand,
        reportStatus: hasFailed
          ? REPORT_STATUS.FAILED
          : (hasCompleted ? REPORT_STATUS.COMPLETED : null),
        taskLabel: item.tasks
          .sort((a, b) => Number(a.taskNumber) - Number(b.taskNumber))
          .map(task => `Task ${task.taskNumber}`)
          .join(' + '),
      };
    });
  }

  /**
   * Get detailed AI-graded submission for tutor reference.
   * Read-only — tutor cannot modify AI feedback.
   */
  static async getAiReferenceDetail(submissionId) {
    const targetQuery = `
      SELECT ws.id, ws.writing_group_id
      FROM writing_submissions ws
      WHERE (ws.id::text = $1 OR ws.writing_group_id::text = $1)
        AND ws.grader = 'ai'
      ORDER BY ws.task_number ASC NULLS LAST
      LIMIT 1`;

    const { rows: targetRows } = await pool.query(targetQuery, [submissionId]);
    if (targetRows.length === 0) return null;

    const target = targetRows[0];
    const tasksQuery = `
      SELECT ws.*, mt.title AS test_title,
             u.full_name AS student_name
      FROM writing_submissions ws
      LEFT JOIN mock_tests mt ON mt.id = ws.test_id
      JOIN users u ON u.id = ws.user_id
      WHERE ws.grader = 'ai'
        AND (
          ($1::uuid IS NOT NULL AND ws.writing_group_id = $1::uuid)
          OR ws.id = $2::uuid
        )
      ORDER BY ws.task_number ASC`;

    const { rows: taskRows } = await pool.query(
      tasksQuery, [target.writing_group_id, target.id]
    );
    if (taskRows.length === 0) return null;

    const taskIds = taskRows.map(task => task.id);
    const reportQuery = `
      SELECT DISTINCT ON (submission_id) *
      FROM ai_grading_reports
      WHERE submission_type = 'writing'
        AND submission_id = ANY($1::uuid[])
      ORDER BY submission_id,
               CASE WHEN band_score IS NOT NULL THEN 0 ELSE 1 END,
               generated_at DESC`;

    const { rows: reportRows } = await pool.query(reportQuery, [taskIds]);
    const reportBySubmission = new Map(reportRows.map(report => [report.submission_id, report]));
    const first = taskRows[0];
    const tasks = taskRows.map(task => ({
      submissionId: task.id,
      studentId: task.user_id,
      studentName: task.student_name,
      testTitle: task.test_title,
      taskNumber: task.task_number,
      promptText: task.prompt_text,
      responseText: task.response_text,
      wordCount: task.word_count ?? countWords(task.response_text),
      submittedAt: task.submitted_at,
      status: task.status,
      grader: task.grader,
      aiReport: reportBySubmission.get(task.id) || null,
    }));
    const task1 = tasks.find(task => Number(task.taskNumber) === 1);
    const task2 = tasks.find(task => Number(task.taskNumber) === 2);
    const task1Band = task1?.aiReport?.band_score ? parseFloat(task1.aiReport.band_score) : null;
    const task2Band = task2?.aiReport?.band_score ? parseFloat(task2.aiReport.band_score) : null;
    const calculatedOverall = calculateDisplayWritingBand(task1Band, task2Band);

    return {
      submission: {
        id: first.writing_group_id || first.id,
        studentId: first.user_id,
        studentName: first.student_name,
        testTitle: first.test_title,
        submittedAt: first.submitted_at,
        status: first.status,
        grader: first.grader,
      },
      tasks,
      overallAiBand: isValidHalfBandScore(first.overall_ai_band)
        ? parseFloat(first.overall_ai_band)
        : calculatedOverall,
      aiReport: tasks[0]?.aiReport || null,
    };
  }
}

module.exports = TutorService;
