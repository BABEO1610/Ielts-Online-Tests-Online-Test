import axios from 'axios';

// EARS[State-driven]: WHEN application starts THEN initialize api client with base URL and credentials
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  withCredentials: true
});

// Response Interceptor
api.interceptors.response.use(
  (response) => {
    // EARS[Event]: WHEN response is successful THEN return response data directly
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // EARS[Unwanted]: IF response is 401 Unauthorized AND request has not been retried THEN attempt token refresh
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      // Prevent token refresh loop if the request was to login or refresh-token itself
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh-token')) {
        return Promise.reject(error);
      }
      
      originalRequest._retry = true;

      try {
        // EARS[Event]: WHEN refresh token request is sent THEN it uses HttpOnly cookie automatically
        await axios.post(
          `${api.defaults.baseURL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        // EARS[Event]: WHEN refresh token is successful THEN retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // EARS[Unwanted]: IF refresh token fails THEN reject the promise to trigger logout/redirect
        return Promise.reject(refreshError);
      }
    }

    // Reject for all other errors or if retry already failed
    return Promise.reject(error);
  }
);

export default api;
