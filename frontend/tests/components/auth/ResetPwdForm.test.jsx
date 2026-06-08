import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ResetPwdForm from '../../../src/components/auth/ResetPwdForm';
import api from '../../../src/services/api';

// Traceability Matrix:
// - USER-06: As a Guest, I want to reset my password via email.
// - AUTH_PWD_001: This password has been used recently.

vi.mock('../../../src/services/api');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithRouter = (ui, initialRoute = '/reset-password?token=valid-token') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/reset-password" element={ui} />
      </Routes>
    </MemoryRouter>
  );
};

describe('ResetPwdForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders form fields', () => {
    renderWithRouter(<ResetPwdForm />);
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument();
    expect(screen.getByTestId('submit-btn')).toBeInTheDocument();
  });

  test('shows error if token is missing', () => {
    renderWithRouter(<ResetPwdForm />, '/reset-password');
    expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    expect(screen.getByTestId('error-alert')).toHaveTextContent('Đường dẫn đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
    expect(screen.getByTestId('submit-btn')).toBeDisabled();
  });

  test('validates password strength and match in real-time', () => {
    renderWithRouter(<ResetPwdForm />);
    
    const passwordInput = screen.getByTestId('password-input');
    const confirmPasswordInput = screen.getByTestId('confirm-password-input');
    
    // Test weak password
    fireEvent.change(passwordInput, { target: { value: '123' } });
    expect(passwordInput).toHaveClass('is-invalid');
    expect(screen.getByTestId('password-strength-error')).toBeInTheDocument();
    
    // Fix password strength but create mismatch
    fireEvent.change(passwordInput, { target: { value: 'secret123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'secret' } });
    
    expect(passwordInput).not.toHaveClass('is-invalid');
    expect(confirmPasswordInput).toHaveClass('is-invalid');
    expect(screen.getByTestId('password-mismatch-error')).toBeInTheDocument();
    expect(screen.getByTestId('submit-btn')).toBeDisabled();
    
    // Fix mismatch
    fireEvent.change(confirmPasswordInput, { target: { value: 'secret123' } });
    expect(confirmPasswordInput).not.toHaveClass('is-invalid');
    expect(screen.getByTestId('submit-btn')).not.toBeDisabled();
  });

  test('handles successful password reset and redirects (USER-06)', async () => {
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
    api.post.mockResolvedValueOnce({ data: { success: true } });
    
    renderWithRouter(<ResetPwdForm />);
    
    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'secret123' } });
    
    fireEvent.click(screen.getByTestId('submit-btn'));
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'valid-token',
        password: 'secret123'
      });
      expect(screen.getByTestId('success-alert')).toBeInTheDocument();
      expect(screen.getByTestId('password-input')).toBeDisabled(); // Form disabled after success
    });
    
    // Check if setTimeout was called to trigger redirect with 3000ms
    expect(setTimeoutSpy).toHaveBeenCalled();
    const redirectCall = setTimeoutSpy.mock.calls.find(call => call[1] === 3000);
    expect(redirectCall).toBeDefined();
    const redirectCallback = redirectCall[0];
    redirectCallback(); // Manually execute the callback to trigger navigate
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    
    setTimeoutSpy.mockRestore();
  });

  test('handles reset failure due to used password (AUTH_PWD_001)', async () => {
    const errorMsg = 'This password has been used recently.';
    api.post.mockRejectedValueOnce({
      response: { data: { error: errorMsg } }
    });
    
    renderWithRouter(<ResetPwdForm />);
    
    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'secret123' } });
    
    fireEvent.click(screen.getByTestId('submit-btn'));
    
    await waitFor(() => {
      expect(screen.getByTestId('error-alert')).toBeInTheDocument();
      expect(screen.getByTestId('error-alert')).toHaveTextContent(errorMsg);
      expect(screen.getByTestId('password-input')).not.toBeDisabled();
    });
  });
});
