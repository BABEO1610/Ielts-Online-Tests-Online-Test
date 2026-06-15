import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import TrueFalseEditor from '../../../../../src/components/tutor/reading/editors/TrueFalseEditor';

/**
 * Traceability Matrix:
 * - Happy Path: Add statement, update statement text, select answer.
 * - Error Case 1 (Unwanted-State): Show error if statement text is empty.
 * - Error Case 2 (Unwanted-State): Show error if answer is not selected.
 * - Format variation: Renders YES/NO/NOT GIVEN options if block type is Yes/No/Not Given.
 */

describe('TrueFalseEditor', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  const defaultBlock = {
    type: 'True/False/Not Given',
    questions: [
      { id: 1, text: 'Sample Statement', correctAnswer: 'TRUE' }
    ]
  };

  it('renders correctly', () => {
    render(<TrueFalseEditor block={defaultBlock} onChange={mockOnChange} />);
    expect(screen.getByDisplayValue('Sample Statement')).toBeInTheDocument();
    expect(screen.getByDisplayValue('TRUE')).toBeInTheDocument();
  });

  it('renders Yes/No/Not Given options based on type', () => {
    const block = { ...defaultBlock, type: 'Yes/No/Not Given', questions: [{ id: 1, text: 'S1', correctAnswer: 'YES' }] };
    render(<TrueFalseEditor block={block} onChange={mockOnChange} />);
    expect(screen.getByDisplayValue('YES')).toBeInTheDocument();
    // 'TRUE' should not be in the options
    const select = screen.getByTestId('q-ans-1');
    expect(select.textContent).toContain('YES');
    expect(select.textContent).toContain('NO');
    expect(select.textContent).not.toContain('TRUE');
  });

  it('shows error if statement text is empty', () => {
    const block = { ...defaultBlock, questions: [{ id: 1, text: '', correctAnswer: 'TRUE' }] };
    render(<TrueFalseEditor block={block} onChange={mockOnChange} />);
    expect(screen.getByTestId('q-text-error')).toHaveTextContent('Nhận định không được để trống.');
  });

  it('shows error if answer is not selected', () => {
    const block = { ...defaultBlock, questions: [{ id: 1, text: 'Text', correctAnswer: '' }] };
    render(<TrueFalseEditor block={block} onChange={mockOnChange} />);
    expect(screen.getByTestId('q-ans-error')).toHaveTextContent('Chọn đáp án.');
  });

  it('adds new statement', () => {
    render(<TrueFalseEditor block={defaultBlock} onChange={mockOnChange} />);
    fireEvent.click(screen.getByTestId('add-tf-btn'));
    expect(mockOnChange).toHaveBeenCalled();
    const updatedBlock = mockOnChange.mock.calls[0][0];
    expect(updatedBlock.questions).toHaveLength(2);
  });
});
