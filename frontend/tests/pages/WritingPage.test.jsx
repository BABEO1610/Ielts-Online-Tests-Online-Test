import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import WritingPage from '../../src/pages/WritingPage';

vi.mock('../../src/components/layout/StudentNavbar', () => ({
  default: () => <nav>StudentNavbar</nav>
}));

// Mock WritingEditor so we don't need real API calls inside tests
vi.mock('../../src/components/grading/WritingEditor', () => ({
  default: React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      submit: () => {
        if (props.onSubmitSuccess) props.onSubmitSuccess({ data: { submission_id: '123' } });
      }
    }));
    return <div data-testid="mock-writing-editor">Writing Editor Mock</div>;
  })
}));

describe('WritingPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navigates to tasks and shows ModeSelector', async () => {
    render(
      <BrowserRouter>
        <WritingPage />
      </BrowserRouter>
    );

    // Click first exam
    const xemDeBtns = screen.getAllByText('Xem đề →');
    fireEvent.click(xemDeBtns[0]);

    // Now in Task List
    const lamBaiBtns = screen.getAllByText('Làm bài →');
    fireEvent.click(lamBaiBtns[0]);

    // Mode Selector should appear
    expect(screen.getByText('Choose a mode')).toBeInTheDocument();

    // Select practice mode
    const practiceBtn = screen.getByTestId('mode-practice');
    fireEvent.click(practiceBtn);

    // Now inside Test Screen
    expect(screen.getByTestId('mock-writing-editor')).toBeInTheDocument();
    // Practice mode timer doesn't show danger but should be visible
    expect(screen.getByText(/Practice/i)).toBeInTheDocument();
  });
});
