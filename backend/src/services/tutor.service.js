const { pool } = require('../db/pool');
const AppError = require('../utils/AppError');

class TutorService {
  /**
   * Get pending grading queue for tutors
   * @param {Object} filters
   * @param {string} filters.submission_type - 'writing' or 'speaking'
   * @param {string} filters.search - Search by student name
   */
  static async getQueue(filters = {}) {
    let query = `SELECT * FROM v_tutor_grading_queue WHERE 1=1`;
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
    if (type === 'writing') {
      const query = `
        SELECT 
          'writing' as type,
          ws.id as submission_id,
          u.id as student_id,
          u.full_name as student_name,
          ws.task_number,
          ws.prompt_text,
          ws.response_text,
          ws.file_url,
          ws.submitted_at,
          ws.status,
          ws.grader
        FROM writing_submissions ws
        JOIN users u ON ws.user_id = u.id
        WHERE ws.id = $1
      `;
      const result = await pool.query(query, [submissionId]);
      return result.rows[0] || null;
    } else if (type === 'speaking') {
      const query = `
        WITH base AS (
            SELECT speaking_group_id
            FROM speaking_submissions
            WHERE id = $1
        )
        SELECT
            ss.speaking_group_id,
            ss.user_id AS student_id,
            u.full_name AS student_name,
            mt.title AS test_title,
            MIN(ss.submitted_at) AS submitted_at,
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
        JOIN base b ON b.speaking_group_id = ss.speaking_group_id
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
      return {
        type: 'speaking',
        speakingGroupId: row.speaking_group_id,
        student: {
          id: row.student_id,
          fullName: row.student_name
        },
        testTitle: row.test_title,
        submittedAt: row.submitted_at,
        parts: row.parts
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
   */
  static async gradeSubmission(type, submissionId, tutorId, payload) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let submission;
      let studentId;

      if (type === 'writing') {
        // 1. SELECT FOR UPDATE
        const checkQuery = `
          SELECT status, grader, user_id 
          FROM writing_submissions 
          WHERE id = $1 FOR UPDATE
        `;
        const checkResult = await client.query(checkQuery, [submissionId]);
        if (checkResult.rowCount === 0) {
          throw new AppError('Submission not found', 404);
        }
        submission = checkResult.rows[0];
        studentId = submission.user_id;

        // 2. Check status and grader
        if (submission.status !== 'pending' || submission.grader !== 'tutor') {
          throw new AppError('Submission has already been graded.', 409);
        }

        // 3. Insert tutor_feedback_reports
        const insertFeedbackQuery = `
          INSERT INTO tutor_feedback_reports (
            tutor_id, writing_submission_id, band_score, 
            task_achievement_score, coherence_score, lexical_score, grammar_score,
            written_feedback
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        await client.query(insertFeedbackQuery, [
          tutorId, submissionId, payload.bandScore,
          payload.taskAchievementScore, payload.coherenceScore, payload.lexicalScore, payload.grammarScore,
          payload.writtenFeedback
        ]);

        // 4. Update status
        const updateStatusQuery = `
          UPDATE writing_submissions 
          SET status = 'tutor_graded' 
          WHERE id = $1
        `;
        await client.query(updateStatusQuery, [submissionId]);

      } else if (type === 'speaking') {
        // 1. SELECT FOR UPDATE
        const checkQuery = `
          SELECT id, speaking_group_id, status, grader, user_id 
          FROM speaking_submissions 
          WHERE id = $1 FOR UPDATE
        `;
        const checkResult = await client.query(checkQuery, [submissionId]);
        if (checkResult.rowCount === 0) {
          throw new AppError('Submission not found', 404);
        }
        submission = checkResult.rows[0];
        studentId = submission.user_id;

        if (!submission.speaking_group_id) {
          throw new AppError('Legacy submission without group ID cannot be graded via grouped API.', 400);
        }

        // 2. Check status and grader for all parts in the group
        const groupQuery = `SELECT id, status, grader FROM speaking_submissions WHERE speaking_group_id = $1`;
        const groupResult = await client.query(groupQuery, [submission.speaking_group_id]);
        for (const part of groupResult.rows) {
          if (part.status !== 'pending' || part.grader !== 'tutor') {
            throw new AppError('Submission has already been graded or is not pending for tutor.', 409);
          }
        }

        // 3. Select representative part to store the feedback reference (usually part 1)
        const repPartQuery = `SELECT id FROM speaking_submissions WHERE speaking_group_id = $1 ORDER BY part_number ASC LIMIT 1`;
        const repPartResult = await client.query(repPartQuery, [submission.speaking_group_id]);
        const repPartId = repPartResult.rows[0].id;

        // 4. Insert tutor_feedback_reports
        const insertFeedbackQuery = `
          INSERT INTO tutor_feedback_reports (
            tutor_id, speaking_submission_id, band_score, 
            fluency_score, lexical_score, grammar_score, pronunciation_score,
            written_feedback
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        await client.query(insertFeedbackQuery, [
          tutorId, repPartId, payload.bandScore,
          payload.fluencyScore, payload.lexicalScore, payload.grammarScore, payload.pronunciationScore,
          payload.writtenFeedback
        ]);

        // 5. Update status for all parts in the group
        const updateStatusQuery = `
          UPDATE speaking_submissions 
          SET status = 'tutor_graded' 
          WHERE speaking_group_id = $1
        `;
        await client.query(updateStatusQuery, [submission.speaking_group_id]);

      } else {
        throw new AppError('Invalid submission type', 400);
      }

      await client.query('COMMIT');
      
      return { success: true, studentId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = TutorService;
