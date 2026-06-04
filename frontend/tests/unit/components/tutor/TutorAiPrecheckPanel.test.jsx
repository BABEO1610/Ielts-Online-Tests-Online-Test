/**
 * Traceability Matrix:
 * - T046: Read-only panel trong Tutor grading screen. POST request tạo precheck khi chưa có. Không ghi đè form tutor feedback.
 * - SPEC FR-17: Tutor can view AI precheck (e.g. word count, off-topic detection).
 * - SPEC TUT-03: AI Assistance features for Tutors.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TutorAiPrecheckPanel from '../../../../src/components/tutor/TutorAiPrecheckPanel';

describe('TutorAiPrecheckPanel Component', () => {
  const mockTrigger = vi.fn();

  it('should render trigger button when no data exists and is not loading', () => {
    render(<TutorAiPrecheckPanel onTriggerPrecheck={mockTrigger} />);

    expect(screen.getByTestId('tutor-ai-precheck-panel')).toBeInTheDocument();
    expect(screen.getByText('AI Precheck Analysis (Tutor Only)')).toBeInTheDocument();

    const triggerBtn = screen.getByTestId('trigger-precheck-btn');
    expect(triggerBtn).toBeInTheDocument();

    fireEvent.click(triggerBtn);
    expect(mockTrigger).toHaveBeenCalledTimes(1);
  });

  it('should render loading spinner when isLoading is true', () => {
    render(<TutorAiPrecheckPanel onTriggerPrecheck={mockTrigger} isLoading={true} />);

    expect(screen.getByTestId('precheck-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('trigger-precheck-btn')).not.toBeInTheDocument();
  });

  it('should render success message when precheckData is valid', () => {
    const validData = { valid: true };
    render(<TutorAiPrecheckPanel onTriggerPrecheck={mockTrigger} precheckData={validData} />);

    expect(screen.getByTestId('precheck-valid')).toBeInTheDocument();
    expect(screen.getByText('All checks passed!')).toBeInTheDocument();
    expect(screen.queryByTestId('trigger-precheck-btn')).not.toBeInTheDocument();
  });

  it('should render list of issues when precheckData is invalid', () => {
    const invalidData = { valid: false, issues: ['Word count is below 150 words.', 'Off topic.'] };
    render(<TutorAiPrecheckPanel onTriggerPrecheck={mockTrigger} precheckData={invalidData} />);

    const invalidAlert = screen.getByTestId('precheck-invalid');
    expect(invalidAlert).toBeInTheDocument();
    expect(screen.getByText('Issues Detected')).toBeInTheDocument();
    expect(screen.getByText('Word count is below 150 words.')).toBeInTheDocument();
    expect(screen.getByText('Off topic.')).toBeInTheDocument();
  });

  it('should render error alert when error occurs', () => {
    render(<TutorAiPrecheckPanel onTriggerPrecheck={mockTrigger} error={{ message: 'API connection lost' }} />);

    const errorAlert = screen.getByTestId('precheck-error-alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveClass('alert-danger');
    expect(screen.getByText('API connection lost')).toBeInTheDocument();
  });

  it('should NOT contain any form input elements to satisfy the read-only constraint', () => {
    const invalidData = { valid: false, issues: ['Too short'] };
    const { container } = render(<TutorAiPrecheckPanel onTriggerPrecheck={mockTrigger} precheckData={invalidData} />);

    const inputs = container.querySelectorAll('input, textarea, select');
    expect(inputs.length).toBe(0);
  });
});
