import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ForgotPwdForm from '../../../src/components/auth/ForgotPwdForm';
import api from '../../../src/services/api';

// Traceability Matrix:
// - USER-06: As a Guest, I want to reset my password via email.
// - Edge Case 9: Email Enumeration Mitigation -> Always show success message regardless of API result.

vi.mock('../../../src/services/api');

const renderWithRouter = (ui) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('ForgotPwdForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders form fields', () => {
    renderWithRouter(<ForgotPwdForm />);
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('submit-btn')).toBeInTheDocument();
    expect(screen.getByText('Đăng nhập ngay')).toBeInTheDocument();
  });

  test('handles successful request and shows anti-enumeration message', async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });
    
    renderWithRouter(<ForgotPwdForm />);
    
    const emailInput = screen.getByTestId('email-input');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    const submitBtn = screen.getByTestId('submit-btn');
    fireEvent.click(submitBtn);
    
    expect(submitBtn).toBeDisabled(); // Loading state
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'test@example.com' });
      expect(screen.getByTestId('success-alert')).toBeInTheDocument();
      expect(screen.getByTestId('success-alert')).toHaveTextContent('Nếu email test@example.com tồn tại trong hệ thống');
      expect(screen.queryByTestId('email-input')).not.toBeInTheDocument(); // Form is hidden
    });
  });

  test('handles failed request but STILL shows anti-enumeration success message', async () => {
    // API throws an error (e.g. Email not found or Rate limited)
    api.post.mockRejectedValueOnce({
      response: { data: { error: 'Email does not exist' } }
    });
    
    // Suppress console.error in this test to keep test output clean
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    renderWithRouter(<ForgotPwdForm />);
    
    const emailInput = screen.getByTestId('email-input');
    fireEvent.change(emailInput, { target: { value: 'unknown@example.com' } });
    
    const submitBtn = screen.getByTestId('submit-btn');
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'unknown@example.com' });
      
      // Verification: Success alert is STILL shown, error is ignored in UI
      expect(screen.getByTestId('success-alert')).toBeInTheDocument();
      expect(screen.getByTestId('success-alert')).toHaveTextContent('Nếu email unknown@example.com tồn tại trong hệ thống');
    });
    
    consoleSpy.mockRestore();
  });
});
