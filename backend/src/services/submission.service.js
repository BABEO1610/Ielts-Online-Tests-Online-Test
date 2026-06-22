const { pool } = require('../db/pool');
const { getBandScore } = require('../utils/scoring');
const TestService = require('./test.service');

class SubmissionService {
  /**
   * Submit an objective test (Listening / Reading)
   * @param {string} userId
   * @param {string} testId
   * @param {Object} answers - Key-value pair of { "questionOrder": "student Answer" }
   * @param {number} timeSpentSeconds
   */
  static async submitObjectiveTest(userId, testId, answers, timeSpentSeconds = 0) {
    // 1. Fetch test details to get correct answers
    const test = await TestService.getTestById(testId);
    if (!test) {
      throw new Error('Test not found');
    }

    if (test.skill !== 'listening' && test.skill !== 'reading') {
      throw new Error('This endpoint only supports listening and reading tests');
    }

    // 2. Extract all questions in a flat array
    const allQuestions = [];
    if (test.passages) {
      test.passages.forEach(p => {
        (p.blocks || []).forEach(b => {
          (b.questions || []).forEach(q => {
            allQuestions.push(q);
          });
        });
      });
    }

    // 3. Compare user answers with correct answers
    let rawScore = 0;
    const gradedAnswers = allQuestions.map(q => {
      const qOrder = String(q.questionOrder);
      const studentAnswer = answers[qOrder] || '';
      let isCorrect = false;

      // Handle correct_answers array (e.g., Multiple Choice / Checkbox)
      if (q.correctAnswers && Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0) {
        // Find if studentAnswer matches any of the correct option texts or labels
        const correctOptMatch = q.correctAnswers.some(ansId => {
          if (q.options && Array.isArray(q.options)) {
            const optIdx = q.options.findIndex(o => String(o.id) === String(ansId) || (o.label && String(o.label) === String(ansId)));
            if (optIdx !== -1) {
              const opt = q.options[optIdx];
              const autoLabel = String.fromCharCode(65 + optIdx); // e.g., 'A', 'B', 'C'
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
      } 
      // Handle text correct_answer (e.g., Fill in the blank)
      else if (q.correctAnswer) {
        const studentAnsLower = studentAnswer.trim().toLowerCase();
        const correctAnsLower = q.correctAnswer.trim().toLowerCase();

        if (studentAnsLower === correctAnsLower) {
          isCorrect = true;
        } else if (q.options && Array.isArray(q.options)) {
          // If the correct answer is an ID (e.g. Matching), try to resolve it to A, B, C
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

      return {
        questionId: q.id,
        questionOrder: q.questionOrder,
        givenAnswer: studentAnswer,
        isCorrect: isCorrect
      };
    });

    const totalQuestions = allQuestions.length || 40; // Default to 40 if no questions (safety fallback)
    const normalizedRawScore = Math.min(rawScore, 40); // Cap at 40
    
    // Scale up raw score if the test has fewer than 40 questions (for demo purposes)
    const scaledRawScore = totalQuestions > 0 ? Math.round((normalizedRawScore / totalQuestions) * 40) : 0;
    
    const bandScore = getBandScore(test.skill, scaledRawScore);

    // 4. Save to Database
    const client = await pool.connect();
    let attemptId;
    
    try {
      await client.query('BEGIN');

      // Insert into test_attempts
      const attemptRes = await client.query(
        `INSERT INTO test_attempts (user_id, test_id, mode, submitted_at, band_score)
         VALUES ($1, $2, 'timed', NOW(), $3) RETURNING id`,
        [userId, testId, bandScore]
      );
      attemptId = attemptRes.rows[0].id;

      // Insert into question_answers
      for (const ga of gradedAnswers) {
        await client.query(
          `INSERT INTO question_answers (attempt_id, question_id, given_answer, is_correct)
           VALUES ($1, $2, $3, $4)`,
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

    return {
      attemptId,
      bandScore,
      rawScore: normalizedRawScore,
      totalQuestions
    };
  }

  /**
   * Fetch the details of a submission result
   */
  static async getSubmissionResult(attemptId, userId) {
    // 1. Fetch attempt and verify ownership
    const attemptRes = await pool.query(
      `SELECT ta.*, mt.title as test_title, mt.skill
       FROM test_attempts ta
       JOIN mock_tests mt ON mt.id = ta.test_id
       WHERE ta.id = $1`,
      [attemptId]
    );

    if (attemptRes.rows.length === 0) return null;
    const attempt = attemptRes.rows[0];

    // Check if the user is authorized to view this result (must be the owner, skipping admin check for now)
    if (String(attempt.user_id) !== String(userId)) {
      throw new Error('Unauthorized access to this result');
    }

    // 2. Fetch all answers
    const answersRes = await pool.query(
      `SELECT qa.given_answer, qa.is_correct, q.question_order, q.question_text, q.correct_answer, q.correct_answers, q.explanation, q.options
       FROM question_answers qa
       JOIN questions q ON q.id = qa.question_id
       WHERE qa.attempt_id = $1
       ORDER BY q.question_order ASC`,
      [attemptId]
    );

    let rawScore = 0;
    const mappedAnswers = answersRes.rows.map(row => {
      if (row.is_correct) rawScore++;
      
      // Formatting correct answer for display
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
    const timeSpentObj = attempt.submitted_at - attempt.created_at; // milliseconds
    const timeSpentMins = Math.floor(timeSpentObj / 60000);
    const timeSpentSecs = Math.floor((timeSpentObj % 60000) / 1000);

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
}

module.exports = SubmissionService;
