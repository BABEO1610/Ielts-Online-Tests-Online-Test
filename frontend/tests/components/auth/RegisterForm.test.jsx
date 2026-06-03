import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import RegisterForm from '../../../src/components/auth/RegisterForm';
import api from '../../../src/services/api';

// Traceability Matrix:
// - USER-03: As a Guest, I want to register a new account using Email/Password.
// - USER-04: As a Guest, I want to receive an email verification link after registration.
// - AUTH_REG_001: Registration failed. Please try again.

vi.mock('../../../src/services/api');

describe('RegisterForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders form fields and Google login button', () => {
    render(<BrowserRouter><RegisterForm /></BrowserRouter>);
    expect(screen.getByTestId('fullname-input')).toBeInTheDocument();
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument();
    expect(screen.getByTestId('submit-btn')).toBeInTheDocument();
    expect(screen.getByTestId('google-login-btn')).toBeInTheDocument();
    expect(screen.getByText('HOẶC')).toBeInTheDocument();
  });

  test('validates confirm password in real-time', () => {
    render(<BrowserRouter><RegisterForm /></BrowserRouter>);
    
    const passwordInput = screen.getByTestId('password-input');
    const confirmPasswordInput = screen.getByTestId('confirm-password-input');
    
    fireEvent.change(passwordInput, { target: { name: 'password', value: 'secret123' } });
    fireEvent.change(confirmPasswordInput, { target: { name: 'confirmPassword', value: 'secret' } });
    
    expect(confirmPasswordInput).toHaveClass('is-invalid');
    expect(screen.getByTestId('password-mismatch-error')).toBeInTheDocument();
    expect(screen.getByTestId('submit-btn')).toBeDisabled();
    
    // Fix password
    fireEvent.change(confirmPasswordInput, { target: { name: 'confirmPassword', value: 'secret123' } });
    
    expect(confirmPasswordInput).not.toHaveClass('is-invalid');
    expect(screen.queryByTestId('password-mismatch-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('submit-btn')).not.toBeDisabled();
  });

  test('handles successful registration (USER-03, USER-04)', async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });
    
    render(<BrowserRouter><RegisterForm /></BrowserRouter>);
    
    fireEvent.change(screen.getByTestId('fullname-input'), { target: { name: 'full_name', value: 'Test User' } });
    fireEvent.change(screen.getByTestId('email-input'), { target: { name: 'email', value: 'test@example.com' } });
    fireEvent.change(screen.getByTestId('password-input'), { target: { name: 'password', value: 'secret123' } });
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { name: 'confirmPassword', value: 'secret123' } });
    
    fireEvent.click(screen.getByTestId('submit-btn'));
    
    expect(screen.getByTestId('submit-btn')).toBeDisabled(); // Loading state
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        email: 'test@example.com',
        password: 'secret123',
        full_name: 'Test User'
      });
      expect(screen.getByTestId('success-alert')).toBeInTheDocument();
      expect(screen.getByTestId('success-alert')).toHaveTextContent('Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.');
      expect(screen.getByTestId('fullname-input')).toHaveValue(''); // Form cleared
    });
  });

  test('handles registration failure with generic error (AUTH_REG_001)', async () => {
    const errorMsg = 'Registration failed. Please try again.';
    api.post.mockRejectedValueOnce({
      response: { data: { error: errorMsg } }
    });
    
    render(<BrowserRouter><RegisterForm /></BrowserRouter>);
    
    fireEvent.change(screen.getByTestId('fullname-input'), { target: { name: 'full_name', value: 'Test User' } });
    fireEvent.change(screen.getByTestId('email-input'), { target: { name: 'email', value: 'test@example.com' } });
    fireEvent.change(screen.getByTestId('password-input'), { target: { name: 'password', value: 'secret123' } });
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { name: 'confirmPassword', value: 'secret123' } });
    
    fireEvent.click(screen.getByTestId('submit-btn'));
    
    await waitFor(() => {
      expect(screen.getByTestId('error-alert')).toBeInTheDocument();
      expect(screen.getByTestId('error-alert')).toHaveTextContent(errorMsg);
      expect(screen.getByTestId('fullname-input')).toHaveValue('Test User'); // Form NOT cleared
    });
  });
});
