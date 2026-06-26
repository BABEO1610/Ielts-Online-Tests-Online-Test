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
      // TODO: Trigger AI re-grading queue here (e.g., emit event, call AI service)
      return result;
    }

    if (type === 'speaking') {
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
