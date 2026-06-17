import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import MatchingEditor from '../../../../../src/components/tutor/reading/editors/MatchingEditor';

/**
 * Traceability Matrix:
 * - Happy Path: Add option, update option, add question, update question, map answer.
 * - Error Case 1 (Boundary): Cannot remove option if options <= 1 (Req: Minimum options check).
 * - Error Case 2 (Unwanted-State): Show error if option text is empty.
 * - Error Case 3 (Unwanted-State): Show error if options are duplicated.
 * - Error Case 4 (Unwanted-State): Show error if question text is empty.
 * - Error Case 5 (Unwanted-State): Show error if question is not mapped to an option.
 */

describe('MatchingEditor', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  const defaultBlock = {
    type: 'Matching Features',
    options: [
      { id: 11, text: 'Opt A' },
      { id: 12, text: 'Opt B' }
    ],
    questions: [
      { id: 1, text: 'Question 1', correctAnswer: 11 }
    ]
  };

  it('renders correctly', () => {
    render(<MatchingEditor block={defaultBlock} onChange={mockOnChange} />);
    expect(screen.getByDisplayValue('Opt A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Question 1')).toBeInTheDocument();
  });

  it('adds an option', () => {
    render(<MatchingEditor block={defaultBlock} onChange={mockOnChange} />);
    fireEvent.click(screen.getByTestId('add-opt-btn'));
    expect(mockOnChange).toHaveBeenCalled();
    expect(mockOnChange.mock.calls[0][0].options).toHaveLength(3);
  });

  it('prevents removing last option', () => {
    const block = { ...defaultBlock, options: [{ id: 11, text: 'Opt A' }] };
    render(<MatchingEditor block={block} onChange={mockOnChange} />);
    expect(screen.getByTestId('remove-opt-11')).toBeDisabled();
  });

  it('shows error if option text is empty', () => {
    const block = { ...defaultBlock, options: [{ id: 11, text: '   ' }, { id: 12, text: 'Opt B' }] };
    render(<MatchingEditor block={block} onChange={mockOnChange} />);
    expect(screen.getByText('Option text required.')).toBeInTheDocument();
  });

  it('shows error if options are duplicated', () => {
    const block = { ...defaultBlock, options: [{ id: 11, text: 'Opt A' }, { id: 12, text: 'Opt A' }] };
    render(<MatchingEditor block={block} onChange={mockOnChange} />);
    expect(screen.getByTestId('opt-error')).toHaveTextContent('Các lựa chọn không được trùng lặp.');
  });

  it('shows error if question text is empty', () => {
    const block = { ...defaultBlock, questions: [{ id: 1, text: '', correctAnswer: 11 }] };
    render(<MatchingEditor block={block} onChange={mockOnChange} />);
    expect(screen.getByText('Text required.')).toBeInTheDocument();
  });

  it('shows error if answer is not selected', () => {
    const block = { ...defaultBlock, questions: [{ id: 1, text: 'Q1', correctAnswer: '' }] };
    render(<MatchingEditor block={block} onChange={mockOnChange} />);
    expect(screen.getByText('Please map an option.')).toBeInTheDocument();
  });
});
