/**
 * TRACEABILITY MATRIX
 * -------------------
 * Requirement | Test Case Description
 * FR-05       | should connect to socket and authenticate using provided token
 * NFR-02      | should listen to grading_complete event and update latestCompletedEvent state
 * NFR-02      | should listen to grading_failed event and update latestFailedEvent state
 * SPEC §8     | should disconnect socket when unmounted to prevent memory leaks
 */

import { renderHook, act } from '@testing-library/react';
import { useGradingSocket } from '../../src/hooks/useGradingSocket';
import { io } from 'socket.io-client';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const mSocket = {
    on: vi.fn(),
    disconnect: vi.fn(),
    auth: {}
  };
  return {
    io: vi.fn(() => mSocket)
  };
});

describe('useGradingSocket Hook', () => {
  let mockSocket;
  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket = io(); // Get reference to the mocked socket object
    mockSocket.on.mockClear();
    mockSocket.disconnect.mockClear();
    localStorage.clear();
  });

  it('should not connect if no token is provided and localStorage is empty', () => {
    renderHook(() => useGradingSocket());
    
    // We already called io() once in beforeEach, so we expect it to have been called 1 time in total,
    // meaning renderHook did NOT trigger a new io() call.
    expect(io).toHaveBeenCalledTimes(1); 
  });

  it('should connect using token from localStorage', () => {
    localStorage.setItem('token', mockToken);
    renderHook(() => useGradingSocket());
    
    expect(io).toHaveBeenCalledWith(expect.any(String), {
      auth: { token: mockToken }
    });
  });

  it('should connect using provided customToken (FR-05)', () => {
    renderHook(() => useGradingSocket(mockToken));
    
    expect(io).toHaveBeenCalledWith(expect.any(String), {
      auth: { token: mockToken }
    });
  });

  it('should update isConnected state on connect and disconnect events', () => {
    const { result } = renderHook(() => useGradingSocket(mockToken));
    
    // Find the 'connect' and 'disconnect' handlers
    const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
    const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];

    act(() => {
      connectHandler();
    });
    expect(result.current.isConnected).toBe(true);

    act(() => {
      disconnectHandler();
    });
    expect(result.current.isConnected).toBe(false);
  });

  it('should listen to grading_complete event and update latestCompletedEvent state (NFR-02)', () => {
    const { result } = renderHook(() => useGradingSocket(mockToken));
    
    const completeHandler = mockSocket.on.mock.calls.find(call => call[0] === 'grading_complete')[1];
    
    const mockData = { submission_id: '123', user_id: 'abc' };
    act(() => {
      completeHandler(mockData);
    });
    
    expect(result.current.latestCompletedEvent).toEqual(mockData);
  });

  it('should listen to grading_failed event and update latestFailedEvent state (NFR-02)', () => {
    const { result } = renderHook(() => useGradingSocket(mockToken));
    
    const failHandler = mockSocket.on.mock.calls.find(call => call[0] === 'grading_failed')[1];
    
    const mockData = { submission_id: '456', user_id: 'def' };
    act(() => {
      failHandler(mockData);
    });
    
    expect(result.current.latestFailedEvent).toEqual(mockData);
  });

  it('should disconnect socket when unmounted (SPEC §8 Security cleanup)', () => {
    const { unmount } = renderHook(() => useGradingSocket(mockToken));
    
    unmount();
    
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('should be able to clear events manually', () => {
    const { result } = renderHook(() => useGradingSocket(mockToken));
    
    const completeHandler = mockSocket.on.mock.calls.find(call => call[0] === 'grading_complete')[1];
    const failHandler = mockSocket.on.mock.calls.find(call => call[0] === 'grading_failed')[1];
    
    act(() => {
      completeHandler({ id: 1 });
      failHandler({ id: 2 });
    });
    
    expect(result.current.latestCompletedEvent).toBeTruthy();
    expect(result.current.latestFailedEvent).toBeTruthy();

    act(() => {
      result.current.clearEvents();
    });

    expect(result.current.latestCompletedEvent).toBeNull();
    expect(result.current.latestFailedEvent).toBeNull();
  });
});
