import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AudioRecorder from '../../../src/components/grading/AudioRecorder';
import api from '../../../src/services/api';
import { useAuth } from '../../../src/context/AuthContext';

// TRACEABILITY MATRIX
// | Test Case | Requirement (SPEC/TASKS) | Status |
// |-----------|-------------------------|--------|
// | Happy path: Record and Upload | TASKS.md T034, SPEC.md FR-01 | PASS |
// | Auto-stop when maxDuration reached | TASKS.md T034, SPEC.md STU-08 | PASS |
// | HTTP 413: File too large | SPEC.md ERR-01, GRD_UPL_002 | PASS |
// | HTTP 400: Invalid format | SPEC.md GRD_UPL_001 | PASS |
// | Microphone permission denied | TASKS.md T034 Edge case | PASS |

vi.mock('../../../src/services/api');

// Mock useAuth
vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock MediaRecorder
class MockMediaRecorder {
  constructor() {
    this.state = 'inactive';
    this.ondataavailable = null;
    this.onstop = null;
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    if (this.onstop) this.onstop();
  }
  static isTypeSupported() {
    return true;
  }
}

global.MediaRecorder = MockMediaRecorder;

describe('AudioRecorder Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { ai_grading_quota_remaining: 10 } });

    // Mock getUserMedia
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Happy path: Starts recording, stops, and uploads successfully', async () => {
    const mockOnUploadComplete = vi.fn();
    api.post.mockResolvedValueOnce({ data: { success: true, data: { temp_s3_key: 'temp/123.mp4' } } });

    render(<AudioRecorder onUploadComplete={mockOnUploadComplete} />);

    // Click start
    fireEvent.click(screen.getByTestId('start-recording-btn'));

    await waitFor(() => {
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    });

    expect(screen.getByText(/Recording.../i)).toBeInTheDocument();

    // Click stop
    fireEvent.click(screen.getByTestId('stop-recording-btn'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/submissions/speaking/upload', expect.any(FormData), expect.any(Object));
    });

    await waitFor(() => {
      expect(screen.getByText('Thu âm thành công!')).toBeInTheDocument();
    });
    
    expect(mockOnUploadComplete).toHaveBeenCalledWith('temp/123.mp4');
  });

  it('Error case: Microphone permission denied', async () => {
    global.navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(new Error('NotAllowedError'));

    render(<AudioRecorder />);

    fireEvent.click(screen.getByTestId('start-recording-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Microphone access denied or not available.');
    });
  });

  it('Error case: Auto-stops when maxDuration is reached', async () => {
    const mockOnUploadComplete = vi.fn();
    api.post.mockResolvedValueOnce({ data: { success: true, data: { temp_s3_key: 'temp/123.mp4' } } });

    render(<AudioRecorder onUploadComplete={mockOnUploadComplete} maxDuration={1} />);

    fireEvent.click(screen.getByTestId('start-recording-btn'));

    // Wait for recording to start using real timers
    await waitFor(() => {
      expect(screen.getByText(/Recording.../i)).toBeInTheDocument();
    });

    // Wait for auto-stop after 1 second
    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    }, { timeout: 2500 });
  });

  it('Error case: HTTP 413 File too large', async () => {
    api.post.mockRejectedValueOnce({
      response: {
        status: 413,
        data: { error: { message: 'File too large (Max 50MB) or exceeds 5 minutes.' } }
      }
    });

    render(<AudioRecorder />);

    fireEvent.click(screen.getByTestId('start-recording-btn'));
    await waitFor(() => expect(screen.getByText(/Recording.../i)).toBeInTheDocument());
    
    fireEvent.click(screen.getByTestId('stop-recording-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('File too large (Max 50MB) or exceeds 5 minutes.');
    });
  });

  it('Error case: HTTP 400 Invalid format', async () => {
    api.post.mockRejectedValueOnce({
      response: {
        status: 400,
        data: { error: { message: 'Invalid file format. Accepted: MP3, WAV, M4A.' } }
      }
    });

    render(<AudioRecorder />);

    fireEvent.click(screen.getByTestId('start-recording-btn'));
    await waitFor(() => expect(screen.getByText(/Recording.../i)).toBeInTheDocument());
    
    fireEvent.click(screen.getByTestId('stop-recording-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Invalid file format. Accepted: MP3, WAV, M4A.');
    });
  });

  it('T039_F: Shows submit form after upload completes', async () => {
    api.post.mockResolvedValueOnce({ data: { success: true, data: { temp_s3_key: 'temp/123.mp4' } } });

    render(<AudioRecorder />);
    fireEvent.click(screen.getByTestId('start-recording-btn'));
    await waitFor(() => expect(screen.getByText(/Recording.../i)).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('stop-recording-btn'));

    await waitFor(() => {
      expect(screen.getByText('Thu âm thành công!')).toBeInTheDocument();
    });

    expect(screen.getByText(/Chọn người chấm:/i)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Giáo viên \(Tutor\)/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /AI Chấm điểm/i })).toBeInTheDocument();
  });

  it('SPEC §4: Disables AI radio and shows text-danger when AI quota is 0', async () => {
    useAuth.mockReturnValue({ user: { ai_grading_quota_remaining: 0 } });
    api.post.mockResolvedValueOnce({ data: { success: true, data: { temp_s3_key: 'temp/123.mp4' } } });

    render(<AudioRecorder />);
    fireEvent.click(screen.getByTestId('start-recording-btn'));
    await waitFor(() => expect(screen.getByText(/Recording.../i)).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('stop-recording-btn'));

    await waitFor(() => {
      expect(screen.getByText('Thu âm thành công!')).toBeInTheDocument();
    });

    const aiRadio = screen.getByRole('radio', { name: /AI Chấm điểm/i });
    expect(aiRadio).toBeDisabled();
    expect(screen.getByText(/Bạn đã hết lượt chấm chữa bằng AI/i)).toBeInTheDocument();
    expect(screen.getByText(/Bạn đã hết lượt chấm chữa bằng AI/i)).toHaveClass('text-danger');
  });
});
