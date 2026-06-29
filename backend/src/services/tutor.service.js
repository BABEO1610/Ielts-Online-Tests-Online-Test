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
    // TEMPORARY FIX: ensure parts consistency before fetching detail
    try {
      if (type === 'speaking') {
        await pool.query(`
          UPDATE speaking_submissions 
          SET status = 'pending' 
          WHERE speaking_group_id IN (
            SELECT speaking_group_id FROM speaking_submissions WHERE status = 'pending'
          ) AND status = 'tutor_graded'
        `);
      } else {
        await pool.query(`
          UPDATE writing_submissions 
          SET status = 'pending' 
          WHERE writing_group_id IN (
            SELECT writing_group_id FROM writing_submissions WHERE status = 'pending'
          ) AND status = 'tutor_graded'
        `);
      }
    } catch (err) {
      console.error('Error applying temporary fix:', err);
    }

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
            MIN(ws.status) AS status,
            MIN(ws.grader) AS grader,
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
        status: row.status,
        grader: row.grader,
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
        status: row.status,
        grader: row.grader,
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

      let studentId;
      let submission;
      let studentName = 'N/A';

      if (type === 'writing') {
        // 1. SELECT FOR UPDATE
        const checkQuery = `
          SELECT ws.id, ws.writing_group_id, ws.status, ws.grader, ws.user_id, u.full_name as student_name
          FROM writing_submissions ws
          LEFT JOIN users u ON u.id = ws.user_id
          WHERE ws.id = $1 FOR UPDATE
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
          SELECT ss.id, ss.speaking_group_id, ss.status, ss.grader, ss.user_id, u.full_name as student_name
          FROM speaking_submissions ss
          LEFT JOIN users u ON u.id = ss.user_id
          WHERE ss.id = $1 FOR UPDATE
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
            band_score: payload.bandScore,
            student_name: studentName
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
}

module.exports = TutorService;
