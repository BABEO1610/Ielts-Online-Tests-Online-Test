import api from './api';

const getApiError = (error) => ({
  success: false,
  data: null,
  meta: null,
  error: {
    code: error.response?.data?.error?.code || error.code || 'REQUEST_FAILED',
    message: error.response?.data?.error?.message || error.message || 'Request failed',
  },
});

export const attemptService = {
  /**
   * Nộp bài thi — gửi toàn bộ đáp án và thời gian làm bài lên server.
   *
   * @param {string} testId
   * @param {Object} payload - { answers: {[questionOrder]: string}, timeSpent: number, practiceMode?: boolean }
   * @returns {Promise<{ attemptId, rawScore, bandScore, correctCount, incorrectCount, timeSpent }>}
   */
  submitAttempt: async (testId, payload) => {
    try {
      const response = await api.post(`/tests/${testId}/attempts`, payload);
      return response.data;
    } catch (error) {
      return getApiError(error);
    }
  },

  /**
   * Lấy tổng quan kết quả 1 lần thi.
   *
   * @param {string} attemptId
   * @returns {Promise<Object>}
   */
  getAttempt: async (attemptId) => {
    try {
      const response = await api.get(`/attempts/${attemptId}`);
      return response.data;
    } catch (error) {
      return getApiError(error);
    }
  },

  /**
   * Lấy chi tiết từng câu hỏi của lần thi (đáp án user, đáp án đúng, giải thích).
   *
   * @param {string} attemptId
   * @returns {Promise<Object>}
   */
  getAttemptDetail: async (attemptId) => {
    try {
      const response = await api.get(`/attempts/${attemptId}/detail`);
      return response.data;
    } catch (error) {
      return getApiError(error);
    }
  },

  /**
   * Lấy lịch sử làm bài của user đang đăng nhập.
   *
   * @param {string|null} skill - 'reading' | 'listening' | null (tất cả)
   * @returns {Promise<Object>}
   */
  getAttemptHistory: async (skill = null) => {
    try {
      const params = skill ? { skill } : {};
      const response = await api.get('/attempts', { params });
      return response.data;
    } catch (error) {
      return getApiError(error);
    }
  },
};
