import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ReadingPage from '../../../src/pages/objective-testing/ReadingPage';

// Traceability Matrix:
// - GUEST_AUTH_002: Guest users can view the list of exams but must be logged in to view details ("Xem đề") or take tests ("Làm bài").
// - SPEC §4 Event-driven: WHEN a guest user tries to view exam details THEN system redirects to login with an error message.
// - EARS[Event]: WHEN user tries to view exam details / start test

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

let mockIsAuthenticated = false;

vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    user: mockIsAuthenticated ? { full_name: 'Test' } : null
  })
}));

describe('ReadingPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders exam list for both guests and authenticated users', () => {
    mockIsAuthenticated = false;
    render(<MemoryRouter><ReadingPage /></MemoryRouter>);
    expect(screen.getByText('Reading')).toBeInTheDocument();
    expect(screen.getByText('Đề thi tháng 6/2025')).toBeInTheDocument();
  });

  test('blocks guest user from viewing exam details and redirects to login (GUEST_AUTH_002)', () => {
    mockIsAuthenticated = false;
    render(<MemoryRouter><ReadingPage /></MemoryRouter>);

    const viewBtns = screen.getAllByText('Xem đề →');
    fireEvent.click(viewBtns[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/login', { 
      state: { message: 'Vui lòng đăng nhập để xem chi tiết đề thi' } 
    });
  });

  test('allows authenticated user to view exam details', () => {
    mockIsAuthenticated = true;
    render(<MemoryRouter><ReadingPage /></MemoryRouter>);

    const viewBtns = screen.getAllByText('Xem đề →');
    fireEvent.click(viewBtns[0]);

    // Should not redirect to login
    expect(mockNavigate).not.toHaveBeenCalledWith('/login', expect.anything());
    // Should render PassageList (level 2 view)
    expect(screen.getByText('← Tất cả đề thi')).toBeInTheDocument();
  });
});
