import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import UserProfilePage from '../../src/pages/UserProfilePage';
import api from '../../src/services/api';

// Traceability Matrix:
// - USER-09: As a Student, I want to view and update my profile (Name, Avatar, Target Band Score).
// - AUTH_PROF_001: Target Band Score must be between 0 and 9, in 0.5 increments.
// - SPEC §4 Event-driven: WHEN a User requests a Profile update, THE system SHALL validate & update.

vi.mock('../../src/services/api');

const mockRefreshUser = vi.fn();
const mockUser = {
  email: 'test@example.com',
  full_name: 'Test User',
  avatar_url: '',
  target_band_score: 6.5,
  role: 'student',
  status: 'active'
};

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    refreshUser: mockRefreshUser
  })
}));

describe('UserProfilePage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders user info (read-only) and editable fields (USER-09)', () => {
    render(
      <BrowserRouter>
        <UserProfilePage />
      </BrowserRouter>
    );

    // Read-only fields
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('student')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();

    // Editable fields
    expect(screen.getByTestId('fullname-input')).toHaveValue('Test User');
    expect(screen.getByTestId('bandscore-select')).toHaveValue('6.5');
    expect(screen.getByTestId('submit-btn')).toBeInTheDocument();
  });

  test('generates band score options from 0.0 to 9.0 in 0.5 steps', () => {
    render(
      <BrowserRouter>
        <UserProfilePage />
      </BrowserRouter>
    );
    const select = screen.getByTestId('bandscore-select');
    const options = Array.from(select.options).map(opt => opt.value);

    expect(options).toContain('0.0');
    expect(options).toContain('4.5');
    expect(options).toContain('6.5');
    expect(options).toContain('9.0');
    expect(options).toHaveLength(19); // 0.0 to 9.0 => 19 options
    expect(options).not.toContain('9.5');
  });

  test('handles successful profile update (USER-09)', async () => {
    api.patch.mockResolvedValueOnce({ data: { success: true } });
    mockRefreshUser.mockResolvedValueOnce(undefined);

    render(
      <BrowserRouter>
        <UserProfilePage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByTestId('fullname-input'), {
      target: { name: 'full_name', value: 'Updated Name' }
    });
    fireEvent.change(screen.getByTestId('bandscore-select'), {
      target: { name: 'target_band_score', value: '7.0' }
    });

    fireEvent.click(screen.getByTestId('submit-btn'));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/users/me', {
        full_name: 'Updated Name',
        avatar_url: '',
        target_band_score: 7.0
      });
      expect(mockRefreshUser).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('success-alert')).toBeInTheDocument();
      expect(screen.getByTestId('success-alert')).toHaveTextContent('Cập nhật hồ sơ thành công!');
    });
  });

  test('handles update failure with AUTH_PROF_001 error message', async () => {
    const errorMsg = 'Target Band Score must be between 0 and 9, in 0.5 increments.';
    api.patch.mockRejectedValueOnce({
      response: { data: { error: errorMsg } }
    });

    render(
      <BrowserRouter>
        <UserProfilePage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByTestId('submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('error-alert')).toBeInTheDocument();
      expect(screen.getByTestId('error-alert')).toHaveTextContent(errorMsg);
      expect(mockRefreshUser).not.toHaveBeenCalled();
    });
  });
});
