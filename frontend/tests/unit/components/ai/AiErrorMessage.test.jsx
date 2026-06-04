s/**
 * Traceability Matrix:
 * - T048: Chuẩn hóa message cho 400/403/409/429/502/503/504.
 * - SPEC Error Handling: Error Matrix mapping for UI components.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AiErrorMessage from '../../../../src/components/ai/AiErrorMessage';

describe('AiErrorMessage Component', () => {
  it('should not render anything if error is null', () => {
    const { container } = render(<AiErrorMessage error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render default 500 error', () => {
    render(<AiErrorMessage error={{ status: 500 }} />);
    expect(screen.getByTestId('ai-error-message-500')).toBeInTheDocument();
    expect(screen.getByText('System Error')).toBeInTheDocument();
  });

  it('should render 400 Bad Request error', () => {
    render(<AiErrorMessage error={{ status: 400 }} />);
    expect(screen.getByTestId('ai-error-message-400')).toHaveClass('alert-danger');
    expect(screen.getByText('Bad Request')).toBeInTheDocument();
  });

  it('should render 403 Access Denied error', () => {
    render(<AiErrorMessage error={{ status: 403 }} />);
    expect(screen.getByTestId('ai-error-message-403')).toHaveClass('alert-danger');
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('should render 409 Conflict error as warning', () => {
    render(<AiErrorMessage error={{ status: 409 }} />);
    expect(screen.getByTestId('ai-error-message-409')).toHaveClass('alert-warning');
    expect(screen.getByText('Conflict')).toBeInTheDocument();
  });

  it('should render 429 Usage Limit error as warning', () => {
    render(<AiErrorMessage error={{ status: 429 }} />);
    expect(screen.getByTestId('ai-error-message-429')).toHaveClass('alert-warning');
    expect(screen.getByText('Usage Limit Reached')).toBeInTheDocument();
  });

  it('should render 503 Service Unavailable and show Retry button if onRetry provided', () => {
    const mockRetry = vi.fn();
    render(<AiErrorMessage error={{ status: 503 }} onRetry={mockRetry} />);

    expect(screen.getByTestId('ai-error-message-503')).toHaveClass('alert-danger');
    expect(screen.getByText('Service Unavailable')).toBeInTheDocument();

    const retryBtn = screen.getByTestId('ai-error-retry-btn');
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('should NOT show Retry button for 403 errors even if onRetry provided', () => {
    const mockRetry = vi.fn();
    render(<AiErrorMessage error={{ status: 403 }} onRetry={mockRetry} />);
    expect(screen.queryByTestId('ai-error-retry-btn')).not.toBeInTheDocument();
  });
});
