/**
 * @vitest-environment jsdom
 * 
 * Traceability Matrix:
 * - SPEC §3 STU-09: Component displays Band Score, criteria scores, error highlights.
 * - SPEC §4 NFR-02, FR-05: Realtime feedback update via WebSocket (grading_complete).
 * - User Request: Socket cleanup and duplicate listener prevention.
 * - User Request: Pending UI with spinner-border.
 * - User Request: Success UI with primary/success text and card layout.
 * - User Request: Initial fetch of GET /submissions/:id/feedback
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FeedbackReport from '../../../components/grading/FeedbackReport';
import gradingService from '../../../services/grading.service';
import useGradingSocket from '../../../hooks/useGradingSocket';

vi.mock('../../../services/grading.service');
vi.mock('../../../hooks/useGradingSocket');

describe('FeedbackReport Component', () => {
  let mockSocket;
  let socketEventHandlers = {};

  beforeEach(() => {
    socketEventHandlers = {};
    mockSocket = {
      on: vi.fn((event, handler) => {
        socketEventHandlers[event] = handler;
      }),
      off: vi.fn((event, handler) => {
        if (socketEventHandlers[event] === handler) {
          delete socketEventHandlers[event];
        }
      })
    };

    useGradingSocket.mockReturnValue({
      socket: mockSocket,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders pending state initially when loading', async () => {
    gradingService.getFeedback.mockImplementation(() => new Promise(() => {})); // pending promise
    
    render(<FeedbackReport submissionId="sub-1" type="writing" />);
    
    expect(screen.getByText('Bài làm của bạn đang được chấm...')).toBeInTheDocument();
    expect(document.querySelector('.spinner-border')).toBeInTheDocument();
  });

  it('fetches feedback on mount and renders success UI with overall band score', async () => {
    const mockReportData = {
      success: true,
      data: {
        ai_report: {
          band_score: 6.5,
          task_achievement_score: 6.0,
          coherence_score: 7.0,
          lexical_score: 6.0,
          grammar_score: 6.5,
          suggestions: 'Good job.'
        }
      }
    };
    gradingService.getFeedback.mockResolvedValue(mockReportData);

    render(<FeedbackReport submissionId="sub-1" type="writing" />);

    await waitFor(() => {
      expect(gradingService.getFeedback).toHaveBeenCalledWith('sub-1', 'writing');
    });

    expect(screen.getAllByText('6.5').length).toBeGreaterThan(0);
    expect(screen.getByText('Graded by AI')).toBeInTheDocument();
    expect(screen.getByText('Task Achievement / Response')).toBeInTheDocument();
  });

  it('renders tutor report if present', async () => {
    const mockReportData = {
      success: true,
      data: {
        tutor_report: {
          band_score: 7.5,
          task_achievement_score: 8.0,
          coherence_score: 7.0,
          lexical_score: 7.5,
          grammar_score: 7.0,
          written_feedback: 'Excellent work.'
        }
      }
    };
    gradingService.getFeedback.mockResolvedValue(mockReportData);

    render(<FeedbackReport submissionId="sub-2" type="writing" />);

    await waitFor(() => {
      expect(screen.getAllByText('7.5').length).toBeGreaterThan(0);
    });
    
    expect(screen.getByText('Graded by Tutor')).toBeInTheDocument();
    expect(screen.getByText('Excellent work.')).toBeInTheDocument();
  });

  it('renders speaking criteria if provided', async () => {
    const mockReportData = {
      success: true,
      data: {
        ai_report: {
          band_score: 6.0,
          fluency_score: 6.5,
          pronunciation_score: 5.5,
        }
      }
    };
    gradingService.getFeedback.mockResolvedValue(mockReportData);

    render(<FeedbackReport submissionId="sub-speak-1" type="speaking" />);

    await waitFor(() => {
      expect(screen.getByText('Fluency & Coherence')).toBeInTheDocument();
      expect(screen.getByText('6.5')).toBeInTheDocument();
      expect(screen.getByText('Pronunciation')).toBeInTheDocument();
      expect(screen.getByText('5.5')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    gradingService.getFeedback.mockRejectedValue({
      response: { data: { error: { message: 'Not found' } } }
    });

    render(<FeedbackReport submissionId="sub-3" type="writing" />);

    await waitFor(() => {
      expect(screen.getByText('Not found')).toBeInTheDocument();
    });
  });

  it('cleans up socket listeners on unmount (prevent memory leak)', async () => {
    gradingService.getFeedback.mockResolvedValue({
      success: true,
      data: { ai_report: { band_score: 6.0 } }
    });

    const { unmount } = render(<FeedbackReport submissionId="sub-1" type="writing" />);
    
    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith('grading_complete', expect.any(Function));
    });

    const offSpy = mockSocket.off;
    unmount();

    expect(offSpy).toHaveBeenCalledWith('grading_complete', expect.any(Function));
    expect(offSpy).toHaveBeenCalledWith('grading_failed', expect.any(Function));
  });

  it('refetches data when grading_complete event is received for the same submission', async () => {
    gradingService.getFeedback.mockResolvedValue({
      success: true,
      data: { ai_report: { band_score: 5.0 } }
    });

    render(<FeedbackReport submissionId="sub-1" type="writing" />);
    
    await waitFor(() => {
      expect(gradingService.getFeedback).toHaveBeenCalledTimes(1);
    });

    act(() => {
      if (socketEventHandlers['grading_complete']) {
        socketEventHandlers['grading_complete']({ submission_id: 'sub-1' });
      }
    });

    await waitFor(() => {
      expect(gradingService.getFeedback).toHaveBeenCalledTimes(2);
    });
  });

  it('does not refetch data if grading_complete is for a different submission', async () => {
    gradingService.getFeedback.mockResolvedValue({
      success: true,
      data: { ai_report: { band_score: 5.0 } }
    });

    render(<FeedbackReport submissionId="sub-1" type="writing" />);
    
    await waitFor(() => {
      expect(gradingService.getFeedback).toHaveBeenCalledTimes(1);
    });

    act(() => {
      if (socketEventHandlers['grading_complete']) {
        socketEventHandlers['grading_complete']({ submission_id: 'sub-2' }); // different
      }
    });

    expect(gradingService.getFeedback).toHaveBeenCalledTimes(1);
  });

  it('updates state to error when grading_failed event is received for the same submission', async () => {
    gradingService.getFeedback.mockResolvedValue({
      success: true,
      data: { ai_report: null, tutor_report: null }
    });

    render(<FeedbackReport submissionId="sub-1" type="writing" />);
    
    await waitFor(() => {
      expect(gradingService.getFeedback).toHaveBeenCalledTimes(1);
    });

    act(() => {
      if (socketEventHandlers['grading_failed']) {
        socketEventHandlers['grading_failed']({ submission_id: 'sub-1' });
      }
    });

    await waitFor(() => {
      expect(screen.getByText('Chấm bài thất bại, quota đã được hoàn trả.')).toBeInTheDocument();
    });
  });
});
