const { pool } = require('../db/pool');
const AppError = require('../utils/AppError');
const AuditLogService = require('./audit.service');

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
    if (type === 'writing') {
      const query = `
        WITH base AS (
            SELECT writing_group_id
            FROM writing_submissions
            WHERE id = $1
        )
        SELECT
            ws.writing_group_id,
            ws.user_id AS student_id,
            u.full_name AS student_name,
            mt.title AS test_title,
            MIN(ws.submitted_at) AS submitted_at,
            json_agg(
                json_build_object(
                    'submissionId', ws.id,
                    'taskNumber', ws.task_number,
                    'promptText', ws.prompt_text,
                    'responseText', ws.response_text,
                    'fileUrl', ws.file_url
                )
                ORDER BY ws.task_number
            ) AS parts
        FROM writing_submissions ws
        JOIN base b ON b.writing_group_id = ws.writing_group_id
        JOIN users u ON u.id = ws.user_id
        LEFT JOIN mock_tests mt ON mt.id = ws.test_id
        GROUP BY
            ws.writing_group_id,
            ws.user_id,
            u.full_name,
            mt.title
      `;
      const result = await pool.query(query, [submissionId]);
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        type: 'writing',
        writingGroupId: row.writing_group_id,
        student: {
          id: row.student_id,
          fullName: row.student_name
        },
        testTitle: row.test_title,
        submittedAt: row.submitted_at,
        parts: row.parts
      };
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
   * @param {string} ipAddress
   */
  static async gradeSubmission(type, submissionId, tutorId, payload, ipAddress = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let submission;
      let studentId;

      if (type === 'writing') {
        // 1. SELECT FOR UPDATE
        const checkQuery = `
          SELECT id, writing_group_id, status, grader, user_id 
          FROM writing_submissions 
          WHERE id = $1 FOR UPDATE
        `;
        const checkResult = await client.query(checkQuery, [submissionId]);
        if (checkResult.rowCount === 0) {
          throw new AppError('Submission not found', 404);
        }
        submission = checkResult.rows[0];
        studentId = submission.user_id;

        if (!submission.writing_group_id) {
          throw new AppError('Legacy submission without group ID cannot be graded via grouped API.', 400);
        }

        // 2. Check status and grader for all tasks in the group
        const groupQuery = `SELECT id, status, grader FROM writing_submissions WHERE writing_group_id = $1`;
        const groupResult = await client.query(groupQuery, [submission.writing_group_id]);
        for (const task of groupResult.rows) {
          if (task.status !== 'pending' || task.grader !== 'tutor') {
            throw new AppError('Submission has already been graded or is not pending for tutor.', 409);
          }
        }

        // 3. Select representative task to store the feedback reference (usually task 1)
        const repTaskQuery = `SELECT id FROM writing_submissions WHERE writing_group_id = $1 ORDER BY task_number ASC LIMIT 1`;
        const repTaskResult = await client.query(repTaskQuery, [submission.writing_group_id]);
        const repTaskId = repTaskResult.rows[0].id;

        // 4. Insert tutor_feedback_reports
        const insertFeedbackQuery = `
          INSERT INTO tutor_feedback_reports (
            tutor_id, writing_submission_id, band_score, 
            task_achievement_score, coherence_score, lexical_score, grammar_score,
            written_feedback
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        await client.query(insertFeedbackQuery, [
          tutorId, repTaskId, payload.bandScore,
          payload.taskAchievementScore, payload.coherenceScore, payload.lexicalScore, payload.grammarScore,
          payload.writtenFeedback
        ]);

        // 5. Update status for all tasks in the group
        const updateStatusQuery = `
          UPDATE writing_submissions 
          SET status = 'tutor_graded' 
          WHERE writing_group_id = $1
        `;
        await client.query(updateStatusQuery, [submission.writing_group_id]);

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
            band_score: payload.bandScore 
          }, // new_value
          ipAddress
        );
      } catch (auditErr) {
        console.error('[TutorService] Failed to insert audit log for gradeSubmission:', auditErr);
      }

      return { success: true, studentId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
   * Get Activity Log Stats for Tutor
   */
  static async getActivityLogStats(tutorId) {
    const query = `
      SELECT 
        (SELECT COUNT(*)::int FROM audit_logs WHERE actor_id = $1 AND created_at::date = CURRENT_DATE) as today_actions,
        (SELECT COUNT(*)::int FROM audit_logs WHERE actor_id = $1 AND action = 'submission_graded' AND created_at >= NOW() - INTERVAL '7 days') as graded_week,
        (SELECT COUNT(*)::int FROM audit_logs WHERE actor_id = $1 AND action IN ('test_updated', 'resource_uploaded', 'resource_reviewed', 'test_reviewed')) as content_updates
    `;
    const result = await pool.query(query, [tutorId]);
    return result.rows[0] || { today_actions: 0, graded_week: 0, content_updates: 0 };
  }
}

module.exports = TutorService;
