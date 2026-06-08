import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '../../src/pages/LandingPage';

vi.mock('../../src/components/layout/StudentNavbar', () => ({
  default: () => <div data-testid="mock-student-navbar">Mock Student Navbar</div>
}));

describe('LandingPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders StudentNavbar on the landing page (GUEST_AUTH_001)', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(screen.getByTestId('mock-student-navbar')).toBeInTheDocument();
  });

  test('renders hero section and call to action buttons', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(screen.getByText('Master IELTS with AI Precision')).toBeInTheDocument();
    expect(screen.getByText('Bắt đầu ngay')).toBeInTheDocument();
    expect(screen.getByText('Đăng nhập')).toBeInTheDocument();
  });
});
