/**
 * @file backend/src/services/grading.oversight.service.js
 * @description Service layer for Admin Grading Oversight (IELTS-06).
 *
 * Responsibilities:
 * - Aggregate writing + speaking submissions into one unified list.
 * - Handle AI retry trigger (reset status to 'pending').
 * - In future: trigger actual AI re-grading queue.
 */

const gradingQueries = require('../db/queries/grading.queries');
const AppError = require('../utils/AppError');
const { aiGradingConfig } = require('../config/aiGrading.config');

const GradingOversightService = {
  /**
   * Lấy danh sách tất cả bài nộp để Admin giám sát.
   * @param {object} opts - { status?, limit?, offset? }
   */
  listSubmissions: async ({ status, limit = 50, offset = 0 } = {}) => {
    return gradingQueries.listSubmissionsRaw({ status, limit, offset });
  },

  /**
   * Lấy thống kê số lượng theo từng trạng thái.
   */
  getStatusCounts: async () => {
    return gradingQueries.countSubmissionsByStatus();
  },

  /**
   * Reset trạng thái bài nộp về 'pending' để trigger AI chấm lại.
   * @param {string} type - 'writing' | 'speaking'
   * @param {string} id - UUID của bài nộp
   */
  retryGrading: async (type, id) => {
    if (type === 'writing') {
      const result = await gradingQueries.resetWritingSubmissionStatus(id);
      if (!result) {
        throw new Error(`Writing submission ${id} not found`);
      }
      const { pool } = require('../db/pool');
      const SubmissionService = require('./submission.service');
      const tasksRes = await pool.query(
        `SELECT ws.*, mt.title AS test_title
         FROM writing_submissions ws
         LEFT JOIN mock_tests mt ON mt.id = ws.test_id
         WHERE ws.writing_group_id = $1 OR ws.id = $1`,
        [id]
      );
      if (tasksRes.rows.length > 0) {
        const persistedTasks = tasksRes.rows;
        const userId = persistedTasks[0].user_id;
        const writingGroupId = persistedTasks[0].writing_group_id || persistedTasks[0].id;
        const testTitle = persistedTasks[0].test_title;
        const jobRes = await pool.query(`SELECT * FROM ai_grading_jobs WHERE group_id = $1 LIMIT 1`, [writingGroupId]);
        const writingJob = jobRes.rows[0] || null;
        
        process.nextTick(() => {
          SubmissionService.processWritingTasksAsync(
            userId, writingGroupId, testTitle, persistedTasks, writingJob, null
          ).catch(err => console.error('Writing AI regrading failed', err));
        });
      }
      return result;
    }

    if (type === 'speaking') {
      if (aiGradingConfig.enabled) {
        throw new AppError(
          'Không thể đặt lại trực tiếp trạng thái Speaking async; hãy dùng endpoint retry có idempotency.',
          409,
          'SPEAKING_RETRY_USE_CANONICAL_ENDPOINT'
        );
      }
      const result = await gradingQueries.resetSpeakingSubmissionStatus(id);
      if (!result) {
        throw new Error(`Speaking submission ${id} not found`);
      }
      // TODO: Trigger AI re-grading queue here
      return result;
    }

    throw new Error(`Unknown submission type: ${type}. Must be 'writing' or 'speaking'.`);
  }
};

module.exports = GradingOversightService;
