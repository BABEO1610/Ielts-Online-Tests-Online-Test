import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  default as FeedbackReport,
  SpeakingFeedbackDetail,
  WritingFeedbackDetail,
} from '../../../src/components/grading/FeedbackReport';
import gradingService from '../../../src/services/grading.service';
import useGradingSocket from '../../../src/hooks/useGradingSocket';

vi.mock('../../../src/services/grading.service', () => ({
  default: {
    getFeedback: vi.fn(),
    getAudioUrl: vi.fn(),
    retrySpeakingGrading: vi.fn(),
    requestAiGrading: vi.fn(),
  },
}));
vi.mock('../../../src/hooks/useGradingSocket', () => ({ default: vi.fn() }));

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
  beforeEach(() => {
    vi.clearAllMocks();
    useGradingSocket.mockReturnValue({ socket: null });
  });

  it('redacts every band when the job needs human review', () => {
    const { container } = render(<SpeakingFeedbackDetail data={{
      ...base,
      gradingStatus: 'needs_review',
      aiStatus: 'needs_review',
      overallSpeakingBand: null,
      aiFeedback: null,
    }} />);

    expect(screen.getByText(/trạng thái dữ liệu AI legacy/i)).toBeInTheDocument();
    expect(screen.queryByText(/chuyển cho tutor/i)).not.toBeInTheDocument();
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
          fluencyCoherence: { band: 6.5, evidence_status: 'sufficient' },
          lexicalResource: { band: 6.5, evidence_status: 'sufficient' },
          grammaticalRangeAccuracy: { band: 6.5, evidence_status: 'sufficient' },
          pronunciation: { band: 6.5, evidence_status: 'sufficient' },
        },
        disclaimer: 'AI Estimated Band — kết quả tham khảo.',
      },
    }} />);
    expect(screen.getAllByText('6.5').length).toBeGreaterThanOrEqual(5);
    expect(screen.getByText('AI Estimated Band — kết quả tham khảo.')).toBeInTheDocument();
  });

  it('renders each immutable transcript, Part feedback and audio warning on the matching Part', () => {
    render(<SpeakingFeedbackDetail data={{
      ...base,
      parts: [3, 1, 2].map((partNumber) => ({
        submissionId: `part-${partNumber}`,
        partNumber,
        prompt: `Prompt ${partNumber}`,
        transcript: `Fallback ${partNumber}`,
        aiPartFeedback: {
          part_number: partNumber,
          display_transcript: `Transcript ${partNumber}`,
          feedback: `Feedback ${partNumber}`,
          audio_quality_warnings: [`warning-${partNumber}`],
        },
      })),
      gradingStatus: 'failed',
      aiStatus: 'failed',
      canRetry: false,
    }} />);

    [1, 2, 3].forEach((partNumber) => {
      expect(screen.getByText(`Transcript ${partNumber}`)).toBeInTheDocument();
      expect(screen.getByText(`Feedback ${partNumber}`)).toBeInTheDocument();
      expect(screen.getByText(`warning-${partNumber}`)).toBeInTheDocument();
    });
  });

  it('offers the first of two manual retries for a failed job', () => {
    const onRetry = vi.fn();
    render(<SpeakingFeedbackDetail data={{
      ...base,
      gradingStatus: 'failed',
      aiStatus: 'failed',
      canRetry: true,
      overallSpeakingBand: null,
      aiFeedback: null,
    }} onRetry={onRetry} />);

    expect(screen.getByRole('button', { name: /Chấm lại bằng AI \(còn 2 lượt\)/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Chấm lại bằng AI/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows one retry remaining after the first retry fails', () => {
    render(<SpeakingFeedbackDetail data={{
      ...base,
      gradingStatus: 'failed',
      aiStatus: 'failed',
      canRetry: true,
      manualRetryCount: 1,
      manualRetryLimit: 2,
      overallSpeakingBand: null,
      aiFeedback: null,
    }} onRetry={vi.fn()} />);

    expect(screen.getByRole('button', { name: /còn 1 lượt/ })).toBeInTheDocument();
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

    expect(screen.queryByRole('button', { name: /Chấm lại bằng AI/ })).not.toBeInTheDocument();
  });

  it.each([
    ['queued', false],
    ['running', false],
    ['retry_wait', false],
    ['completed', false],
    ['failed', false],
  ])('does not show manual retry for %s when canRetry=%s', (gradingStatus, canRetry) => {
    render(<SpeakingFeedbackDetail data={{
      ...base,
      gradingStatus,
      aiStatus: gradingStatus,
      canRetry,
      overallSpeakingBand: null,
      aiFeedback: null,
    }} onRetry={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Chấm lại bằng AI/ })).not.toBeInTheDocument();
  });

  it('shows a safe per-Part signed-audio error and can request a fresh URL', async () => {
    gradingService.getFeedback.mockResolvedValue({
      success: true,
      data: {
        ...base,
        gradingStatus: 'failed',
        aiStatus: 'failed',
        canRetry: false,
      },
    });
    gradingService.getAudioUrl
      .mockResolvedValueOnce({ data: { url: 'https://audio.invalid/part-1' } })
      .mockRejectedValueOnce({ response: { status: 403, data: { error: { code: 'AUTH_PERM_001' } } } })
      .mockResolvedValueOnce({ data: { url: 'https://audio.invalid/part-3' } });

    const { container } = render(<FeedbackReport submissionId="group-1" type="speaking" />);
    expect(await screen.findByText(/không có quyền nghe audio/i)).toBeInTheDocument();
    expect(container.querySelectorAll('audio')).toHaveLength(2);

    gradingService.getAudioUrl.mockResolvedValueOnce({ data: { url: 'https://audio.invalid/part-2-new' } });
    fireEvent.click(screen.getByRole('button', { name: /Thử tải lại audio Part 2/i }));
    await waitFor(() => expect(container.querySelectorAll('audio')).toHaveLength(3));
    expect(gradingService.getAudioUrl).toHaveBeenLastCalledWith('part-2', 'speaking');
  });

  it('polls the canonical child job after manual retry and stops at completed', async () => {
    vi.useFakeTimers();
    const failed = {
      ...base,
      gradingStatus: 'failed',
      gradingStage: 'failed',
      aiStatus: 'failed',
      canRetry: true,
    };
    const queued = {
      ...failed,
      gradingStatus: 'queued',
      gradingStage: 'queued',
      aiStatus: 'queued',
      canRetry: false,
    };
    const completed = {
      ...queued,
      gradingStatus: 'completed',
      gradingStage: 'completed',
      aiStatus: 'completed',
      overallSpeakingBand: 6.5,
      aiFeedback: {
        evidenceMode: 'full_audio',
        overallBand: 6.5,
        criterionScores: Object.fromEntries([
          'fluencyCoherence', 'lexicalResource', 'grammaticalRangeAccuracy', 'pronunciation',
        ].map((key) => [key, { band: 6.5, evidence_status: 'sufficient' }])),
      },
    };
    gradingService.getFeedback
      .mockResolvedValueOnce({ success: true, data: failed })
      .mockResolvedValueOnce({ success: true, data: queued })
      .mockResolvedValueOnce({ success: true, data: completed });
    gradingService.getAudioUrl.mockResolvedValue({ data: { url: 'https://audio.invalid/fresh' } });
    gradingService.retrySpeakingGrading.mockResolvedValue({
      data: { job_id: 'canonical-child-job', status: 'queued', stage: 'queued' },
    });

    render(<FeedbackReport submissionId="group-1" type="speaking" />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    fireEvent.click(screen.getByRole('button', { name: /Chấm lại bằng AI/ }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(gradingService.retrySpeakingGrading).toHaveBeenCalledWith('group-1');
    expect(gradingService.getFeedback).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/Bài đã vào hàng đợi/i)).toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(gradingService.getFeedback).toHaveBeenCalledTimes(3);
    expect(screen.getAllByText('6.5').length).toBeGreaterThanOrEqual(5);

    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(gradingService.getFeedback).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
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
