import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import StudentNavbar from '../../../src/components/layout/StudentNavbar';
import * as routerDom from 'react-router-dom';

// Traceability Matrix:
// - GUEST_AUTH_001: Guest users can view the LandingPage with a StudentNavbar that has "Đăng nhập" and "Đăng ký" buttons instead of user profile dropdown.
// - SPEC §4 Event-driven: WHEN user clicks logout THEN call logout API and navigate to landing page.
// - EARS[Event]: WHEN user is not logged in THEN show login/register options

const mockLogout = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

let mockUseAuthValues = {
  user: null,
  logout: mockLogout
};

vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => mockUseAuthValues
}));

describe('StudentNavbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders login and register buttons for guest users (GUEST_AUTH_001)', () => {
    mockUseAuthValues = { user: null, logout: mockLogout };
    render(<MemoryRouter><StudentNavbar /></MemoryRouter>);

    expect(screen.getByText('Đăng nhập')).toBeInTheDocument();
    expect(screen.getByText('Đăng ký')).toBeInTheDocument();
    expect(screen.queryByText('Đăng xuất')).not.toBeInTheDocument();
  });

  test('renders user profile for authenticated users', () => {
    mockUseAuthValues = { 
      user: { full_name: 'Test Student', avatar_url: '' }, 
      logout: mockLogout 
    };
    render(<MemoryRouter><StudentNavbar /></MemoryRouter>);

    expect(screen.getByText('Test Student')).toBeInTheDocument();
    expect(screen.queryByText('Đăng nhập')).not.toBeInTheDocument();
    expect(screen.queryByText('Đăng ký')).not.toBeInTheDocument();
  });

  test('navigates to landing page on successful logout (SPEC §4)', async () => {
    mockUseAuthValues = { 
      user: { full_name: 'Test Student' }, 
      logout: mockLogout 
    };
    mockLogout.mockResolvedValueOnce(undefined);

    render(<MemoryRouter><StudentNavbar /></MemoryRouter>);

    // Open dropdown (if not already visible, wait we can just click "Đăng xuất" because the button is present in the DOM)
    const logoutBtn = screen.getByText('Đăng xuất');
    fireEvent.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
    // Since logout is async, we need to wait for navigate to be called
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
