/**
 * Traceability Matrix:
 * - T041: Hiển thị processing/retryable state cho submission `pending`. Không hiển thị empty final report.
 * - SPEC Error Handling: Render error messages correctly and allow users to retry.
 * - SPEC FR-21: Display processing state visually using Bootstrap components.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AiProcessingState from '../../../../src/components/ai/AiProcessingState';

describe('AiProcessingState Component', () => {

  it('should render nothing when status is idle', () => {
    const { container } = render(<AiProcessingState status="idle" />);
    expect(container.firstChild).toBeNull();
  });

  it('should render nothing when status is completed', () => {
    const { container } = render(<AiProcessingState status="completed" />);
    expect(container.firstChild).toBeNull();
  });

  it('should render loading spinner when status is processing', () => {
    render(<AiProcessingState status="processing" />);

    const spinnerContainer = screen.getByTestId('ai-processing-spinner');
    expect(spinnerContainer).toBeInTheDocument();
    expect(screen.getByText('AI is grading your submission, please wait...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveClass('spinner-border text-primary');
  });

  it('should render error message when status is error with string payload', () => {
    render(<AiProcessingState status="error" error="Network Timeout" />);

    const errorContainer = screen.getByTestId('ai-processing-error');
    expect(errorContainer).toBeInTheDocument();
    expect(screen.getByText('Grading Failed')).toBeInTheDocument();
    expect(screen.getByText('Network Timeout')).toBeInTheDocument();
  });

  it('should render error message when status is error with object payload', () => {
    render(<AiProcessingState status="error" error={{ message: 'Server unavailable' }} />);

    expect(screen.getByText('Server unavailable')).toBeInTheDocument();
  });

  it('should render default error message when error payload is empty', () => {
    render(<AiProcessingState status="error" error={null} />);

    expect(screen.getByText('An unexpected error occurred during AI processing.')).toBeInTheDocument();
  });

  it('should render retry button if onRetry is provided and status is error', () => {
    const mockOnRetry = vi.fn();
    render(<AiProcessingState status="error" error="Failed" onRetry={mockOnRetry} />);

    const retryButton = screen.getByTestId('ai-retry-button');
    expect(retryButton).toBeInTheDocument();
    expect(retryButton).toHaveClass('btn btn-outline-danger');

    fireEvent.click(retryButton);
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('should not render retry button if onRetry is NOT provided even if status is error', () => {
    render(<AiProcessingState status="error" error="Failed" />);

    const retryButton = screen.queryByTestId('ai-retry-button');
    expect(retryButton).not.toBeInTheDocument();
  });
});
