import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TutorContextSidebar from '../../../src/components/grading/TutorContextSidebar';
import gradingService from '../../../src/services/grading.service';

/**
 * Traceability Matrix:
 * - Happy Path (Fetch): Fetch notes successfully -> renders notes list (SPEC §3 TUT-05)
 * - Happy Path (Submit): Submit new note successfully -> calls API, prepends note (SPEC §3 TUT-05)
 * - Error Case (Fetch): Fetch notes fails -> shows error message
 * - Error Case (Submit): Submit note fails -> shows error message, keeps input
 * - Boundary Value (Empty): Try to submit empty note -> button disabled, API not called
 * - Boundary Value (No studentId): No studentId provided -> input and button disabled, API not called
 */

// Mock the gradingService
vi.mock('../../../src/services/grading.service', () => ({
  default: {
    getTutorNotes: vi.fn(),
    addTutorNote: vi.fn(),
  }
}));

describe('TutorContextSidebar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Happy Path: Fetch notes successfully and renders notes list', async () => {
    const mockNotes = [
      { id: 1, note: 'Needs to improve grammar.', created_at: '2026-06-04T10:00:00Z' },
      { id: 2, note: 'Good fluency.', created_at: '2026-06-03T10:00:00Z' }
    ];
    
    gradingService.getTutorNotes.mockResolvedValueOnce({
      success: true,
      data: { notes: mockNotes }
    });

    render(<TutorContextSidebar studentId="stu123" />);

    await waitFor(() => {
      expect(screen.getByText('Needs to improve grammar.')).toBeInTheDocument();
      expect(screen.getByText('Good fluency.')).toBeInTheDocument();
    });

    expect(gradingService.getTutorNotes).toHaveBeenCalledWith('stu123');
    expect(gradingService.getTutorNotes).toHaveBeenCalledTimes(1);
  });

  it('Happy Path: Submit new note successfully', async () => {
    gradingService.getTutorNotes.mockResolvedValueOnce({
      success: true,
      data: { notes: [] }
    });

    render(<TutorContextSidebar studentId="stu123" />);

    const input = screen.getByTestId('input-new-note');
    const btn = screen.getByTestId('btn-add-note');

    fireEvent.change(input, { target: { value: 'This is a new test note.' } });
    expect(btn).not.toBeDisabled();

    gradingService.addTutorNote.mockResolvedValueOnce({
      success: true,
      data: {
        note: { id: 3, note: 'This is a new test note.', created_at: '2026-06-04T12:00:00Z' }
      }
    });

    fireEvent.click(btn);

    expect(btn).toHaveTextContent('Adding...');
    expect(gradingService.addTutorNote).toHaveBeenCalledWith('stu123', 'This is a new test note.');

    await waitFor(() => {
      expect(screen.getByText('This is a new test note.')).toBeInTheDocument();
    });

    // Input should be cleared
    expect(input.value).toBe('');
  });

  it('Error Case: Fetch notes fails and shows error message', async () => {
    gradingService.getTutorNotes.mockRejectedValueOnce({
      response: { data: { error: { message: 'Database error fetching notes' } } }
    });

    render(<TutorContextSidebar studentId="stu123" />);

    await waitFor(() => {
      expect(screen.getByTestId('sidebar-error')).toHaveTextContent('Database error fetching notes');
    });
  });

  it('Error Case: Submit note fails and shows error message', async () => {
    gradingService.getTutorNotes.mockResolvedValueOnce({
      success: true,
      data: { notes: [] }
    });

    render(<TutorContextSidebar studentId="stu123" />);

    const input = screen.getByTestId('input-new-note');
    const btn = screen.getByTestId('btn-add-note');

    fireEvent.change(input, { target: { value: 'Failing note' } });
    
    gradingService.addTutorNote.mockRejectedValueOnce({
      response: { data: { error: { message: 'Failed to add note' } } }
    });

    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByTestId('sidebar-error')).toHaveTextContent('Failed to add note');
    });

    // Input should NOT be cleared
    expect(input.value).toBe('Failing note');
  });

  it('Boundary Value: Empty note should keep button disabled and not call API', async () => {
    gradingService.getTutorNotes.mockResolvedValueOnce({
      success: true,
      data: { notes: [] }
    });

    render(<TutorContextSidebar studentId="stu123" />);

    const input = screen.getByTestId('input-new-note');
    const btn = screen.getByTestId('btn-add-note');

    fireEvent.change(input, { target: { value: '   ' } });
    
    expect(btn).toBeDisabled();

    fireEvent.submit(btn); // Or click

    expect(gradingService.addTutorNote).not.toHaveBeenCalled();
  });

  it('Boundary Value: No studentId provided disables inputs and does not fetch', () => {
    render(<TutorContextSidebar studentId={null} />);

    const input = screen.getByTestId('input-new-note');
    const btn = screen.getByTestId('btn-add-note');

    expect(input).toBeDisabled();
    expect(btn).toBeDisabled();
    expect(gradingService.getTutorNotes).not.toHaveBeenCalled();
  });
});
