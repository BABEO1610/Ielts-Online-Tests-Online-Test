import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import SpeakingPage from '../../src/pages/SpeakingPage';

vi.mock('../../src/components/layout/StudentNavbar', () => ({
  default: () => <nav>StudentNavbar</nav>
}));

// Mock AudioRecorder so we don't need real browser APIs inside tests
vi.mock('../../src/components/grading/AudioRecorder', () => ({
  default: React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      stopRecording: () => {
        if (props.onSubmitSuccess) props.onSubmitSuccess({ data: { submission_id: '123' } });
      }
    }));
    return <div data-testid="mock-audio-recorder">Audio Recorder Mock</div>;
  })
}));

describe('SpeakingPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navigates to parts and shows ModeSelector', async () => {
    render(
      <BrowserRouter>
        <SpeakingPage />
      </BrowserRouter>
    );

    // Click first exam
    const xemDeBtns = screen.getAllByText('Xem đề →');
    fireEvent.click(xemDeBtns[0]);

    // Now in Part List
    const lamBaiBtns = screen.getAllByText('Vào phòng thi →');
    fireEvent.click(lamBaiBtns[0]);

    // Mode Selector should appear
    expect(screen.getByText('Choose a mode')).toBeInTheDocument();

    // Select practice mode
    const practiceBtn = screen.getByTestId('mode-practice');
    fireEvent.click(practiceBtn);

    // Now inside Test Screen
    expect(screen.getByTestId('mock-audio-recorder')).toBeInTheDocument();
    // Practice mode timer should show practice indication
    expect(screen.getByText(/Practice/i)).toBeInTheDocument();
  });
});
