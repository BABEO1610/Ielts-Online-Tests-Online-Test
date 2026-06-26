const { pool } = require('../db/pool');
const { getBandScore } = require('../utils/scoring');
const TestService = require('./test.service');
const AppError = require('../utils/AppError');
const supabase = require('../config/supabase');

const SUPABASE_BUCKET = process.env.SUPABASE_SPEAKING_BUCKET || 'speaking-audio';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeOptionalUuid = (value) => {
  if (!value) return null;
  const text = String(value);
  return UUID_REGEX.test(text) ? text : null;
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
        `INSERT INTO test_attempts (user_id, test_id, mode, submitted_at, band_score) VALUES ($1, $2, 'timed', NOW(), $3) RETURNING id`,
        [userId, testId, bandScore]
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
    const normalizedTestId = normalizeOptionalUuid(testId);
    if (normalizedTestId) {
      try {
        const testRes = await pool.query('SELECT id FROM mock_tests WHERE id = $1', [normalizedTestId]);
        if (testRes.rows.length === 0) {
          throw new AppError('Speaking test not found', 404, 'TEST_NOT_FOUND');
        }
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError('Invalid test ID format', 400, 'INVALID_TEST_ID');
      }
    }

    const { randomUUID } = require('crypto');
    const speakingGroupId = randomUUID();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const insertedParts = [];
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
      return { speaking_group_id: speakingGroupId, parts: insertedParts };
    } catch (err) {
      await client.query('ROLLBACK');
      throw mapSpeakingDbError(err);
    } finally {
      client.release();
    }
  }

  static async submitWriting(userId, data) {
    const { test_id, task_number, prompt_text, response_text, grader } = data;
    const query = `
      INSERT INTO writing_submissions (user_id, test_id, task_number, prompt_text, response_text, grader, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING id, status, submitted_at
    `;
    const result = await pool.query(query, [userId, test_id, task_number, prompt_text, response_text, grader]);
    return result.rows[0];
  }

  static async submitFullWriting(userId, testId, grader, tasks) {
    const normalizedTestId = normalizeOptionalUuid(testId);
    if (normalizedTestId) {
      try {
        const testRes = await pool.query('SELECT id FROM mock_tests WHERE id = $1', [normalizedTestId]);
        if (testRes.rows.length === 0) {
          throw new AppError('Writing test not found', 404, 'TEST_NOT_FOUND');
        }
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError('Invalid test ID format', 400, 'INVALID_TEST_ID');
      }
    }

    const { v4: uuidv4 } = require('uuid');
    const writingGroupId = uuidv4();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      
      const insertedTasks = [];
      for (const task of tasks) {
        const insertRes = await client.query(
          `INSERT INTO writing_submissions (user_id, test_id, task_number, prompt_text, response_text, grader, status, writing_group_id)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7) RETURNING *`,
          [userId, normalizedTestId, task.task_number, task.prompt_text, task.response_text, grader, writingGroupId]
        );
        insertedTasks.push(insertRes.rows[0]);
      }

      await client.query('COMMIT');
      return { writing_group_id: writingGroupId, tasks: insertedTasks };
    } catch (err) {
      await client.query('ROLLBACK');
      throw new AppError('Database error while submitting writing', 500, 'DB_ERROR');
    } finally {
      client.release();
    }
  }

  static async getSpeakingAudioUrl(submissionId, user) {
    const params = [submissionId];
    let query = 'SELECT id, user_id, audio_url FROM speaking_submissions WHERE id = $1';

    if (user.role === 'student') {
      params.push(user.id);
      query += ' AND user_id = $2';
    } else if (!['tutor', 'admin'].includes(user.role)) {
      throw new AppError('You do not have permission to access this audio', 403, 'AUTH_PERM_001');
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      throw new AppError('Speaking submission audio not found', 404, 'AUDIO_NOT_FOUND');
    }

    const audioUrl = toPublicSpeakingAudioUrl(result.rows[0].audio_url);
    if (!audioUrl) {
      throw new AppError('Speaking submission has no audio', 404, 'AUDIO_NOT_FOUND');
    }

    return audioUrl;
  }



  /**
   * Get student submission history
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  static async getHistory(userId) {
    const query = `
      SELECT 
        ws.writing_group_id::text AS id,
        'writing' AS type,
        NULL::int AS task_number,
        NULL::int AS part_number,
        MIN(ws.submitted_at) AS submitted_at,
        MIN(ws.status::text) AS status,
        MIN(ws.grader::text) AS grader,
        MAX(COALESCE(tfr.band_score, agr.band_score)) AS band_score,
        MIN(mt.title) AS test_title
      FROM writing_submissions ws
      LEFT JOIN tutor_feedback_reports tfr ON ws.id = tfr.writing_submission_id
      LEFT JOIN ai_grading_reports agr ON ws.id = agr.submission_id AND agr.submission_type = 'writing'
      LEFT JOIN mock_tests mt ON mt.id = ws.test_id
      WHERE ws.user_id = $1
      GROUP BY ws.writing_group_id

      UNION ALL

      SELECT 
        ss.speaking_group_id::text AS id,
        'speaking' AS type,
        NULL::int AS task_number,
        NULL::int AS part_number,
        MIN(ss.submitted_at) AS submitted_at,
        MIN(ss.status::text) AS status,
        MIN(ss.grader::text) AS grader,
        MAX(COALESCE(tfr.band_score, agr.band_score)) AS band_score,
        MIN(mt.title) AS test_title
      FROM speaking_submissions ss
      LEFT JOIN tutor_feedback_reports tfr ON ss.id = tfr.speaking_submission_id
      LEFT JOIN ai_grading_reports agr ON ss.id = agr.submission_id AND agr.submission_type = 'speaking'
      LEFT JOIN mock_tests mt ON mt.id = ss.test_id
      WHERE ss.user_id = $1
      GROUP BY ss.speaking_group_id

      ORDER BY submitted_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows.map(row => ({
      id: row.id,
      type: row.type,
      task_number: row.task_number,
      part_number: row.part_number,
      submitted_at: row.submitted_at,
      status: row.status,
      grader: row.grader,
      band_score: row.band_score ? parseFloat(row.band_score) : null,
      testTitle: row.test_title
    }));
  }

  static async getFeedback(id, userId, type) {
    if (type !== 'speaking' && type !== 'writing') {
      throw new AppError('type must be speaking or writing', 400, 'INVALID_FIELD');
    }
    const submissionTable = type === 'speaking' ? 'speaking_submissions' : 'writing_submissions';
    const groupCol = type === 'speaking' ? 'speaking_group_id' : 'writing_group_id';
    
    // Support either legacy id or new group id
    const subRes = await pool.query(
      `SELECT * FROM ${submissionTable} WHERE (${groupCol}::text = $1 OR id::text = $1) AND user_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [id, userId]
    );
    if (subRes.rows.length === 0) {
      throw new AppError('Submission not found', 404, 'NOT_FOUND');
    }
    const submission = subRes.rows[0];
    if (submission.status === 'pending') {
      return { status: 'pending', message: 'Bai dang duoc cham, vui long cho...' };
    }
    let report = {};
    const aiRes = await pool.query(
      `SELECT * FROM ai_grading_reports WHERE submission_id = $1 AND submission_type = $2`,
      [submission.id, type]
    );
    if (aiRes.rows.length > 0) report.ai_report = aiRes.rows[0];
    
    // For tutor reports, check submission_id but fallback to repTaskId if it's stored differently
    const tutorRes = await pool.query(
      `SELECT * FROM tutor_feedback_reports WHERE ${type === 'speaking' ? 'speaking_submission_id' : 'writing_submission_id'} IN (SELECT id FROM ${submissionTable} WHERE ${groupCol}::text = $1 OR id::text = $1)`,
      [id]
    );
    if (tutorRes.rows.length > 0) report.tutor_report = tutorRes.rows[0];
    return report;
  }
}

module.exports = SubmissionService;