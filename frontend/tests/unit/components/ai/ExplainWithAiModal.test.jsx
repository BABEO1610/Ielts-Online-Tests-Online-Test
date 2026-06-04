/**
 * Traceability Matrix:
 * - T044: Modal hiển thị loading, cached/new response, error 403/429/503. Không thay correct answer.
 * - SPEC STU-06: Button below tutor explanation, opens modal with AI explanation.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ExplainWithAiModal from '../../../../src/components/ai/ExplainWithAiModal';

describe('ExplainWithAiModal Component', () => {
  const mockOnHide = vi.fn();

  it('should not render anything if show is false', () => {
    const { container } = render(
      <ExplainWithAiModal show={false} onHide={mockOnHide} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render loading spinner when isLoading is true', () => {
    render(
      <ExplainWithAiModal show={true} onHide={mockOnHide} isLoading={true} />
    );
    expect(screen.getByTestId('explain-modal-loading')).toBeInTheDocument();
    expect(screen.getByText('AI is generating explanation...')).toBeInTheDocument();
  });

  it('should render the explanation text and disclaimer when explanation is provided', () => {
    render(
      <ExplainWithAiModal
        show={true}
        onHide={mockOnHide}
        explanation="This is the logical reasoning behind the answer."
      />
    );
    expect(screen.getByTestId('explain-modal-success')).toBeInTheDocument();
    expect(screen.getByText('This is the logical reasoning behind the answer.')).toBeInTheDocument();
    expect(screen.getByText(/does not replace the official correct answer/i)).toBeInTheDocument();
  });

  it('should render 403 Forbidden error message', () => {
    render(
      <ExplainWithAiModal show={true} onHide={mockOnHide} error={{ status: 403 }} />
    );
    const errorBlock = screen.getByTestId('explain-modal-error');
    expect(errorBlock).toBeInTheDocument();
    expect(errorBlock).toHaveClass('alert-danger');
    expect(screen.getByText(/You do not have permission to use this feature/i)).toBeInTheDocument();
  });

  it('should render 429 Too Many Requests warning message', () => {
    render(
      <ExplainWithAiModal show={true} onHide={mockOnHide} error={{ status: 429 }} />
    );
    const errorBlock = screen.getByTestId('explain-modal-error');
    expect(errorBlock).toBeInTheDocument();
    expect(errorBlock).toHaveClass('alert-warning');
    expect(screen.getByText(/exceeded your AI usage budget/i)).toBeInTheDocument();
  });

  it('should render 503 Service Unavailable error message', () => {
    render(
      <ExplainWithAiModal show={true} onHide={mockOnHide} error={{ status: 503 }} />
    );
    const errorBlock = screen.getByTestId('explain-modal-error');
    expect(errorBlock).toBeInTheDocument();
    expect(errorBlock).toHaveClass('alert-danger');
    expect(screen.getByText(/AI service is currently unavailable/i)).toBeInTheDocument();
  });

  it('should call onHide when close button in header is clicked', () => {
    render(
      <ExplainWithAiModal show={true} onHide={mockOnHide} explanation="Test" />
    );
    const closeBtn = screen.getByTestId('modal-close-button');
    fireEvent.click(closeBtn);
    expect(mockOnHide).toHaveBeenCalled();
  });

  it('should call onHide when close button in footer is clicked', () => {
    render(
      <ExplainWithAiModal show={true} onHide={mockOnHide} explanation="Test" />
    );
    const closeBtn = screen.getByTestId('modal-close-footer');
    fireEvent.click(closeBtn);
    expect(mockOnHide).toHaveBeenCalled();
  });
});
