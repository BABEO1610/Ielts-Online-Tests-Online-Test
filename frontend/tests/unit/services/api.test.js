/**
 * Traceability Matrix:
 * - Requirement: Task T041 - Setup Axios Interceptors
 * - EARS[Unwanted]: Cấu hình `withCredentials: true`. Bắt lỗi 401 tự động call API `/refresh` rồi retry.
 * 
 * Test Cases:
 * 1. SHOULD configure axios instance with base URL and withCredentials
 * 2. SHOULD return response directly on successful request (Happy Path)
 * 3. SHOULD auto-call /refresh and retry original request when 401 Unauthorized occurs (Error Path - Retry Success)
 * 4. SHOULD throw error when /refresh also fails (Error Path - Retry Fail / Boundary)
 * 5. SHOULD not retry if error status is not 401
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import api from '../../../src/services/api';

describe('API Service (Axios Interceptors)', () => {
  let mock;
  let axiosMock;

  beforeEach(() => {
    // Mock the specific api instance
    mock = new MockAdapter(api);
    // Mock the global axios instance which is used inside the interceptor for /refresh
    axiosMock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.reset();
    axiosMock.reset();
  });

  it('SHOULD configure axios instance with default options', () => {
    expect(api.defaults.withCredentials).toBe(true);
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('SHOULD return response directly on successful request', async () => {
    const data = { success: true, data: { user: 'test' } };
    mock.onGet('/test').reply(200, data);

    const response = await api.get('/test');
    expect(response.status).toBe(200);
    expect(response.data).toEqual(data);
  });

  it('SHOULD auto-call /refresh and retry original request when 401 Unauthorized occurs', async () => {
    // Setup initial 401 failure
    mock.onGet('/protected-route').replyOnce(401, { error: 'Unauthorized' });
    
    // Setup the retry success
    const successData = { success: true, data: 'Protected Data' };
    mock.onGet('/protected-route').replyOnce(200, successData);

    // Setup global axios for the refresh call
    axiosMock.onPost(`${api.defaults.baseURL}/auth/refresh`).reply(200, { success: true });

    const response = await api.get('/protected-route');

    expect(response.status).toBe(200);
    expect(response.data).toEqual(successData);
    
    // Ensure that /refresh was called
    expect(axiosMock.history.post.length).toBe(1);
    expect(axiosMock.history.post[0].url).toBe(`${api.defaults.baseURL}/auth/refresh`);
    expect(axiosMock.history.post[0].withCredentials).toBe(true);
  });

  it('SHOULD throw error when /refresh also fails', async () => {
    // Setup initial 401 failure
    mock.onGet('/protected-route').replyOnce(401, { error: 'Unauthorized' });

    // Setup the refresh endpoint to also fail (e.g., token expired)
    axiosMock.onPost(`${api.defaults.baseURL}/auth/refresh`).reply(401, { error: 'Session Expired' });

    await expect(api.get('/protected-route')).rejects.toThrow();

    // Ensure /refresh was called exactly once
    expect(axiosMock.history.post.length).toBe(1);
  });

  it('SHOULD not retry if error status is not 401', async () => {
    mock.onGet('/protected-route').reply(403, { error: 'Forbidden' });

    await expect(api.get('/protected-route')).rejects.toThrow();

    // Ensure /refresh was NOT called
    expect(axiosMock.history.post.length).toBe(0);
  });
});
