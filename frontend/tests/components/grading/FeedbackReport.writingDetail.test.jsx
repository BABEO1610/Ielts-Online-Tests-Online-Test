/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FeedbackReport from '../../../src/components/grading/FeedbackReport';
import gradingService from '../../../src/services/grading.service';
import useGradingSocket from '../../../src/hooks/useGradingSocket';

vi.mock('../../../src/services/grading.service');
vi.mock('../../../src/hooks/useGradingSocket');

const aiTask = (taskNumber, overallBand, firstCriterionBand) => ({
  taskNumber,
  prompt: `Prompt ${taskNumber}`,
  studentResponse: `Student response ${taskNumber}`,
  wordCount: taskNumber === 1 ? 226 : 358,
  aiFeedback: {
    status: 'completed',
    overallBand,
    criterionScores: {
      taskAchievementOrResponse: {
        band: firstCriterionBand,
        feedback: `Criterion feedback ${taskNumber}`,
      },
      coherenceCohesion: { band: 7.0, feedback: 'Coherence feedback' },
      lexicalResource: { band: 6.5, feedback: 'Lexical feedback' },
      grammarRangeAccuracy: { band: 6.0, feedback: 'Grammar feedback' },
    },
    summary: `Summary task ${taskNumber}`,
    strengths: ['Clear organization'],
    majorErrors: [
      { error: 'bad phrase', explanation: 'Chưa tự nhiên', correction: 'better phrase' },
    ],
    actionPlan: ['Plan before writing'],
  },
  tutorGrade: null,
});

describe('FeedbackReport Writing detail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGradingSocket.mockReturnValue({ socket: null });
  });

  it('does not render tutor feedback placeholder when grader is ai', async () => {
    gradingService.getFeedback.mockResolvedValue({
      success: true,
      data: {
        submissionId: 'group-1',
        testTitle: 'IELTS Writing',
        skill: 'writing',
        grader: 'ai',
        aiStatus: 'completed',
        tutorStatus: 'pending',
        tasks: [
          aiTask(1, 6.5, 6.0),
          aiTask(2, 7.5, 7.0),
        ],
      },
    });

    render(<FeedbackReport submissionId="group-1" type="writing" />);

    await waitFor(() => {
      expect(screen.getByText('Summary task 1')).toBeInTheDocument();
    });

    expect(screen.queryByText('Chưa có tutor feedback cho task này.')).not.toBeInTheDocument();
    expect(screen.getByText('Task Achievement')).toBeInTheDocument();
    expect(screen.getByText('Overall Writing Band')).toBeInTheDocument();
    expect(screen.getByText('Task 1 × 33% + Task 2 × 67% — chuẩn IELTS Academic')).toBeInTheDocument();
    expect(screen.getByText('7.2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Task 2' }));

    expect(screen.getByText('Task Response')).toBeInTheDocument();
  });
});
