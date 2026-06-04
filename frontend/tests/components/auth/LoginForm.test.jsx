import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import LoginForm from '../../../src/components/auth/LoginForm';
import { useAuth } from '../../../src/context/AuthContext';

/*
 * Traceability Matrix:
 * - Happy Path Login: Maps to USER-05, EARS[Event]: WHEN user submits valid credentials...
 * - Error 'AUTH_LOG_002': Maps to EARS[Unwanted]: WHERE User has failed_login_attempts >= 5 (HTTP 429)
 * - Error 'AUTH_LOG_001': Maps to EARS[Unwanted]: WHERE User inputs incorrect password (HTTP 401)
 * - Google Login Button exists: Maps to T044b
 */

// Mock the useAuth hook
vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const renderWithRouter = (ui) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('LoginForm Component', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ login: mockLogin });
  });

  it('renders login form with email, password, and Google button', () => {
    renderWithRouter(<LoginForm />);
    
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mật khẩu/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đăng nhập/i })).toBeInTheDocument();
    expect(screen.getByTestId('google-login-btn')).toBeInTheDocument();
    expect(screen.getByText('HOẶC')).toBeInTheDocument();
  });

  it('handles successful login (Happy Path)', async () => {
    mockLogin.mockResolvedValueOnce({ success: true });
    renderWithRouter(<LoginForm />);
    
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Mật khẩu/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Đăng nhập/i }));
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
    });
    
    // Check if error message is not present
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
  });

  it('displays error message on incorrect credentials (AUTH_LOG_001)', async () => {
    mockLogin.mockResolvedValueOnce({
      success: false,
      error: { code: 'AUTH_LOG_001', message: 'Incorrect email or password.' }
    });
    renderWithRouter(<LoginForm />);
    
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByLabelText(/Mật khẩu/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /Đăng nhập/i }));
    
    const errorMessage = await screen.findByTestId('error-message');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveTextContent('Incorrect email or password.');
    expect(errorMessage).toHaveClass('alert alert-danger');
  });

  it('displays specific lock message for AUTH_LOG_002 (Rate Limit)', async () => {
    mockLogin.mockResolvedValueOnce({
      success: false,
      error: { code: 'AUTH_LOG_002', message: 'Too many attempts' }
    });
    renderWithRouter(<LoginForm />);
    
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'locked@example.com' } });
    fireEvent.change(screen.getByLabelText(/Mật khẩu/i), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /Đăng nhập/i }));
    
    const errorMessage = await screen.findByTestId('error-message');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveTextContent('Account temporarily locked due to multiple failed attempts. Try again in 15 minutes.');
    expect(errorMessage).toHaveClass('alert alert-danger');
  });
});
