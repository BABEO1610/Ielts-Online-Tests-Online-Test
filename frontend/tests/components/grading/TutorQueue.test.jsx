/**
 * Traceability Matrix:
 * - SPEC §3 TUT-01: Tutor Queue viewing and claiming
 * - SPEC §3 FR-06: Data Retrieval for tutor queue
 * - TASK T038: Fetch queue, show list, pagination, filter, claim button.
 * - TASK T039_H: Tutor Queue - Tab Lịch sử (Fetch queue with status=tutor_graded)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TutorQueue from '../../../src/components/grading/TutorQueue';
import gradingService from '../../../src/services/grading.service';

vi.mock('../../../src/services/grading.service');

describe('TutorQueue Component', () => {
  const mockNavigate = vi.fn();

  const mockQueueData = {
    success: true,
    data: {
      items: [
        {
          submission_id: 'sub-1',
          submission_type: 'writing',
          student_id: 'stu-1',
          student_name: 'John Doe',
          submitted_at: '2026-06-04T10:00:00Z',
          status: 'pending',
          grader: 'tutor'
        },
        {
          submission_id: 'sub-2',
          submission_type: 'speaking',
          student_id: 'stu-2',
          student_name: 'Jane Smith',
          submitted_at: '2026-06-04T11:00:00Z',
          status: 'pending',
          grader: 'tutor'
        }
      ],
      total: 12,
      page: 1,
      limit: 10
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    gradingService.getTutorQueue.mockResolvedValue(mockQueueData);
    render(<TutorQueue onNavigateToGrading={mockNavigate} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('should fetch and display queue items successfully (Happy Path)', async () => {
    gradingService.getTutorQueue.mockResolvedValue(mockQueueData);
    render(<TutorQueue onNavigateToGrading={mockNavigate} />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('writing')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('speaking')).toBeInTheDocument();
    
    // Check pagination
    expect(screen.getByTestId('next-page-btn')).toBeInTheDocument();
  });

  it('should handle fetch queue error gracefully', async () => {
    gradingService.getTutorQueue.mockResolvedValue({
      success: false,
      error: { message: 'Database error' }
    });
    
    render(<TutorQueue onNavigateToGrading={mockNavigate} />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('fetch-error-message')).toHaveTextContent('Database error');
    expect(screen.getByTestId('empty-queue-message')).toBeInTheDocument();
  });

  it('should call claim API and navigate on success', async () => {
    gradingService.getTutorQueue.mockResolvedValue(mockQueueData);
    gradingService.claimSubmission.mockResolvedValue({ success: true, data: {} });
    
    render(<TutorQueue onNavigateToGrading={mockNavigate} />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });

    const claimBtn = screen.getByTestId('claim-btn-sub-1');
    fireEvent.click(claimBtn);

    expect(gradingService.claimSubmission).toHaveBeenCalledWith('sub-1', 'writing');
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('sub-1', 'writing', 'stu-1');
    });
  });

  it('should handle claim conflict error (409) gracefully', async () => {
    gradingService.getTutorQueue.mockResolvedValue(mockQueueData);
    gradingService.claimSubmission.mockRejectedValue({
      response: {
        data: {
          error: { message: 'GRD_TUT_001: Submission already claimed' }
        }
      }
    });
    
    render(<TutorQueue onNavigateToGrading={mockNavigate} />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });

    const claimBtn = screen.getByTestId('claim-btn-sub-2');
    fireEvent.click(claimBtn);

    expect(gradingService.claimSubmission).toHaveBeenCalledWith('sub-2', 'speaking');
    
    await waitFor(() => {
      expect(screen.getByTestId('claim-error-message')).toHaveTextContent('GRD_TUT_001: Submission already claimed');
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should handle filter changes and refetch data', async () => {
    gradingService.getTutorQueue.mockResolvedValue(mockQueueData);
    
    render(<TutorQueue onNavigateToGrading={mockNavigate} />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });

    const select = screen.getByTestId('type-filter-select');
    fireEvent.change(select, { target: { value: 'writing' } });

    expect(gradingService.getTutorQueue).toHaveBeenCalledWith({ page: 1, limit: 10, type: 'writing', status: 'pending' });
  });

  it('should handle pagination changes', async () => {
    gradingService.getTutorQueue.mockResolvedValue(mockQueueData);
    
    render(<TutorQueue onNavigateToGrading={mockNavigate} />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });

    const nextBtn = screen.getByTestId('next-page-btn');
    fireEvent.click(nextBtn);

    expect(gradingService.getTutorQueue).toHaveBeenCalledWith({ page: 2, limit: 10, status: 'pending' });
  });

  it('should switch to History tab, fetch graded items, and hide claim button', async () => {
    gradingService.getTutorQueue.mockResolvedValue(mockQueueData);
    
    render(<TutorQueue onNavigateToGrading={mockNavigate} />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });

    const historyTab = screen.getByTestId('tab-history');
    fireEvent.click(historyTab);

    expect(gradingService.getTutorQueue).toHaveBeenCalledWith({ page: 1, limit: 10, status: 'tutor_graded' });
    
    // Verify that claim button is hidden and status "Đã chấm" is shown
    await waitFor(() => {
      expect(screen.queryByTestId('claim-btn-sub-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('status-sub-1')).toHaveTextContent('Đã chấm');
    });
  });
});
