import { useState, useCallback } from 'react';
import api from '../services/api';

const useLibrary = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const clearError = () => setError(null);

  const fetchResources = useCallback(async (filters = {}) => {
    // EARS[Event]: WHEN fetching resources THEN call GET /library
    setLoading(true);
    clearError();
    try {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.resource_type) params.append('resource_type', filters.resource_type);
      
      const response = await api.get(`/library?${params.toString()}`);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || { message: 'Lỗi tải danh sách tài liệu' });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchResourceById = useCallback(async (id) => {
    // EARS[Event]: WHEN fetching specific resource THEN call GET /library/:id
    setLoading(true);
    clearError();
    try {
      const response = await api.get(`/library/${id}`);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || { message: 'Lỗi tải tài liệu' });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadResource = useCallback(async (formData) => {
    // EARS[Event]: WHEN uploading resource THEN call POST /library with multipart form data
    setLoading(true);
    clearError();
    try {
      const response = await api.post('/library', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (err) {
      // Handle 400, 413, 415 specific errors for upload
      let message = 'Lỗi tải lên tài liệu';
      if (err.response?.status === 413) message = 'File tải lên vượt quá dung lượng cho phép';
      else if (err.response?.status === 415) message = 'Định dạng file không được hỗ trợ';
      else if (err.response?.status === 400) message = err.response.data?.error?.message || 'Yêu cầu không hợp lệ';
      
      const customError = { ...err.response?.data?.error, message };
      setError(customError);
      throw customError;
    } finally {
      setLoading(false);
    }
  }, []);

  const editResource = useCallback(async (id, data) => {
    // EARS[Event]: WHEN editing resource THEN call PATCH /library/:id
    setLoading(true);
    clearError();
    try {
      const response = await api.patch(`/library/${id}`, data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || { message: 'Lỗi cập nhật tài liệu' });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteResource = useCallback(async (id) => {
    // EARS[Event]: WHEN deleting resource THEN call DELETE /library/:id
    setLoading(true);
    clearError();
    try {
      const response = await api.delete(`/library/${id}`);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || { message: 'Lỗi xóa tài liệu' });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadResource = useCallback(async (id, filename) => {
    // EARS[Event]: WHEN downloading resource THEN call GET /library/:id/download as blob
    setLoading(true);
    clearError();
    try {
      const response = await api.get(`/library/${id}/download`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      let actualFilename = filename || `resource-${id}`;
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition && contentDisposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches != null && matches[1]) {
          actualFilename = matches[1].replace(/['"]/g, '');
        }
      }
      
      link.setAttribute('download', actualFilename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (err) {
      const customError = err.response?.status === 401 || err.response?.status === 403
        ? { message: 'Bạn không có quyền tải xuống tài liệu này.' }
        : err.response?.data?.error || { message: 'Lỗi tải file' };
      setError(customError);
      throw customError;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchResources,
    fetchResourceById,
    uploadResource,
    editResource,
    deleteResource,
    downloadResource,
    clearError
  };
};

export default useLibrary;
