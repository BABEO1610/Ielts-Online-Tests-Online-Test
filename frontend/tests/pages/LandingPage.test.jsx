import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '../../src/pages/public/LandingPage';

const authMock = vi.hoisted(() => ({
  value: {
    user: null,
    isAuthenticated: false,
    isLoading: false,
  },
}));

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => authMock.value,
}));

vi.mock('../../src/components/layout/StudentNavbar', () => ({
  default: () => <div data-testid="mock-student-navbar">Mock Student Navbar</div>,
}));

describe('LandingPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.value = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
    };
  });

  test('renders StudentNavbar on the landing page', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(screen.getByTestId('mock-student-navbar')).toBeInTheDocument();
  });

  test('renders hero section and guest call-to-action buttons', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);

    expect(screen.getByText(/Luyện thi IELTS thông minh hơn với AI/i)).toBeInTheDocument();
    expect(screen.getByText('Bắt đầu miễn phí')).toBeInTheDocument();
  });

  test('does not render guest call-to-action for authenticated users', () => {
    authMock.value = {
      user: { id: 'user-1', role: 'student' },
      isAuthenticated: true,
      isLoading: false,
    };

    render(<MemoryRouter><LandingPage /></MemoryRouter>);

    expect(screen.getByText('Tiếp tục luyện tập')).toBeInTheDocument();
    expect(screen.queryByText('Bắt đầu miễn phí')).not.toBeInTheDocument();
  });
});
