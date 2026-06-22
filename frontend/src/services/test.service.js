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

export const testService = {
  /**
   * Create a new test (Reading, Listening, etc.)
   * @param {Object} testData Data including general info and passages
   * @returns {Promise<Object>}
   */
  createTest: async (testData) => {
    try {
      const response = await api.post('/tests', testData);
      return response.data; // Standard response format { success, data, error, meta }
    } catch (error) {
      return getApiError(error);
    }
  },

  /**
   * Fetch list of tests, optionally filtered by skill.
   * @param {Object} options - { skill: string, tutor: boolean, all: boolean }
   * @returns {Promise<Object>} Standard { success, data, meta, error } response
   */
  getTests: async (options = {}) => {
    try {
      const params = {};
      if (typeof options === 'string') {
        params.skill = options;
      } else {
        if (options.skill) params.skill = options.skill;
        if (options.tutor) params.tutor = true;
        if (options.all) params.all = true;
      }
      const response = await api.get('/tests', { params });
      return response.data;
    } catch (error) {
      return getApiError(error);
    }
  },

  /**
   * Fetch a test by ID (full detail: passages, blocks, questions)
   * @param {string} id
   * @returns {Promise<Object>}
   */
  getTestById: async (id) => {
    try {
      const response = await api.get(`/tests/${id}`);
      return response.data;
    } catch (error) {
      return getApiError(error);
    }
  },


  /**
   * Update an existing test
   * @param {string} id
   * @param {Object} testData
   * @returns {Promise<Object>}
   */
  updateTest: async (id, testData) => {
    try {
      const response = await api.put(`/tests/${id}`, testData);
      return response.data;
    } catch (error) {
      return getApiError(error);
    }
  },

  /**
   * Delete an existing test
   * @param {string} id
   * @returns {Promise<Object>}
   */
  deleteTest: async (id) => {
    const response = await api.delete(`/tests/${id}`);
    return response.data;
  }
};
