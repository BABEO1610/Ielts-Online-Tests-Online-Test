import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WritingEditor from '../../../components/grading/WritingEditor';
import gradingService from '../../../services/grading.service';
import { useAuth } from '../../../context/AuthContext';

/**
 * TRACEABILITY MATRIX
 *
 * Requirement ID | Test Case
 * ---------------------------------------------------------------------------
 * STU-07         | renders textarea with character count limit of 5000
 * FR-01          | submits writing data successfully with selected grader
 * FR-02          | disables textarea and submit button when status is pending
 * Unwanted       | shows error toast when submission fails (e.g. quota zero or API error)
 * Boundary       | blocks typing more than 5000 characters
 */

// Mock the grading service
vi.mock('../../../services/grading.service', () => ({
  default: {
    submitWriting: vi.fn(),
  },
}));

// Mock useAuth
vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('WritingEditor Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { ai_grading_quota_remaining: 10 } });
  });

  const defaultProps = {
    testId: 'test-123',
    taskNumber: 1,
    promptText: 'Some prompt text',
    status: 'new',
    onSubmitSuccess: vi.fn(),
  };

  it('renders textarea with character count limit of 5000 (STU-07)', () => {
    render(<WritingEditor {...defaultProps} />);
    
    const textarea = screen.getByLabelText(/Writing response/i);
    expect(textarea).toBeInTheDocument();
    
    const limitText = screen.getByText(/Giới hạn: 5000 ký tự/i);
    expect(limitText).toBeInTheDocument();
  });

  it('submits writing data successfully with selected grader (FR-01)', async () => {
    const mockResponse = { success: true, data: { id: 'sub-1' } };
    gradingService.submitWriting.mockResolvedValueOnce(mockResponse);

    render(<WritingEditor {...defaultProps} />);
    
    const textarea = screen.getByLabelText(/Writing response/i);
    fireEvent.change(textarea, { target: { value: 'This is my IELTS writing task response.' } });

    // Select AI grader
    const aiRadio = screen.getByLabelText(/AI Chấm điểm/i);
    fireEvent.click(aiRadio);

    const submitBtn = screen.getByRole('button', { name: /Nộp bài/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(gradingService.submitWriting).toHaveBeenCalledWith({
        test_id: 'test-123',
        task_number: 1,
        prompt_text: 'Some prompt text',
        response_text: 'This is my IELTS writing task response.',
        grader: 'ai'
      });
    });

    expect(defaultProps.onSubmitSuccess).toHaveBeenCalledWith(mockResponse);
    expect(screen.getByText(/Nộp bài thành công!/i)).toBeInTheDocument();
  });

  it('disables textarea and submit button when status is pending (FR-02)', () => {
    render(<WritingEditor {...defaultProps} status="pending" />);
    
    const textarea = screen.getByLabelText(/Writing response/i);
    expect(textarea).toBeDisabled();

    const submitBtn = screen.getByRole('button', { name: /Bài đang được chấm/i });
    expect(submitBtn).toBeDisabled();
    
    const tutorRadio = screen.getByLabelText(/Giáo viên/i);
    expect(tutorRadio).toBeDisabled();
  });

  it('shows error toast when submission fails (Unwanted)', async () => {
    gradingService.submitWriting.mockRejectedValueOnce({
      response: { data: { error: { message: 'Server is down' } } }
    });

    render(<WritingEditor {...defaultProps} />);
    
    const textarea = screen.getByLabelText(/Writing response/i);
    fireEvent.change(textarea, { target: { value: 'Hello world' } });

    const submitBtn = screen.getByRole('button', { name: /Nộp bài/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Server is down/i)).toBeInTheDocument();
    });
  });

  it('prevents submission and shows warning if text is empty', async () => {
    render(<WritingEditor {...defaultProps} />);
    
    const submitBtn = screen.getByRole('button', { name: /Nộp bài/i });
    expect(submitBtn).toBeDisabled();
  });

  it('blocks typing more than 5000 characters (Boundary)', async () => {
    render(<WritingEditor {...defaultProps} />);
    const textarea = screen.getByLabelText(/Writing response/i);
    
    // Simulate pasting more than 5000 characters using fireEvent
    const longText = 'a'.repeat(5001);
    fireEvent.change(textarea, { target: { value: longText } });
    
    // Textarea value should be sliced to 5000
    expect(textarea.value).toHaveLength(5000);
    expect(textarea.value).toBe('a'.repeat(5000));
  });

  it('disables AI selection when aiQuotaRemaining is 0', () => {
    useAuth.mockReturnValueOnce({ user: { ai_grading_quota_remaining: 0 } });
    render(<WritingEditor {...defaultProps} />);
    const aiRadio = screen.getByLabelText(/AI Chấm điểm/i);
    expect(aiRadio).toBeDisabled();
  });
});
