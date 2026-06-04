import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ExplainWithAiButton from '../../../../src/components/ai/ExplainWithAiButton';

describe('ExplainWithAiButton Component', () => {
  it('should render the button correctly', () => {
    render(<ExplainWithAiButton onClick={() => { }} />);
    const button = screen.getByTestId('explain-with-ai-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Explain with AI');
    expect(button).toHaveClass('btn btn-outline-primary btn-sm');
  });

  it('should trigger onClick when clicked', () => {
    const mockOnClick = vi.fn();
    render(<ExplainWithAiButton onClick={mockOnClick} />);
    const button = screen.getByTestId('explain-with-ai-button');

    fireEvent.click(button);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
});
