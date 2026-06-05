/*
Traceability Matrix:
- Task: T039_D (Shared UI Elements)
- SPEC: §3 UX Requirements
- Test Cases:
  1. Render pending state (Happy Path)
  2. Render ai_graded state (Happy Path)
  3. Render tutor_graded state (Happy Path)
  4. Render failed state (Happy Path)
  5. Render default/unknown state (Error Case/Boundary)
*/
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Badge from '../../../components/common/Badge';

describe('Badge Component', () => {
  it('renders pending state correctly', () => {
    render(<Badge status="pending" />);
    const badge = screen.getByText('Pending');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-secondary');
  });

  it('renders ai_graded state correctly', () => {
    render(<Badge status="ai_graded" />);
    const badge = screen.getByText('AI Graded');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-dark');
  });

  it('renders tutor_graded state correctly', () => {
    render(<Badge status="tutor_graded" />);
    const badge = screen.getByText('Tutor Graded');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-dark');
  });

  it('renders failed state correctly', () => {
    render(<Badge status="failed" />);
    const badge = screen.getByText('Failed');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-danger');
  });

  it('renders default fallback state for unknown status gracefully', () => {
    // Suppress prop-type warning for this specific test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Badge status="unknown_status" />);
    const badge = screen.getByText('unknown_status');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-light');
    consoleSpy.mockRestore();
  });
});
