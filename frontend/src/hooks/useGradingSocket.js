import { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'; // Default API URL

export const useGradingSocket = (customToken = null) => {
  const [isConnected, setIsConnected] = useState(false);
  const [latestCompletedEvent, setLatestCompletedEvent] = useState(null);
  const [latestFailedEvent, setLatestFailedEvent] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const token = customToken || localStorage.getItem('token');
    
    if (!token) return;

    // EARS[Event]: WHEN the hook mounts with a valid token, THE hook SHALL connect to the backend socket
    const socket = io(SOCKET_URL, {
      auth: {
        token: token
      }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connect_error:', err.message);
      setIsConnected(false);
    });

    // EARS[Event]: WHEN AI/Tutor grading completes, THE hook SHALL update latestCompletedEvent state
    // Maps to: SPEC §4 NFR-02, FR-05
    socket.on('grading_complete', (data) => {
      setLatestCompletedEvent(data);
    });

    // EARS[Event]: WHEN AI grading fails entirely (after retries), THE hook SHALL update latestFailedEvent state
    socket.on('grading_failed', (data) => {
      setLatestFailedEvent(data);
    });

    return () => {
      // EARS[Event]: WHEN component unmounts, THE hook SHALL disconnect the socket to prevent memory leaks
      socket.disconnect();
      socketRef.current = null;
    };
  }, [customToken]);

  const clearEvents = useCallback(() => {
    setLatestCompletedEvent(null);
    setLatestFailedEvent(null);
  }, []);

  return {
    isConnected,
    latestCompletedEvent,
    latestFailedEvent,
    clearEvents,
    socket: socketRef.current
  };
};

export default useGradingSocket;
