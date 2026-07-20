import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import LandingPage from '../../../src/pages/public/LandingPage';

const authMock = vi.hoisted(() => ({
  value: {
    user: null,
    isAuthenticated: false,
    isLoading: false,
  },
}));

vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => authMock.value,
}));

vi.mock('../../../src/components/layout/StudentNavbar', () => ({
  default: () => <div data-testid="mock-student-navbar">IELTSZone</div>,
}));

describe('LandingPage Component', () => {
  const renderComponent = () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    authMock.value = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
    };
  });

  it('renders the IELTSZone title', () => {
    renderComponent();
    expect(screen.getAllByText('IELTSZone').length).toBeGreaterThan(0);
  });

  it('renders guest call-to-action buttons', () => {
    renderComponent();

    expect(screen.getByText('Bắt đầu ngay')).toBeInTheDocument();
    expect(screen.getByText('Đăng nhập')).toBeInTheDocument();
  });

  it('hides the login call-to-action after authentication', () => {
    authMock.value = {
      user: { id: 'user-1', role: 'student' },
      isAuthenticated: true,
      isLoading: false,
    };

    renderComponent();

    expect(screen.getByText('Bắt đầu ngay')).toBeInTheDocument();
    expect(screen.queryByText('Đăng nhập')).not.toBeInTheDocument();
  });

  it('renders the feature cards correctly', () => {
    renderComponent();

    expect(screen.getByText('Chấm bài bằng AI')).toBeInTheDocument();
    expect(screen.getByText('Thư viện tài liệu')).toBeInTheDocument();
    expect(screen.getByText('Lộ trình cá nhân hóa')).toBeInTheDocument();
  });

  it('handles rendering correctly without crashing', () => {
    expect(() => renderComponent()).not.toThrow();
  });
});
