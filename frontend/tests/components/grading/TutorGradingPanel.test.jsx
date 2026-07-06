import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TutorGradingPanel from '../../../src/components/grading/TutorGradingPanel';
import { calculatePreviewBand } from '../../../src/utils/ieltsScoring';
import gradingService from '../../../src/services/grading.service';

vi.mock('../../../src/services/grading.service');

describe('TutorGradingPanel Component', () => {
  const mockSubmissionId = 'sub-123';
  const defaultProps = {
    submissionId: mockSubmissionId,
    type: 'writing',
    activeTaskId: 'task-1',
    activeTaskNumber: 1,
    tasks: [{ id: 'task-1', name: 'Task 1' }],
  };

  const renderPanel = (props = {}) =>
    render(
      <MemoryRouter>
        <TutorGradingPanel {...defaultProps} {...props} />
      </MemoryRouter>
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('IELTS Rounding Rule (calculatePreviewBand)', () => {
    it('rounds averages to the nearest half band', () => {
      expect(calculatePreviewBand([6, 6, 6, 7])).toBe(6.5);
      expect(calculatePreviewBand([6, 7, 7, 7])).toBe(7.0);
      expect(calculatePreviewBand([6, 6, 6, 6.5])).toBe(6.0);
      expect(calculatePreviewBand([7, 7, 7, 6.5])).toBe(7.0);
      expect(calculatePreviewBand([6, 6, 7, 7])).toBe(6.5);
    });
  });

  describe('Component Rendering', () => {
    it('renders audio player for speaking type when audioUrl is provided', () => {
      renderPanel({
        type: 'speaking',
        activeTaskId: 'part-1',
        activeTaskNumber: 1,
        tasks: [{ id: 'part-1', name: 'Part 1' }],
        audioUrl: 'https://cdn.example/audio.mp3',
      });

      expect(screen.getByTestId('audio-player')).toHaveAttribute(
        'src',
        'https://cdn.example/audio.mp3'
      );
    });
  });

  describe('Form Submission', () => {
    it('allows input of writing scores and submits successfully', async () => {
      gradingService.gradeSubmission.mockResolvedValueOnce({
        success: true,
        data: { report_id: 'rep-1' },
      });
      const onGradingCompleteMock = vi.fn();

      renderPanel({ onGradingComplete: onGradingCompleteMock });

      fireEvent.change(screen.getByTestId('input-taskAchievementScore'), { target: { value: '6' } });
      fireEvent.change(screen.getByTestId('input-coherenceScore'), { target: { value: '6' } });
      fireEvent.change(screen.getByTestId('input-lexicalScore'), { target: { value: '6' } });
      fireEvent.change(screen.getByTestId('input-grammarScore'), { target: { value: '7' } });
      expect(screen.getByTestId('preview-band')).toHaveTextContent('6.5');

      fireEvent.change(screen.getByTestId('textarea-feedback'), { target: { value: 'Good job!' } });
      fireEvent.click(screen.getByText('Submit Grade'));

      await waitFor(() => {
        expect(gradingService.gradeSubmission).toHaveBeenCalledWith('writing', mockSubmissionId, {
          writtenFeedback: 'Good job!',
          bandScore: 6.5,
          taskNumber: 1,
          taskAchievementScore: 6,
          coherenceScore: 6,
          lexicalScore: 6,
          grammarScore: 7,
        });
        expect(onGradingCompleteMock).toHaveBeenCalledWith({ report_id: 'rep-1' });
      });
    });

    it('handles submit error', async () => {
      gradingService.gradeSubmission.mockRejectedValueOnce({
        response: { data: { error: { message: 'Failed validation' } } },
      });

      renderPanel();

      fireEvent.change(screen.getByTestId('input-taskAchievementScore'), { target: { value: '6' } });
      fireEvent.change(screen.getByTestId('input-coherenceScore'), { target: { value: '6' } });
      fireEvent.change(screen.getByTestId('input-lexicalScore'), { target: { value: '6' } });
      fireEvent.change(screen.getByTestId('input-grammarScore'), { target: { value: '6' } });
      fireEvent.change(screen.getByTestId('textarea-feedback'), { target: { value: 'Msg' } });
      fireEvent.click(screen.getByText('Submit Grade'));

      await waitFor(() => {
        expect(screen.getByText('Failed validation')).toBeInTheDocument();
      });
    });

    it('shows a queue return button after completing tutor grading', async () => {
      gradingService.gradeSubmission.mockResolvedValueOnce({
        success: true,
        data: { tutorStatus: 'graded' },
      });

      renderPanel();

      fireEvent.change(screen.getByTestId('input-taskAchievementScore'), { target: { value: '7' } });
      fireEvent.change(screen.getByTestId('input-coherenceScore'), { target: { value: '7' } });
      fireEvent.change(screen.getByTestId('input-lexicalScore'), { target: { value: '7' } });
      fireEvent.change(screen.getByTestId('input-grammarScore'), { target: { value: '7' } });
      fireEvent.change(screen.getByTestId('textarea-feedback'), { target: { value: 'Completed.' } });
      fireEvent.click(screen.getByText('Submit Grade'));

      await waitFor(() => {
        expect(screen.getByText('Quay lại hàng chờ chấm')).toBeInTheDocument();
      });
    });
  });

  describe('Prelim Check', () => {
    it('runs prelim check for the active writing task', async () => {
      gradingService.runPrelimCheck.mockResolvedValueOnce({
        success: true,
        data: {
          suggestedCriteria: {
            taskAchievementOrResponse: 6,
            coherenceCohesion: 6,
            lexicalResource: 6.5,
            grammaticalRangeAccuracy: 6,
          },
          feedbackDraft: 'Needs clearer support.',
          keyProblems: ['support'],
        },
      });

      renderPanel();
      fireEvent.click(screen.getByText('Run AI Prelim Check'));

      await waitFor(() => {
        expect(gradingService.runPrelimCheck).toHaveBeenCalledWith('writing', mockSubmissionId, 1);
        expect(screen.getByTestId('textarea-feedback')).toHaveValue('Needs clearer support.');
      });
    });

    it('keeps speaking prelim feedback shared when switching parts', async () => {
      gradingService.runPrelimCheck.mockResolvedValueOnce({
        success: true,
        data: {
          suggestedCriteria: {
            fluencyScore: 6,
            lexicalScore: 6,
            grammarScore: 5.5,
            pronunciationScore: 6,
          },
          feedbackDraft: 'Overall speaking feedback for all 3 parts.',
          keyProblems: ['grammar'],
          aiFeedback: {
            submissionType: 'speaking',
            overallBand: 6,
            criterionScores: {
              fluencyCoherence: { band: 6, feedback: 'Mostly coherent.' },
              lexicalResource: { band: 6, feedback: 'Adequate range.' },
              grammaticalRangeAccuracy: { band: 5.5, feedback: 'Frequent slips.' },
              pronunciation: { band: 6, feedback: 'Generally clear.' },
            },
          },
        },
      });

      const speakingProps = {
        ...defaultProps,
        type: 'speaking',
        activeTaskId: 'part-1',
        activeTaskNumber: 1,
        tasks: [
          { id: 'part-1', name: 'Part 1' },
          { id: 'part-2', name: 'Part 2' },
          { id: 'part-3', name: 'Part 3' },
        ],
      };

      const { rerender } = render(
        <MemoryRouter>
          <TutorGradingPanel {...speakingProps} />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText('Run AI Prelim Check'));

      await waitFor(() => {
        expect(screen.getByText('Grading Panel - Speaking Session')).toBeInTheDocument();
        expect(screen.getByTestId('textarea-feedback')).toHaveValue('Overall speaking feedback for all 3 parts.');
        expect(screen.getByTestId('input-fluencyScore')).toHaveValue('6');
      });

      rerender(
        <MemoryRouter>
          <TutorGradingPanel {...speakingProps} activeTaskId="part-2" activeTaskNumber={2} />
        </MemoryRouter>
      );

      expect(screen.getByText('Grading Panel - Speaking Session')).toBeInTheDocument();
      expect(screen.getByTestId('textarea-feedback')).toHaveValue('Overall speaking feedback for all 3 parts.');
      expect(screen.getByTestId('input-fluencyScore')).toHaveValue('6');
    });
  });
});
