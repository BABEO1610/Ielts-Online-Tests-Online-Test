import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import QuestionBlockEditor from '../../../../src/components/tutor/reading/QuestionBlockEditor';

/**
 * Traceability Matrix:
 * - Test Case 1: Render Multiple Choice Editor (Req: Support MCQ blocks)
 * - Test Case 2: Render True/False Editor (Req: Support T/F/NG blocks)
 * - Test Case 3: Render Matching Editor (Req: Support Matching blocks)
 * - Test Case 4: Render Completion Editor (Req: Support Completion blocks)
 * - Test Case 5: Render Warning for unknown type (Unwanted-State: Handle unsupported types)
 */

// Mock the sub-components
vi.mock('../../../../src/components/tutor/reading/editors/MultipleChoiceEditor', () => ({
  default: () => <div data-testid="mcq-mock">MCQ Editor</div>
}));
vi.mock('../../../../src/components/tutor/reading/editors/TrueFalseEditor', () => ({
  default: () => <div data-testid="tf-mock">TF Editor</div>
}));
vi.mock('../../../../src/components/tutor/reading/editors/MatchingEditor', () => ({
  default: () => <div data-testid="match-mock">Matching Editor</div>
}));
vi.mock('../../../../src/components/tutor/reading/editors/CompletionEditor', () => ({
  default: () => <div data-testid="comp-mock">Completion Editor</div>
}));

describe('QuestionBlockEditor', () => {
  const onChangeMock = vi.fn();

  it('renders Multiple Choice editor', () => {
    render(<QuestionBlockEditor block={{ type: 'Multiple Choice' }} onChange={onChangeMock} />);
    expect(screen.getByTestId('mcq-mock')).toBeInTheDocument();
  });

  it('renders True/False editor', () => {
    render(<QuestionBlockEditor block={{ type: 'True/False/Not Given' }} onChange={onChangeMock} />);
    expect(screen.getByTestId('tf-mock')).toBeInTheDocument();
  });

  it('renders Matching editor', () => {
    render(<QuestionBlockEditor block={{ type: 'Matching Headings' }} onChange={onChangeMock} />);
    expect(screen.getByTestId('match-mock')).toBeInTheDocument();
  });

  it('renders Completion editor', () => {
    render(<QuestionBlockEditor block={{ type: 'Summary Completion' }} onChange={onChangeMock} />);
    expect(screen.getByTestId('comp-mock')).toBeInTheDocument();
  });

  it('renders warning for unknown type', () => {
    render(<QuestionBlockEditor block={{ type: 'Unknown Type' }} onChange={onChangeMock} />);
    expect(screen.getByText(/Editor for/i)).toBeInTheDocument();
    expect(screen.getByText('Unknown Type')).toBeInTheDocument();
    expect(screen.getByText(/is not yet implemented/i)).toBeInTheDocument();
  });

  it('renders nothing if no type', () => {
    const { container } = render(<QuestionBlockEditor block={{}} onChange={onChangeMock} />);
    expect(container.firstChild).toBeNull();
  });
});
