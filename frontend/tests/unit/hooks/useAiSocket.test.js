/**
 * Traceability Matrix:
 * - T040: Listen `ai_grading_started`, `ai_grading_completed`, `ai_grading_error`, `ai_precheck_completed`, `ai_precheck_error`. Cleanup listeners khi unmount.
 * - SPEC FR-21: Receive real-time processing status.
 * - SPEC Error Handling: Handle formatting, timeout, server errors from AI service via socket.
 * - AGENTS.md/constitution.md: No raw provider metadata should be exposed to the UI state.
 */

import { renderHook, act } from '@testing-library/react';
import { useAiSocket } from '../../../src/hooks/useAiSocket';
import { io } from 'socket.io-client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const mSocket = {
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
  };
  return {
    io: vi.fn(() => mSocket),
  };
});

describe('useAiSocket', () => {
  let mockSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket = {
      on: vi.fn(),
      off: vi.fn(),
      disconnect: vi.fn(),
    };
    io.mockReturnValue(mockSocket);
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should not connect if token is missing', () => {
    const { result } = renderHook(() => useAiSocket(null));
    expect(io).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('should connect to /ai namespace when token is provided', () => {
    renderHook(() => useAiSocket('fake-token'));
    
    expect(io).toHaveBeenCalledWith('http://localhost:3000/ai', {
      auth: { token: 'fake-token' },
      transports: ['websocket'],
    });
  });

  it('should handle ai_grading_started event', () => {
    let startedCallback;
    mockSocket.on.mockImplementation((event, cb) => {
      if (event === 'ai_grading_started') startedCallback = cb;
    });

    const { result } = renderHook(() => useAiSocket('fake-token'));

    act(() => {
      startedCallback({ jobId: '123' });
    });

    expect(result.current.status).toBe('processing');
    expect(result.current.data).toEqual({ jobId: '123' });
    expect(result.current.error).toBeNull();
  });

  it('should handle ai_grading_completed event and sanitize metadata', () => {
    let completedCallback;
    mockSocket.on.mockImplementation((event, cb) => {
      if (event === 'ai_grading_completed') completedCallback = cb;
    });

    const { result } = renderHook(() => useAiSocket('fake-token'));

    act(() => {
      completedCallback({
        jobId: '123',
        score: 7.5,
        provider_metadata: { cost: 0.01 }, // Should be removed
        raw_response: 'RAW DATA' // Should be removed
      });
    });

    expect(result.current.status).toBe('completed');
    expect(result.current.data).toEqual({ jobId: '123', score: 7.5 });
    expect(result.current.error).toBeNull();
  });

  it('should handle ai_grading_error event', () => {
    let errorCallback;
    mockSocket.on.mockImplementation((event, cb) => {
      if (event === 'ai_grading_error') errorCallback = cb;
    });

    const { result } = renderHook(() => useAiSocket('fake-token'));

    act(() => {
      errorCallback({ message: 'AI processing failed' });
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('AI processing failed');
    expect(result.current.data).toBeNull();
  });

  it('should handle ai_precheck_completed event and sanitize metadata', () => {
    let completedCallback;
    mockSocket.on.mockImplementation((event, cb) => {
      if (event === 'ai_precheck_completed') completedCallback = cb;
    });

    const { result } = renderHook(() => useAiSocket('fake-token'));

    act(() => {
      completedCallback({
        valid: true,
        provider_metadata: { tokens: 100 }
      });
    });

    expect(result.current.status).toBe('completed');
    expect(result.current.data).toEqual({ valid: true });
    expect(result.current.error).toBeNull();
  });

  it('should handle ai_precheck_error event with boundary fallback value', () => {
    let errorCallback;
    mockSocket.on.mockImplementation((event, cb) => {
      if (event === 'ai_precheck_error') errorCallback = cb;
    });

    const { result } = renderHook(() => useAiSocket('fake-token'));

    act(() => {
      // Testing boundary/fallback value where errorPayload may not have a message
      errorCallback(null);
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('An error occurred during precheck');
    expect(result.current.data).toBeNull();
  });

  it('should reset state when resetState is called', () => {
    let errorCallback;
    mockSocket.on.mockImplementation((event, cb) => {
      if (event === 'ai_grading_error') errorCallback = cb;
    });

    const { result } = renderHook(() => useAiSocket('fake-token'));

    act(() => {
      errorCallback({ message: 'Error' });
    });

    expect(result.current.status).toBe('error');

    act(() => {
      result.current.resetState();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('should cleanup event listeners and disconnect on unmount', () => {
    const { unmount } = renderHook(() => useAiSocket('fake-token'));
    
    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith('ai_grading_started');
    expect(mockSocket.off).toHaveBeenCalledWith('ai_grading_completed');
    expect(mockSocket.off).toHaveBeenCalledWith('ai_grading_error');
    expect(mockSocket.off).toHaveBeenCalledWith('ai_precheck_completed');
    expect(mockSocket.off).toHaveBeenCalledWith('ai_precheck_error');
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
