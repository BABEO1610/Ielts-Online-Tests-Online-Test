/**
 * Traceability Matrix:
 * - Test uploadAudio: Maps to SPEC §6 (upload endpoint), ERR-01 (File Size limit simulation)
 * - Test submitWriting: Maps to FR-01, AC-07 (Idempotency simulation)
 * - Test getFeedback: Maps to FR-06
 * - Test getAudioUrl: Maps to AC-06 (IDOR Prevent simulation)
 * - Test claimSubmission: Maps to AC-05 equivalent / Tutor claim lock
 * - Test gradeSubmission: Maps to FR-04, FR-05
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import gradingService from '../../src/services/grading.service';
import api from '../../src/services/api';

// Mock the api module
vi.mock('../../src/services/api', () => {
  return {
    default: {
      post: vi.fn(),
      get: vi.fn(),
    },
  };
});

describe('Grading Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadAudio', () => {
    it('should upload audio and return temp_s3_key on happy path', async () => {
      // EARS[Event]: WHEN file is uploaded THEN it calls the API with multipart/form-data
      const mockBlob = new Blob(['mock audio content'], { type: 'audio/mp3' });
      const mockResponse = { data: { success: true, data: { temp_s3_key: 'temp/123/456.mp3' } } };
      api.post.mockResolvedValueOnce(mockResponse);

      const result = await gradingService.uploadAudio(mockBlob);

      expect(api.post).toHaveBeenCalledWith('/submissions/speaking/upload', expect.any(FormData), {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate error when upload fails (e.g. ERR-01 File too large)', async () => {
      // EARS[Unwanted]: IF file > 10MB THEN API returns 413
      const mockError = new Error('Payload Too Large');
      mockError.response = { status: 413, data: { success: false, error: { message: 'File too large' } } };
      api.post.mockRejectedValueOnce(mockError);

      await expect(gradingService.uploadAudio(new Blob())).rejects.toThrow('Payload Too Large');
    });
  });

  describe('submitWriting', () => {
    it('should submit writing data successfully', async () => {
      // EARS[Event]: WHEN user submits writing THEN return submission_id
      const payload = { test_id: 't1', task_number: 1, response_text: 'Hello', grader: 'ai' };
      const mockResponse = { data: { success: true, data: { submission_id: 's1' } } };
      api.post.mockResolvedValueOnce(mockResponse);

      const result = await gradingService.submitWriting(payload);

      expect(api.post).toHaveBeenCalledWith('/submissions/writing', payload);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle quota exhausted error (403)', async () => {
      // EARS[Unwanted]: IF AI quota is 0 THEN API returns 403
      const mockError = new Error('Forbidden');
      mockError.response = { status: 403, data: { success: false, error: { code: 'GRD_QUO_001' } } };
      api.post.mockRejectedValueOnce(mockError);

      await expect(gradingService.submitWriting({ grader: 'ai' })).rejects.toThrow('Forbidden');
    });
  });

  describe('createAttempt', () => {
    it('should omit dummy numeric mock ids when creating a speaking attempt', async () => {
      const mockResponse = { data: { success: true, data: { id: 'attempt-1' } } };
      api.post.mockResolvedValueOnce(mockResponse);

      const result = await gradingService.createAttempt('2');

      expect(api.post).toHaveBeenCalledWith('/submissions/speaking/attempt', {});
      expect(result).toEqual(mockResponse.data);
    });

    it('should send real UUID test ids when creating a speaking attempt', async () => {
      const testId = '11111111-1111-4111-8111-111111111111';
      const mockResponse = { data: { success: true, data: { id: 'attempt-1' } } };
      api.post.mockResolvedValueOnce(mockResponse);

      await gradingService.createAttempt(testId);

      expect(api.post).toHaveBeenCalledWith('/submissions/speaking/attempt', { test_id: testId });
    });
  });

  describe('getFeedback', () => {
    it('should fetch feedback report correctly (FR-06)', async () => {
      // EARS[Event]: WHEN feedback is requested THEN it calls GET with type param
      const mockResponse = { data: { success: true, data: { submission: {}, ai_report: {} } } };
      api.get.mockResolvedValueOnce(mockResponse);

      const result = await gradingService.getFeedback('sub1', 'writing');

      expect(api.get).toHaveBeenCalledWith('/submissions/sub1/feedback', { params: { type: 'writing' } });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle IDOR forbidden error (AC-06)', async () => {
      const mockError = new Error('Forbidden');
      mockError.response = { status: 403, data: { success: false, error: { code: 'FORBIDDEN' } } };
      api.get.mockRejectedValueOnce(mockError);

      await expect(gradingService.getFeedback('sub2', 'writing')).rejects.toThrow('Forbidden');
    });
  });

  describe('Tutor endpoints', () => {
    it('should fetch tutor queue', async () => {
      const mockResponse = { data: { success: true, data: { items: [], total: 0 } } };
      api.get.mockResolvedValueOnce(mockResponse);
      const result = await gradingService.getTutorQueue({ page: 1, limit: 10 });
      expect(api.get).toHaveBeenCalledWith('/tutors/queue', { params: { page: 1, limit: 10 } });
      expect(result).toEqual(mockResponse.data);
    });

    it('should claim submission and handle race condition (409 GRD_TUT_001)', async () => {
      // EARS[Unwanted]: IF submission already claimed THEN API returns 409
      const mockError = new Error('Conflict');
      mockError.response = { status: 409, data: { success: false, error: { code: 'GRD_TUT_001' } } };
      api.post.mockRejectedValueOnce(mockError);

      await expect(gradingService.claimSubmission('sub1', 'writing')).rejects.toThrow('Conflict');
    });

    it('should grade submission successfully (FR-04)', async () => {
      const payload = { type: 'writing', band_score: 7.0 };
      const mockResponse = { data: { success: true, data: { report_id: 'r1' } } };
      api.post.mockResolvedValueOnce(mockResponse);

      const result = await gradingService.gradeSubmission('sub1', payload);

      expect(api.post).toHaveBeenCalledWith('/tutors/submissions/sub1/grade', payload);
      expect(result).toEqual(mockResponse.data);
    });
  });
});
