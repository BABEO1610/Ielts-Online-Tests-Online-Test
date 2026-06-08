import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TimerBar from '../../../src/components/objective-testing/TimerBar';

// Traceability: SPEC.md - Mục 3.1 & Thiết kế UX/UI cho phép test thời gian thực/đếm ngược
describe('TimerBar Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('counts down in real test mode', () => {
    render(<TimerBar durationMinutes={1} practiceMode={false} />);
    expect(screen.getByText('01:00')).toBeInTheDocument();
    
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('00:59')).toBeInTheDocument();
  });

  it('counts up in practice mode', () => {
    render(<TimerBar durationMinutes={1} practiceMode={true} />);
    expect(screen.getByText('00:00')).toBeInTheDocument();
    
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('00:01')).toBeInTheDocument();
  });

  it('counts down in practice mode with custom time limit', () => {
    render(<TimerBar durationMinutes={1} practiceMode={true} customTimeLimit={2} />);
    expect(screen.getByText('02:00')).toBeInTheDocument();
    
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('01:59')).toBeInTheDocument();
  });

  it('calls onTimeUp when countdown reaches zero', () => {
    const handleTimeUp = vi.fn();
    render(<TimerBar durationMinutes={1} practiceMode={false} onTimeUp={handleTimeUp} />);
    
    // EARS[State-driven]: WHEN timer reaches zero THEN trigger onTimeUp
    act(() => {
      vi.advanceTimersByTime(60000); // 60s
    });
    expect(handleTimeUp).toHaveBeenCalledTimes(1);
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });
});
