import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useLibrary from '../../../src/hooks/useLibrary';
import api from '../../../src/services/api';

vi.mock('../../../src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('useLibrary hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchResources handles success', async () => {
    const mockData = { data: [{ id: 1 }], meta: { total: 1 } };
    api.get.mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => useLibrary());
    
    let response;
    await act(async () => {
      response = await result.current.fetchResources({ page: 1, limit: 10 });
    });

    expect(api.get).toHaveBeenCalledWith('/library?page=1&limit=10');
    expect(response).toEqual(mockData);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetchResources handles error', async () => {
    const mockError = { response: { data: { error: { message: 'Failed' } } } };
    api.get.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useLibrary());
    
    await act(async () => {
      try {
        await result.current.fetchResources();
      } catch (e) {
        // Expected
      }
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toEqual({ message: 'Failed' });
  });

  it('uploadResource handles specific errors (413, 415)', async () => {
    // Test 413 Payload Too Large
    const mockError413 = { response: { status: 413 } };
    api.post.mockRejectedValueOnce(mockError413);

    const { result } = renderHook(() => useLibrary());
    
    await act(async () => {
      try {
        await result.current.uploadResource(new FormData());
      } catch (e) {
        expect(e.message).toBe('File tải lên vượt quá dung lượng cho phép');
      }
    });
    
    // Test 415 Unsupported Media Type
    const mockError415 = { response: { status: 415 } };
    api.post.mockRejectedValueOnce(mockError415);
    
    await act(async () => {
      try {
        await result.current.uploadResource(new FormData());
      } catch (e) {
        expect(e.message).toBe('Định dạng file không được hỗ trợ');
      }
    });
  });
});
