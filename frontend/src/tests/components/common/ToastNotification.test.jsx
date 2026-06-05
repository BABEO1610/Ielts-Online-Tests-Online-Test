/*
Traceability Matrix:
- Task: T039_D (Shared UI Elements)
- SPEC: §3 UX Requirements
- Test Cases:
  1. Renders the message successfully (Happy Path)
  2. Calls onClose when close button is clicked (Happy Path)
  3. Calls onClose automatically after duration (Happy Path)
  4. Does not render when message is empty (Error Case)
  5. Correctly applies type classes (Boundary)
*/
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ToastNotification from '../../../components/common/ToastNotification';

describe('ToastNotification Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the message correctly', () => {
    const handleClose = vi.fn();
    render(<ToastNotification message="Test success!" type="success" onClose={handleClose} />);
    
    expect(screen.getByText('Test success!')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('text-bg-success');
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<ToastNotification message="Test info" type="info" onClose={handleClose} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose automatically after specified duration', () => {
    const handleClose = vi.fn();
    render(<ToastNotification message="Auto close" onClose={handleClose} duration={1000} />);
    
    expect(handleClose).not.toHaveBeenCalled();
    
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not render anything if message is empty', () => {
    const handleClose = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<ToastNotification message="" onClose={handleClose} />);
    expect(container).toBeEmptyDOMElement();
    consoleSpy.mockRestore();
  });

  it('correctly applies error type class', () => {
    const handleClose = vi.fn();
    render(<ToastNotification message="Test error" type="error" onClose={handleClose} />);
    expect(screen.getByRole('alert')).toHaveClass('text-bg-danger');
  });
});
