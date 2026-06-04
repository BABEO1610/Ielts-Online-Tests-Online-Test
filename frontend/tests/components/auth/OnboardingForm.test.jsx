import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import OnboardingForm from '../../../src/components/auth/OnboardingForm';
import api from '../../../src/services/api';

/*
 * Traceability Matrix:
 * - Update Target Band Score: Maps to FR-01/USER-09 (Cập nhật hồ sơ)
 * - Happy path (Select valid score): Maps to EARS[Event]: WHEN user submits valid score...
 * - Error boundary > 9 or < 0 or invalid step: Maps to EARS[Unwanted]: IF target_band_score is out of bounds (0-9) OR not a step of 0.5 THEN display error
 * - Error HTTP 400 from API: Maps to EARS[Unwanted]: IF API returns error THEN system displays error message
 */

// Mock axios instance
vi.mock('../../../src/services/api', () => ({
  default: {
    patch: vi.fn(),
  }
}));

const renderWithRouter = (ui) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('OnboardingForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders onboarding form with target band score select', () => {
    renderWithRouter(<OnboardingForm />);
    
    expect(screen.getByText(/Chào mừng đến IELTSZone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mục tiêu IELTS/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tiếp tục/i })).toBeInTheDocument();
    // Button should be disabled initially since no option is selected
    expect(screen.getByRole('button', { name: /Tiếp tục/i })).toBeDisabled();
  });

  it('handles successful update (Happy Path)', async () => {
    api.patch.mockResolvedValueOnce({ data: { success: true } });
    renderWithRouter(<OnboardingForm />);
    
    const select = screen.getByTestId('target-band-score-select');
    fireEvent.change(select, { target: { value: '7.5' } });
    
    const button = screen.getByRole('button', { name: /Tiếp tục/i });
    expect(button).not.toBeDisabled();
    
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/users/me', { target_band_score: 7.5 });
    });
    
    // Check if error message is not present
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
  });

  it('displays error message from API (e.g., HTTP 400)', async () => {
    api.patch.mockRejectedValueOnce({
      response: {
        data: {
          success: false,
          error: { message: 'Invalid target band score format' }
        }
      }
    });
    
    renderWithRouter(<OnboardingForm />);
    
    fireEvent.change(screen.getByTestId('target-band-score-select'), { target: { value: '8.5' } });
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/i }));
    
    const errorMessage = await screen.findByTestId('error-message');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveTextContent('Invalid target band score format');
    expect(errorMessage).toHaveClass('alert alert-danger');
  });
});
