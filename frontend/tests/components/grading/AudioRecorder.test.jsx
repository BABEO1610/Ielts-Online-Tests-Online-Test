import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AudioRecorder from '../../../src/components/grading/AudioRecorder';
import gradingService from '../../../src/services/grading.service';
import { useAuth } from '../../../src/context/AuthContext';

// TRACEABILITY MATRIX
// | Test Case | Requirement (SPEC/TASKS) | Status |
// |-----------|-------------------------|--------|
// | Happy path: Record and Upload | TASKS.md T034, SPEC.md FR-01 | PASS |
// | Auto-stop when maxDuration reached | TASKS.md T034, SPEC.md STU-08 | PASS |
// | HTTP 413: File too large | SPEC.md ERR-01, GRD_UPL_002 | PASS |
// | HTTP 400: Invalid format | SPEC.md GRD_UPL_001 | PASS |
// | Microphone permission denied | TASKS.md T034 Edge case | PASS |

vi.mock('../../../src/services/grading.service', () => ({
  default: { uploadAudio: vi.fn() },
}));

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

globalThis.MediaRecorder = MockMediaRecorder;

describe('AudioRecorder Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { ai_grading_quota_remaining: 10 } });

    // Mock getUserMedia
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
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
    gradingService.uploadAudio.mockResolvedValueOnce({ success: true, data: { upload_token: 'opaque-token' } });

    render(<AudioRecorder onUploadComplete={mockOnUploadComplete} />);

    // Click start
    fireEvent.click(screen.getByTestId('start-recording-btn'));

    await waitFor(() => {
      expect(globalThis.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    });

    expect(screen.getByText(/Recording.../i)).toBeInTheDocument();

    // Click stop
    fireEvent.click(screen.getByTestId('stop-recording-btn'));

    await waitFor(() => {
      expect(gradingService.uploadAudio).toHaveBeenCalledWith(expect.any(Blob), expect.objectContaining({ durationMs: expect.any(Number) }));
    });

    await waitFor(() => {
      expect(screen.getByText('Thu âm thành công!')).toBeInTheDocument();
    });
    
    expect(mockOnUploadComplete).toHaveBeenCalledWith('opaque-token');
  });

  it('Error case: Microphone permission denied', async () => {
    globalThis.navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(new Error('NotAllowedError'));

    render(<AudioRecorder />);

    fireEvent.click(screen.getByTestId('start-recording-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Microphone access denied or not available.');
    });
  });

  it('does not open the microphone when the approved recorder MIME is unavailable', async () => {
    const support = vi.spyOn(MockMediaRecorder, 'isTypeSupported').mockReturnValue(false);
    render(<AudioRecorder />);
    fireEvent.click(screen.getByTestId('start-recording-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('không hỗ trợ audio/mp4');
    });
    expect(globalThis.navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
    support.mockRestore();
  });

  it('Error case: Auto-stops when maxDuration is reached', async () => {
    const mockOnUploadComplete = vi.fn();
    gradingService.uploadAudio.mockResolvedValueOnce({ success: true, data: { upload_token: 'opaque-token' } });

    render(<AudioRecorder onUploadComplete={mockOnUploadComplete} maxDuration={1} />);

    fireEvent.click(screen.getByTestId('start-recording-btn'));

    // Wait for recording to start using real timers
    await waitFor(() => {
      expect(screen.getByText(/Recording.../i)).toBeInTheDocument();
    });

    // Wait for auto-stop after 1 second
    await waitFor(() => {
      expect(gradingService.uploadAudio).toHaveBeenCalled();
    }, { timeout: 2500 });
  });

  it('Error case: HTTP 413 File too large', async () => {
    gradingService.uploadAudio.mockRejectedValueOnce({
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
    gradingService.uploadAudio.mockRejectedValueOnce({
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
    gradingService.uploadAudio.mockResolvedValueOnce({ success: true, data: { upload_token: 'opaque-token' } });

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

  it('shows the daily server-enforced policy instead of claiming unlimited grading', async () => {
    useAuth.mockReturnValue({ user: { ai_grading_quota_remaining: 0 } });
    gradingService.uploadAudio.mockResolvedValueOnce({ success: true, data: { upload_token: 'opaque-token' } });

    render(<AudioRecorder />);
    fireEvent.click(screen.getByTestId('start-recording-btn'));
    await waitFor(() => expect(screen.getByText(/Recording.../i)).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('stop-recording-btn'));

    await waitFor(() => {
      expect(screen.getByText('Thu âm thành công!')).toBeInTheDocument();
    });

    const aiRadio = screen.getByRole('radio', { name: /AI Chấm điểm/i });
    expect(aiRadio).not.toBeDisabled();
    expect(screen.getByText(/Tối đa 10 lượt\/ngày/i)).toBeInTheDocument();
    expect(screen.queryByText(/Không giới hạn/i)).not.toBeInTheDocument();
  });

  it('does not stop automatically when maxDuration is reached in practice mode', async () => {
    const mockOnUploadComplete = vi.fn();
    render(<AudioRecorder onUploadComplete={mockOnUploadComplete} maxDuration={1} practiceMode={true} />);

    fireEvent.click(screen.getByTestId('start-recording-btn'));

    await waitFor(() => {
      expect(screen.getByText(/Practice mode/i)).toBeInTheDocument();
    });

    // Wait 2.5 seconds, verify it has NOT called post yet
    await new Promise(resolve => setTimeout(resolve, 2500));
    expect(gradingService.uploadAudio).not.toHaveBeenCalled();
  });
});
