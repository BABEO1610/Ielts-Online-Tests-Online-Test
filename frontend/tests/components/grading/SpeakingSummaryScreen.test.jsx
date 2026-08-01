import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SpeakingSummaryScreen from '../../../src/components/grading/SpeakingSummaryScreen';

const exam = { parts: [{ id: 'part-1' }, { id: 'part-2' }, { id: 'part-3' }] };
const completeAnswers = [1, 2, 3].map((part) => ({
  part_number: part,
  upload_token: `token-${part}`,
}));

describe('SpeakingSummaryScreen', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('does not submit when one Part has no completed upload', async () => {
    const onSubmit = vi.fn();
    render(<SpeakingSummaryScreen exam={exam} answers={completeAnswers.slice(0, 2)} onSubmit={onSubmit} />);

    expect(screen.getByRole('button', { name: /Nộp bài Speaking/i })).toBeDisabled();
    await act(async () => { await vi.advanceTimersByTimeAsync(61000); });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('explains that an AI failure remains in the AI retry flow', () => {
    render(<SpeakingSummaryScreen exam={exam} answers={completeAnswers} onSubmit={vi.fn()} />);
    expect(screen.getByText(/giữ trong luồng AI/i)).toBeInTheDocument();
    expect(screen.queryByText(/chuyển giáo viên/i)).not.toBeInTheDocument();
  });

  it('auto-submits only once after an error and still allows a manual retry', async () => {
    const onSubmit = vi.fn()
      .mockRejectedValueOnce(new Error('Provider tạm thời không khả dụng'))
      .mockResolvedValueOnce(undefined);
    render(<SpeakingSummaryScreen exam={exam} answers={completeAnswers} onSubmit={onSubmit} />);

    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Provider tạm thời không khả dụng')).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(onSubmit).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Nộp bài Speaking/i }));
    await act(async () => { await Promise.resolve(); });
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });
});
