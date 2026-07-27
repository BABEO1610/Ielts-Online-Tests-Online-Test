import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  SpeakingFeedbackDetail,
  WritingFeedbackDetail,
} from '../../../src/components/grading/FeedbackReport';

const base = {
  testTitle: 'Speaking mock test',
  parts: [1, 2, 3].map((partNumber) => ({
    submissionId: `part-${partNumber}`,
    partNumber,
    prompt: `Prompt ${partNumber}`,
    transcript: '',
  })),
};

describe('Speaking async learner feedback', () => {
  it('redacts every band when the job needs human review', () => {
    const { container } = render(<SpeakingFeedbackDetail data={{
      ...base,
      gradingStatus: 'needs_review',
      aiStatus: 'needs_review',
      overallSpeakingBand: null,
      aiFeedback: null,
    }} />);

    expect(screen.getByText(/Evidence hiện tại chưa đủ/i)).toBeInTheDocument();
    expect(screen.getByText(/Transcript đơn thuần không đủ/i)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\b0\.0\b/);
    expect(container.textContent).not.toMatch(/Band\s+[0-9]/i);
  });

  it('renders bands only for completed full-audio evidence', () => {
    render(<SpeakingFeedbackDetail data={{
      ...base,
      gradingStatus: 'completed',
      aiStatus: 'completed',
      overallSpeakingBand: 6.5,
      aiFeedback: {
        evidenceMode: 'full_audio',
        overallBand: 6.5,
        criterionScores: {
          fluencyCoherence: { band: 6.5 },
          lexicalResource: { band: 6.5 },
          grammaticalRangeAccuracy: { band: 6.5 },
          pronunciation: { band: 6.5 },
        },
      },
    }} />);
    expect(screen.getAllByText('6.5').length).toBeGreaterThanOrEqual(5);
  });

  it('offers the one manual retry for every failed job', () => {
    const onRetry = vi.fn();
    render(<SpeakingFeedbackDetail data={{
      ...base,
      gradingStatus: 'failed',
      aiStatus: 'failed',
      canRetry: true,
      overallSpeakingBand: null,
      aiFeedback: null,
    }} onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: 'Chấm lại bằng AI' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show a Speaking retry action after a successful first attempt', () => {
    render(<SpeakingFeedbackDetail data={{
      ...base,
      gradingStatus: 'completed',
      aiStatus: 'completed',
      canRetry: false,
      overallSpeakingBand: 6.5,
      aiFeedback: {
        evidenceMode: 'full_audio',
        overallBand: 6.5,
        criterionScores: {},
      },
    }} onRetry={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Chấm lại bằng AI' })).not.toBeInTheDocument();
  });
});

describe('Writing AI retry action', () => {
  const writingBase = {
    aiStatus: 'failed',
    grader: 'ai',
    tasks: [{
      submissionId: 'writing-task-1',
      taskNumber: 1,
      prompt: 'Describe the chart.',
      studentResponse: 'A sufficiently long student response.',
      wordCount: 173,
      aiFeedback: { status: 'failed', errorMessage: 'provider unavailable' },
    }],
  };

  it('shows retry only for a failed Writing task', () => {
    const onRetryTask = vi.fn();
    render(<WritingFeedbackDetail data={writingBase} onRetryTask={onRetryTask} />);

    fireEvent.click(screen.getByRole('button', { name: 'Chấm lại Task 1 bằng AI' }));
    expect(onRetryTask).toHaveBeenCalledWith('writing-task-1');
  });

  it('does not show retry after first-attempt success', () => {
    render(<WritingFeedbackDetail data={{
      ...writingBase,
      aiStatus: 'completed',
      tasks: [{
        ...writingBase.tasks[0],
        aiFeedback: { status: 'completed', overallBand: 6.5 },
      }],
    }} onRetryTask={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /Chấm lại Task 1 bằng AI/ })).not.toBeInTheDocument();
  });
});
