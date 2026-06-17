import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import CompletionEditor from '../../../../../src/components/tutor/reading/editors/CompletionEditor';

/**
 * Traceability Matrix:
 * - Happy Path: Add answer input, update instruction, update content.
 * - Error Case 1 (Unwanted-State): Show error if summary content is empty (for Summary Completion).
 * - Error Case 2 (Unwanted-State): Show error if short answer prompt is empty (for Short Answer).
 * - Error Case 3 (Unwanted-State): Show error if answer text is empty.
 */

describe('CompletionEditor', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  const defaultBlock = {
    type: 'Summary Completion',
    content: 'This is a test summary with [1].',
    instruction: 'NO MORE THAN ONE WORD',
    questions: [
      { id: 1, text: '', correctAnswer: 'apple' }
    ]
  };

  it('renders correctly', () => {
    render(<CompletionEditor block={defaultBlock} onChange={mockOnChange} />);
    expect(screen.getByDisplayValue('This is a test summary with [1].')).toBeInTheDocument();
    expect(screen.getByDisplayValue('apple')).toBeInTheDocument();
  });

  it('shows error if summary content is empty', () => {
    const block = { ...defaultBlock, content: '' };
    render(<CompletionEditor block={block} onChange={mockOnChange} />);
    expect(screen.getByTestId('content-error')).toHaveTextContent('Nội dung đoạn văn không được để trống.');
  });

  it('shows error if short answer prompt is empty', () => {
    const block = {
      ...defaultBlock,
      type: 'Short-answer Questions',
      content: '', // Not required to validate content for short answer
      questions: [{ id: 1, text: '', correctAnswer: 'apple' }]
    };
    render(<CompletionEditor block={block} onChange={mockOnChange} />);
    expect(screen.getByTestId('q-text-error')).toHaveTextContent('Câu hỏi không được để trống.');
  });

  it('shows error if answer text is empty', () => {
    const block = { ...defaultBlock, questions: [{ id: 1, text: '', correctAnswer: '   ' }] };
    render(<CompletionEditor block={block} onChange={mockOnChange} />);
    expect(screen.getByTestId('q-ans-error')).toHaveTextContent('Đáp án không được để trống.');
  });

  it('updates content on change', () => {
    render(<CompletionEditor block={defaultBlock} onChange={mockOnChange} />);
    const textarea = screen.getByTestId('content-textarea');
    fireEvent.change(textarea, { target: { value: 'New content' } });
    expect(mockOnChange).toHaveBeenCalled();
    expect(mockOnChange.mock.calls[0][0].content).toBe('New content');
  });
});
