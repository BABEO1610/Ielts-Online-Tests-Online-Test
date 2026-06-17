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
   * Fetch list of tests
   * @returns {Promise<Object>}
   */
  getTests: async () => {
    const response = await api.get('/tests');
    return response.data;
  },

  /**
   * Fetch a test by ID
   * @param {string} id
   * @returns {Promise<Object>}
   */
  getTestById: async (id) => {
    const response = await api.get(`/tests/${id}`);
    return response.data;
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
