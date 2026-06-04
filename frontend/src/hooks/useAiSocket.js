import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

// EARS[State]: The system shall maintain the current AI processing state including status, data, and error.
const initialState = {
  status: 'idle', // 'idle', 'processing', 'completed', 'error'
  data: null,
  error: null,
};

export const useAiSocket = (token) => {
  const [socketState, setSocketState] = useState(initialState);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token) return;

    // EARS[Action]: WHEN the hook mounts with a token, THEN establish a socket connection to '/ai' namespace
    const socketInstance = io(import.meta.env.VITE_API_URL + '/ai', {
      auth: { token },
      transports: ['websocket']
    });

    setSocket(socketInstance);

    // EARS[Event]: WHEN user receives 'ai_grading_started', THEN system sets status to 'processing'
    socketInstance.on('ai_grading_started', (payload) => {
      setSocketState({
        status: 'processing',
        data: payload,
        error: null,
      });
    });

    // EARS[Event]: WHEN user receives 'ai_grading_completed', THEN system sets status to 'completed' and saves data
    socketInstance.on('ai_grading_completed', (payload) => {
      // EARS[Constraint]: System SHALL NOT expose raw provider metadata or raw responses to the UI state
      const sanitizedData = { ...payload };
      delete sanitizedData.provider_metadata;
      delete sanitizedData.raw_response;

      setSocketState({
        status: 'completed',
        data: sanitizedData,
        error: null,
      });
    });

    // EARS[Event]: WHEN user receives 'ai_grading_error', THEN system sets status to 'error' and saves error details
    socketInstance.on('ai_grading_error', (errorPayload) => {
      setSocketState({
        status: 'error',
        data: null,
        error: errorPayload?.message || 'An error occurred during grading',
      });
    });

    // EARS[Event]: WHEN user receives 'ai_precheck_completed', THEN system sets status to 'completed'
    socketInstance.on('ai_precheck_completed', (payload) => {
      // EARS[Constraint]: System SHALL NOT expose raw provider metadata or raw responses to the UI state
      const sanitizedData = { ...payload };
      delete sanitizedData.provider_metadata;
      delete sanitizedData.raw_response;

      setSocketState({
        status: 'completed',
        data: sanitizedData,
        error: null,
      });
    });

    // EARS[Event]: WHEN user receives 'ai_precheck_error', THEN system sets status to 'error'
    socketInstance.on('ai_precheck_error', (errorPayload) => {
      setSocketState({
        status: 'error',
        data: null,
        error: errorPayload?.message || 'An error occurred during precheck',
      });
    });

    // EARS[Action]: WHEN the component unmounts, THEN the system shall disconnect the socket and cleanup listeners
    return () => {
      socketInstance.off('ai_grading_started');
      socketInstance.off('ai_grading_completed');
      socketInstance.off('ai_grading_error');
      socketInstance.off('ai_precheck_completed');
      socketInstance.off('ai_precheck_error');
      socketInstance.disconnect();
    };
  }, [token]);

  // EARS[Action]: WHEN user manually resets state, THEN system restores initial state
  const resetState = useCallback(() => {
    setSocketState(initialState);
  }, []);

  return {
    ...socketState,
    socket,
    resetState,
  };
};
