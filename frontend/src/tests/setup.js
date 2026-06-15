import '@testing-library/jest-dom';

// Mock IntersectionObserver for Framer Motion in tests
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
};

// Global mocks for react-router-dom
import { vi } from 'vitest'; import React from 'react';
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    // Provide a dummy Link component to avoid context errors
    Link: (props) => React.createElement('a', props),
  };
});

// Global mock for AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    canManage: true,
    user: { id: 'test-user' },
  }),
}));
