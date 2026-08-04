const { pool } = require('../db/pool');
const { getBandScore } = require('../utils/scoring');

/**
 * Normalize a fill-in-blank answer for grading.
 * Spec: trim + lowercase + remove leading/trailing punctuation + exact match.
 * NO fuzzy matching.
 * (Hàm normalizeAnswer: Loại bỏ khoảng trắng 2 đầu -> Chuyển thành chữ thường -> Xóa các dấu câu ở 2 đầu -> Gộp khoảng trắng thừa ở giữa thành 1 khoảng trắng duy nhất)
 */
function normalizeAnswer(answer) {
  if (!answer) return '';
  return answer
    .trim()
    .toLowerCase()
    .replace(/^[.,;:!?'"\-\s]+|[.,;:!?'"\-\s]+$/g, '') // strip leading/trailing punctuation
    .replace(/\s+/g, ' ')                                 // collapse internal spaces
    .trim();
}

/**
 * Check if user answer is correct.
 * - MCQ: exact label match ("A" === "A") after normalizing.
 * - Fill-in-blank: normalized exact match. Supports correct_answers JSONB array.
 * NO fuzzy matching.
 * 1. Hàm isAnswerCorrect (Quy tắc chấm điểm): Xử lý JSONB Parsing, Multiple accepted answers và Exact Match.
 */
function isAnswerCorrect(userAnswer, correctAnswer, correctAnswers) {
  const normalized = normalizeAnswer(userAnswer);
  if (normalized === '') return false; // unanswered = wrong

  // Multiple accepted answers (JSONB array)?
  if (Array.isArray(correctAnswers) && correctAnswers.length > 0) {
    return correctAnswers.some((ca) => normalizeAnswer(String(ca)) === normalized);
  }

  if (!correctAnswer) return false;
  return normalizeAnswer(String(correctAnswer)) === normalized;
}

class AttemptService {
  /**
   * Submit a test attempt.
   *
   * Schema used (from 009_create_tests_schema.sql):
   *   mock_tests → test_passages (passage_number) → question_blocks → questions
   *   questions columns: id, test_id, block_id, question_order, question_text,
   *                      options (jsonb), correct_answer, correct_answers (jsonb), explanation
   *
   * IDOR: userId always from req.user.id (JWT), never from body.
   * Transaction: BEGIN → insert test_attempts → insert attempt_answers → COMMIT/ROLLBACK
   * 
   * (Nhiệm vụ 1: Verify test exists (Throw 404 nếu không có)
   * Nhiệm vụ 2: Lấy toàn bộ câu hỏi và sort ORDER BY q.question_order ASC
   * Nhiệm vụ 3: Grading Loop - Dùng normalizeAnswer và isAnswerCorrect để chấm
   * Nhiệm vụ 4: Scoring - Cộng rawScore, tính scale quy đổi 40 câu, tính Band Score
   * Nhiệm vụ 5: Mở Transaction lưu vào bảng test_attempts và attempt_answers)
   *
   * @param {string} testId
   * @param {string} userId      - from JWT, not request body
   * @param {Object} answers     - { [questionOrder]: answerString }
   * @param {number} timeSpent   - seconds
   * @param {boolean} practiceMode - true = untimed practice (still saved to DB with practice_mode=true)
   */
  static async submitAttempt(testId, userId, answers = {}, timeSpent = 0, practiceMode = false) {
    // BƯỚC 1: Kiểm tra tính hợp lệ (Verify Test). Tránh lỗi chấm nhầm mã đề.
    const testRes = await pool.query(
      `SELECT id, title, skill FROM mock_tests WHERE id = $1`,
      [testId]
    );
    if (testRes.rows.length === 0) {
      const err = new Error('Test not found');
      err.statusCode = 404;
      throw err;
    }

    // BƯỚC 2: Rút ruột Database (Fetch Questions). Ép buộc sắp xếp theo question_order ASC để chấm đúng thứ tự.
    //    Schema: questions.test_id = mock_tests.id (set in createReadingTest)
    const questionsRes = await pool.query(
      `SELECT
         q.id,
         q.question_order,
         q.correct_answer,
         q.correct_answers
       FROM questions q
       WHERE q.test_id = $1
       ORDER BY q.question_order ASC`,
      [testId]
    );
    const questions = questionsRes.rows;

    if (questions.length === 0) {
      const err = new Error('Đề thi chưa có câu hỏi nào');
      err.statusCode = 400;
      throw err;
    }

    // BƯỚC 3: Vòng lặp Chấm điểm (Grading Loop). Lấy DB làm gốc để chống gian lận (thiếu câu/chèn câu).
    let rawScore = 0;
    const gradedAnswers = questions.map((q) => {
      const userAnswer = answers[q.question_order] || '';

      // Xử lý Dữ liệu Đa đáp án (JSONB Parsing): Khối try-catch cứu nguy lỗi ép kiểu String của PostgreSQL.
      let correctAnswersParsed = [];
      if (q.correct_answers) {
        try {
          correctAnswersParsed = typeof q.correct_answers === 'string'
            ? JSON.parse(q.correct_answers)
            : q.correct_answers;
        } catch {
          correctAnswersParsed = [];
        }
      }

      const correct = isAnswerCorrect(userAnswer, q.correct_answer, correctAnswersParsed);
      if (correct) rawScore++;

      return {
        questionId: q.id,
        questionOrder: q.question_order,
        userAnswer: userAnswer || null,
        isCorrect: correct,
        correctAnswer: q.correct_answer,
      };
    });

    // BƯỚC 4: Quy đổi Band Score (Scoring). Kỹ thuật Dynamic Scaling xử lý hoàn hảo các đề thi thiếu câu hoặc Mini-test.
    const totalQuestions = questions.length || 40;
    const normalizedRawScore = Math.min(rawScore, 40);
    const scaledRawScore = totalQuestions > 0 ? Math.round((normalizedRawScore / totalQuestions) * 40) : 0;
    const bandScore = getBandScore(testRes.rows[0].skill, scaledRawScore);

    // BƯỚC 5: Lưu trữ An toàn (Database Transaction). Bắt buộc dùng BEGIN/COMMIT để đảm bảo tính Toàn vẹn dữ liệu (Data Integrity). Tránh rác DB nếu rớt mạng.
    //    Tables: test_attempts, attempt_answers (from 013 + 014 migrations)
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Determine mode value for the enum column test_mode ('timed' | 'untimed')
      const mode = practiceMode ? 'untimed' : 'timed';
      
      const isObjective = testRes.rows[0].skill === 'reading' || testRes.rows[0].skill === 'listening';
      const finalStatus = isObjective ? 'graded' : 'submitted';
      const finalBandScore = isObjective ? bandScore : null;

      // 5.1 Tạo "Tờ bìa hồ sơ" (Bảng test_attempts) và dùng RETURNING id để lấy khóa chính
      const attemptRes = await client.query(
        `INSERT INTO test_attempts
           (test_id, user_id, mode, status, raw_score, total_questions, band_score, time_spent, practice_mode, submitted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         RETURNING id`,
        [testId, userId, mode, finalStatus, rawScore, totalQuestions, finalBandScore, timeSpent, practiceMode]
      );
      const attemptId = attemptRes.rows[0].id;

      // 5.2 Kẹp "Giấy làm bài" vào Hồ sơ (Bảng attempt_answers) thông qua Khóa ngoại (attemptId)
      for (const ans of gradedAnswers) {
        await client.query(
          `INSERT INTO attempt_answers
             (attempt_id, question_id, question_order, user_answer, is_correct, correct_answer)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [attemptId, ans.questionId, ans.questionOrder, ans.userAnswer, ans.isCorrect, ans.correctAnswer]
        );
      }

      await client.query('COMMIT');

      return {
        attemptId,
        status: finalStatus,
        rawScore,
        totalQuestions,
        bandScore: finalBandScore,
        correctCount: rawScore,
        incorrectCount: totalQuestions - rawScore,
        timeSpent,
        practiceMode,
        message: isObjective ? 'Bài làm của bạn đã được nộp và tự động chấm điểm.' : 'Bài làm của bạn đã được nộp. Vui lòng chờ giáo viên chấm điểm.'
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get attempt summary by attemptId.
   * IDOR: filters by user_id from JWT.
   *
   * Joins: test_attempts → mock_tests
   * (Truy vấn 1 dòng duy nhất lấy điểm số và meta data)
   */
  static async getAttemptById(attemptId, userId) {
    const res = await pool.query(
      `SELECT
         ta.id,
         ta.test_id,
         ta.raw_score,
         ta.total_questions,
         ta.band_score,
         ta.time_spent,
         ta.practice_mode,
         ta.submitted_at,
         mt.title       AS test_title,
         mt.skill,
         mt.difficulty
       FROM test_attempts ta
       JOIN mock_tests mt ON ta.test_id = mt.id
       WHERE ta.id = $1 AND ta.user_id = $2`,
      [attemptId, userId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    return {
      id: row.id,
      testId: row.test_id,
      testTitle: row.test_title,
      skill: row.skill,
      difficulty: row.difficulty,
      rawScore: row.raw_score,
      totalQuestions: row.total_questions,
      bandScore: parseFloat(row.band_score),
      correctCount: row.raw_score,
      incorrectCount: row.total_questions - row.raw_score,
      timeSpent: row.time_spent,
      practiceMode: row.practice_mode,
      submittedAt: row.submitted_at,
    };
  }

  /**
   * Get per-question breakdown for an attempt.
   * IDOR: first verifies ownership via ta.user_id = userId.
   *
   * Joins: attempt_answers → questions (for question_text, explanation)
   * Schema: questions.question_text (col name in 009_create_tests_schema.sql)
   * (Thực hiện Heavy JOIN kết nối attempt_answers và questions để lấy đề gốc và cột explanation)
   */
  static async getAttemptDetail(attemptId, userId) {
    // IDOR check first
    const ownerRes = await pool.query(
      `SELECT
         ta.id,
         ta.test_id,
         mt.title AS test_title,
         mt.skill,
         ta.raw_score,
         ta.total_questions,
         ta.band_score
       FROM test_attempts ta
       JOIN mock_tests mt ON ta.test_id = mt.id
       WHERE ta.id = $1 AND ta.user_id = $2`,
      [attemptId, userId]
    );
    if (ownerRes.rows.length === 0) return null;
    const meta = ownerRes.rows[0];

    // Fetch answers joined with question data
    // questions.question_text is the correct column name per 009 schema
    const answersRes = await pool.query(
      `SELECT
         aa.question_id,
         aa.question_order,
         aa.user_answer,
         aa.correct_answer,
         aa.is_correct,
         q.question_text AS text,
         q.explanation
       FROM attempt_answers aa
       JOIN questions q ON aa.question_id = q.id
       WHERE aa.attempt_id = $1
       ORDER BY aa.question_order ASC`,
      [attemptId]
    );

    return {
      id: meta.id,
      testId: meta.test_id,
      skill: meta.skill,
      testTitle: meta.test_title,
      rawScore: meta.raw_score,
      totalQuestions: meta.total_questions,
      bandScore: parseFloat(meta.band_score),
      answers: answersRes.rows.map((r) => ({
        questionId: r.question_id,
        order: r.question_order,
        text: r.text || '',
        userAnswer: r.user_answer || '',
        correctAnswer: r.correct_answer,
        isCorrect: r.is_correct,
        explanation: r.explanation || '',
      })),
    };
  }

  /**
   * Get attempt history for the authenticated user.
   * IDOR: only returns rows WHERE ta.user_id = userId.
   * practiceMode included so HistoryPage can show timed vs untimed.
   * (Truy vấn bảng test_attempts JOIN nhẹ sang bảng mock_tests để lấy Title đề thi)
   *
   * @param {string} userId
   * @param {string|null} skill - filter by mt.skill ('reading' | 'listening' | null)
   */
  static async getAttemptHistory(userId, skill = null) {
    const res = await pool.query(
      `SELECT
         ta.id,
         ta.test_id,
         ta.raw_score,
         ta.total_questions,
         ta.band_score,
         ta.time_spent,
         ta.practice_mode,
         ta.submitted_at,
         mt.title      AS test_title,
         mt.skill,
         mt.difficulty
       FROM test_attempts ta
       JOIN mock_tests mt ON ta.test_id = mt.id
       WHERE ta.user_id = $1
         AND ($2::text IS NULL OR mt.skill::text = $2::text)
       ORDER BY ta.submitted_at DESC`,
      [userId, skill || null]
    );

    return res.rows.map((row) => ({
      id: row.id,
      testId: row.test_id,
      testTitle: row.test_title,
      skill: row.skill,
      difficulty: row.difficulty,
      bandScore: parseFloat(row.band_score),
      rawScore: row.raw_score,
      totalQuestions: row.total_questions,
      timeSpent: row.time_spent,
      practiceMode: row.practice_mode,
      submittedAt: row.submitted_at,
    }));
  }
}

module.exports = AttemptService;
