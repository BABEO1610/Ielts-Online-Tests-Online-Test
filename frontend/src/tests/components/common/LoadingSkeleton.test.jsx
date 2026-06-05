/*
Traceability Matrix:
- Task: T039_D (Shared UI Elements)
- SPEC: §3 UX Requirements
- Test Cases:
  1. Renders default skeleton correctly (Happy Path)
  2. Applies custom width and height (Happy Path)
  3. Applies circular type correctly (Boundary)
*/
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoadingSkeleton from '../../../components/common/LoadingSkeleton';

describe('LoadingSkeleton Component', () => {
  it('renders default skeleton with default styles', () => {
    render(<LoadingSkeleton />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('placeholder');
    expect(skeleton.style.width).toBe('100%');
    expect(skeleton.style.height).toBe('20px');
  });

  it('applies custom width and height', () => {
    render(<LoadingSkeleton width="200px" height="50px" />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton.style.width).toBe('200px');
    expect(skeleton.style.height).toBe('50px');
  });

  it('applies circular type class correctly', () => {
    render(<LoadingSkeleton type="circular" width="50px" height="50px" />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('rounded-circle');
  });
});
