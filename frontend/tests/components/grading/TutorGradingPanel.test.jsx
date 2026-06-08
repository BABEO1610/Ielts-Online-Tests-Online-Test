/**
 * Traceability Matrix:
 * - SPEC §3 TUT-02: Lấy Presigned URL để phát audio. Form 4 tiêu chí scores. Nút "Run Prelim Check". Gọi API submit grade.
 * - SPEC §4: UI UX logic, preview band score with IELTS rounding rule (6.25 -> 6.5, 6.875 -> 6.5, vv.)
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TutorGradingPanel, { calculatePreviewBand } from '../../../src/components/grading/TutorGradingPanel';
import gradingService from '../../../src/services/grading.service';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../../src/services/grading.service');

describe('TutorGradingPanel Component', () => {
  const mockSubmissionId = 'sub-123';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('IELTS Rounding Rule (calculatePreviewBand)', () => {
    it('rounds 6.25 to 6.5', () => {
      expect(calculatePreviewBand([6, 6, 6, 7])).toBe(6.5);
    });

    it('rounds 6.75 to 7.0', () => {
      expect(calculatePreviewBand([6, 7, 7, 7])).toBe(7.0);
    });

    it('rounds 6.125 to 6.0', () => {
      expect(calculatePreviewBand([6, 6, 6, 6.5])).toBe(6.0);
    });

    it('rounds 6.875 to 6.5', () => {
      expect(calculatePreviewBand([7, 7, 7, 6.5])).toBe(6.5);
    });
    
    it('rounds 6.5 to 6.5', () => {
      expect(calculatePreviewBand([6, 6, 7, 7])).toBe(6.5);
    });
  });

  describe('Component Rendering & Audio Fetching', () => {
    it('renders audio player for speaking type and fetches presigned URL', async () => {
      gradingService.getAudioUrl.mockResolvedValueOnce({
        success: true,
        data: { presigned_url: 'https://s3.aws/audio.mp3' }
      });

      render(<TutorGradingPanel submissionId={mockSubmissionId} type="speaking" />);
      
      expect(screen.getByText('Loading audio...')).toBeInTheDocument();
      
      await waitFor(() => {
        const audio = screen.getByTestId('audio-player');
        expect(audio).toHaveAttribute('src', 'https://s3.aws/audio.mp3');
      });
      
      expect(gradingService.getAudioUrl).toHaveBeenCalledWith(mockSubmissionId, 'speaking');
    });

    it('handles audio URL fetch error', async () => {
      gradingService.getAudioUrl.mockRejectedValueOnce({
        response: { data: { error: { message: 'IDOR Error' } } }
      });

      render(<TutorGradingPanel submissionId={mockSubmissionId} type="speaking" />);
      
      await waitFor(() => {
        expect(screen.getByText('IDOR Error')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('allows input of scores and submits successfully', async () => {
      gradingService.gradeSubmission.mockResolvedValueOnce({
        success: true,
        data: { report_id: 'rep-1' }
      });
      const onGradingCompleteMock = vi.fn();

      render(<TutorGradingPanel submissionId={mockSubmissionId} type="writing" onGradingComplete={onGradingCompleteMock} />);
      
      // Fill scores (Average = 6.25 -> 6.5)
      fireEvent.change(screen.getByTestId('input-task_achievement_score'), { target: { value: '6' } });
      fireEvent.change(screen.getByTestId('input-coherence_score'), { target: { value: '6' } });
      fireEvent.change(screen.getByTestId('input-lexical_score'), { target: { value: '6' } });
      fireEvent.change(screen.getByTestId('input-grammar_score'), { target: { value: '7' } });
      
      // Check preview score
      expect(screen.getByTestId('preview-band')).toHaveTextContent('6.5');
      
      // Fill feedback
      fireEvent.change(screen.getByTestId('textarea-feedback'), { target: { value: 'Good job!' } });
      
      // Submit
      fireEvent.click(screen.getByText('Submit Grade'));
      
      await waitFor(() => {
        expect(gradingService.gradeSubmission).toHaveBeenCalledWith(mockSubmissionId, {
          type: 'writing',
          band_score: 6.5,
          task_achievement_score: 6,
          coherence_score: 6,
          lexical_score: 6,
          grammar_score: 7,
          written_feedback: 'Good job!'
        });
        expect(onGradingCompleteMock).toHaveBeenCalledWith('rep-1');
      });
    });

    it('handles submit error', async () => {
      gradingService.gradeSubmission.mockRejectedValueOnce({
        response: { data: { error: { message: 'Failed validation' } } }
      });

      render(<TutorGradingPanel submissionId={mockSubmissionId} type="writing" />);
      
      fireEvent.change(screen.getByTestId('input-task_achievement_score'), { target: { value: '6' } });
      fireEvent.change(screen.getByTestId('input-coherence_score'), { target: { value: '6' } });
      fireEvent.change(screen.getByTestId('input-lexical_score'), { target: { value: '6' } });
      fireEvent.change(screen.getByTestId('input-grammar_score'), { target: { value: '6' } });
      fireEvent.change(screen.getByTestId('textarea-feedback'), { target: { value: 'Msg' } });
      
      fireEvent.click(screen.getByText('Submit Grade'));
      
      await waitFor(() => {
        expect(screen.getByText('Failed validation')).toBeInTheDocument();
      });
    });
  });

  describe('Prelim Check', () => {
    it('runs prelim check successfully', async () => {
      gradingService.runPrelimCheck.mockResolvedValueOnce({
        success: true,
        data: { highlights: { grammar: ['error 1'] } }
      });

      render(<TutorGradingPanel submissionId={mockSubmissionId} type="writing" />);
      
      fireEvent.click(screen.getByText('Run AI Prelim Check'));
      
      expect(screen.getByText('Running...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('AI Prelim Highlights')).toBeInTheDocument();
        expect(screen.getByText(/"grammar": \[\s*"error 1"\s*\]/)).toBeInTheDocument();
      });
    });
  });
});
