const { pool } = require('../db/pool');
const { getBandScore } = require('../utils/scoring');
const TestService = require('./test.service');
const AppError = require('../utils/AppError');
const fs = require('fs');
const path = require('path');

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

  static async submitSpeaking(userId, testId, partNumber, tempS3Key, grader) {
    if (testId) {
      try {
        const testRes = await pool.query('SELECT id FROM mock_tests WHERE id = $1', [testId]);
        if (testRes.rows.length === 0) {
          throw new AppError('Test not found', 404, 'TEST_NOT_FOUND');
        }
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError('Invalid test ID format', 400, 'INVALID_TEST_ID');
      }
    }

    const filename = path.basename(tempS3Key);
    const tempPath = path.join(__dirname, '../../uploads/temp_audio', userId, filename);
    try {
      await fs.promises.access(tempPath, fs.constants.F_OK);
    } catch (e) {
      throw new AppError('Temp audio file not found or you do not have permission', 404, 'TEMP_AUDIO_NOT_FOUND');
    }

    const finalDir = path.join(__dirname, '../../uploads/speaking', userId);
    if (!fs.existsSync(finalDir)) {
      fs.mkdirSync(finalDir, { recursive: true });
    }
    const finalPath = path.join(finalDir, filename);
    const relativeFinalPath = `/uploads/speaking/${userId}/${filename}`;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const insertRes = await client.query(
        `INSERT INTO speaking_submissions (user_id, test_id, part_number, audio_url, grader, status) VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
        [userId, testId, partNumber, relativeFinalPath, grader]
      );
      const submission = insertRes.rows[0];
      await fs.promises.rename(tempPath, finalPath);
      await client.query('COMMIT');
      return submission;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
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

  static async createAttempt(userId, testId) {
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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const insertRes = await client.query(
        `INSERT INTO speaking_attempts (user_id, test_id, status) VALUES ($1, $2, 'in_progress') RETURNING id, status`,
        [userId, normalizedTestId]
      );
      await client.query('COMMIT');
      return insertRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw mapSpeakingDbError(err);
    } finally {
      client.release();
    }
  }

  static async getFeedback(id, userId, type) {
    if (type !== 'speaking' && type !== 'writing') {
      throw new AppError('type must be speaking or writing', 400, 'INVALID_FIELD');
    }
    const submissionTable = type === 'speaking' ? 'speaking_submissions' : 'writing_submissions';
    const subRes = await pool.query(
      `SELECT * FROM ${submissionTable} WHERE id = $1 AND user_id = $2`,
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
      'SELECT * FROM ai_grading_reports WHERE submission_id = $1 AND submission_type = $2',
      [id, type]
    );
    if (aiRes.rows.length > 0) report.ai_report = aiRes.rows[0];
    const tutorRes = await pool.query(
      'SELECT * FROM tutor_grading_reports WHERE submission_id = $1 AND submission_type = $2',
      [id, type]
    );
    if (tutorRes.rows.length > 0) report.tutor_report = tutorRes.rows[0];
    return report;
  }
}

module.exports = SubmissionService;