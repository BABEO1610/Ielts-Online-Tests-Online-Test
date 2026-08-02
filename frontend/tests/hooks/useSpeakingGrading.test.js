import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import gradingService from '../../src/services/grading.service';
import useSpeakingGrading from '../../src/hooks/useSpeakingGrading';

vi.mock('../../src/services/grading.service', () => ({
  default: { getSpeakingGradingStatus: vi.fn() },
}));

describe('useSpeakingGrading', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    gradingService.getSpeakingGradingStatus.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it('stops polling on a terminal state', async () => {
    gradingService.getSpeakingGradingStatus
      .mockResolvedValueOnce({ data: { status: 'queued' } })
      .mockResolvedValueOnce({ data: { status: 'needs_review', result: null } });
    const { result, unmount } = renderHook(() => useSpeakingGrading('group-1'));
    await act(async () => { await Promise.resolve(); });
    expect(gradingService.getSpeakingGradingStatus).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(result.current.data?.status).toBe('needs_review');
    expect(result.current.isPolling).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(gradingService.getSpeakingGradingStatus).toHaveBeenCalledTimes(2);
    unmount();
  });

  it.each(['completed', 'failed'])('stops immediately on %s', async (status) => {
    gradingService.getSpeakingGradingStatus.mockResolvedValueOnce({ data: { status } });
    const { result, unmount } = renderHook(() => useSpeakingGrading('group-1'));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.data?.status).toBe(status);
    expect(result.current.isPolling).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(gradingService.getSpeakingGradingStatus).toHaveBeenCalledTimes(1);
    unmount();
  });
});
