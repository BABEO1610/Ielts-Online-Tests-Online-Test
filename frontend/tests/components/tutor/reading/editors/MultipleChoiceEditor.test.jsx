import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import MultipleChoiceEditor from '../../../../../src/components/tutor/reading/editors/MultipleChoiceEditor';

/**
 * Traceability Matrix:
 * - Happy Path: Add question, add option, update text, select correct answer.
 * - Error Case 1 (Boundary): Cannot remove option if options <= 2 (Req: Minimum 2 options).
 * - Error Case 2 (Unwanted-State): Show error if question text is empty.
 * - Error Case 3 (Unwanted-State): Show error if option text is empty.
 * - Error Case 4 (Unwanted-State): Show error if options are duplicated.
 * - Error Case 5 (Unwanted-State): Show error if no correct answer is selected.
 */

describe('MultipleChoiceEditor', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  const defaultBlock = {
    type: 'Multiple Choice',
    questions: [
      {
        id: 1,
        text: 'Sample Q1',
        options: [
          { id: 11, text: 'Opt A' },
          { id: 12, text: 'Opt B' },
          { id: 13, text: 'Opt C' }
        ],
        correctAnswers: [11]
      }
    ]
  };

  it('renders correctly with default block', () => {
    render(<MultipleChoiceEditor block={defaultBlock} onChange={mockOnChange} />);
    expect(screen.getByDisplayValue('Sample Q1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Opt A')).toBeInTheDocument();
  });

  it('adds a new question', () => {
    render(<MultipleChoiceEditor block={defaultBlock} onChange={mockOnChange} />);
    fireEvent.click(screen.getByTestId('add-mcq'));
    expect(mockOnChange).toHaveBeenCalled();
    const updatedBlock = mockOnChange.mock.calls[0][0];
    expect(updatedBlock.questions).toHaveLength(2);
    expect(updatedBlock.questions[1].options).toHaveLength(4); // Default 4 options
  });

  it('removes a question', () => {
    render(<MultipleChoiceEditor block={defaultBlock} onChange={mockOnChange} />);
    fireEvent.click(screen.getByTestId('remove-q-1'));
    expect(mockOnChange).toHaveBeenCalled();
    expect(mockOnChange.mock.calls[0][0].questions).toHaveLength(0);
  });

  it('shows error if question text is empty', () => {
    const block = { ...defaultBlock, questions: [{ ...defaultBlock.questions[0], text: '   ' }] };
    render(<MultipleChoiceEditor block={block} onChange={mockOnChange} />);
    expect(screen.getByText('Câu hỏi không được để trống.')).toBeInTheDocument();
  });

  it('shows error if option text is empty', () => {
    const block = {
      ...defaultBlock,
      questions: [{ ...defaultBlock.questions[0], options: [{ id: 11, text: '' }, { id: 12, text: 'Opt B' }] }]
    };
    render(<MultipleChoiceEditor block={block} onChange={mockOnChange} />);
    expect(screen.getByText('Lựa chọn không để trống.')).toBeInTheDocument();
  });

  it('shows error if options are duplicated', () => {
    const block = {
      ...defaultBlock,
      questions: [{ ...defaultBlock.questions[0], options: [{ id: 11, text: 'Opt A' }, { id: 12, text: 'Opt A' }] }]
    };
    render(<MultipleChoiceEditor block={block} onChange={mockOnChange} />);
    expect(screen.getByTestId('opt-error')).toHaveTextContent('Các lựa chọn không được trùng lặp.');
  });

  it('shows error if no correct answer selected', () => {
    const block = { ...defaultBlock, questions: [{ ...defaultBlock.questions[0], correctAnswers: [] }] };
    render(<MultipleChoiceEditor block={block} onChange={mockOnChange} />);
    expect(screen.getByTestId('ans-error')).toHaveTextContent('Vui lòng chọn 1 đáp án đúng.');
  });

  it('prevents removing option if length <= 2', () => {
    const block = {
      ...defaultBlock,
      questions: [{ ...defaultBlock.questions[0], options: [{ id: 11, text: 'A' }, { id: 12, text: 'B' }] }]
    };
    render(<MultipleChoiceEditor block={block} onChange={mockOnChange} />);
    const removeBtn = screen.getByTestId('remove-opt-11');
    expect(removeBtn).toBeDisabled();
  });

  it('selects correct answer', () => {
    render(<MultipleChoiceEditor block={defaultBlock} onChange={mockOnChange} />);
    fireEvent.click(screen.getByTestId('opt-radio-12'));
    expect(mockOnChange).toHaveBeenCalled();
    const updatedBlock = mockOnChange.mock.calls[0][0];
    expect(updatedBlock.questions[0].correctAnswers).toEqual([12]);
  });
});
