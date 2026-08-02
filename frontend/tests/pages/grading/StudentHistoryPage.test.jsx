import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import StudentHistoryPage from '../../../src/pages/grading/StudentHistoryPage';
import gradingService from '../../../src/services/grading.service';

/*
 * TRACEABILITY MATRIX
 * | Test Case | SPEC Requirement / Task | Description |
 * |-----------|-------------------------|-------------|
 * | Loading State | UI/UX Requirement | Xác minh hiển thị Spinner khi đang fetch dữ liệu. |
 * | Empty State | UI/UX Requirement | Xác minh hiển thị thông báo "Bạn chưa có bài nộp nào" nếu mảng rỗng. |
 * | Success State | Task T039_E | Xác minh render danh sách bài nộp thành công với đầy đủ ngày tháng, kỹ năng, trạng thái, điểm. |
 * | Error State | UI/UX Requirement | Xác minh xử lý lỗi từ API và hiển thị thông báo lỗi lên giao diện. |
 * | Open FeedbackReport | Task T039_E | Xác minh việc click vào một dòng trong danh sách sẽ mở modal chứa FeedbackReport. |
 */

// Mock gradingService
vi.mock('../../../src/services/grading.service');

// Mock useAuth
vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'stu-1', role: 'student', full_name: 'John Doe' },
    logout: vi.fn(),
  }),
}));

// Keep this page test focused on history behavior; the navbar has its own
// ThemeProvider integration tests.
vi.mock('../../../src/components/layout/StudentNavbar', () => ({
  default: () => <nav data-testid="student-navbar" />,
}));

// Mock FeedbackReport
vi.mock('../../../src/components/grading/FeedbackReport', () => ({
  default: ({ submissionId, type }) => (
    <div data-testid="mock-feedback-report">
      Feedback for {type} {submissionId}
    </div>
  ),
}));

describe('StudentHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    // Return a promise that never resolves to keep it in loading state
    gradingService.getSubmissionHistory.mockReturnValue(new Promise(() => {}));
    
    render(<MemoryRouter><StudentHistoryPage /></MemoryRouter>);
    
    expect(screen.getByText('Đang tải lịch sử bài nộp...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders empty state when there are no submissions', async () => {
    gradingService.getSubmissionHistory.mockResolvedValue({
      success: true,
      data: [],
    });

    render(<MemoryRouter><StudentHistoryPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Bạn chưa có bài nộp nào.')).toBeInTheDocument();
    });
    
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders history list successfully (happy path)', async () => {
    const mockData = [
      {
        id: 'sub-1',
        type: 'writing',
        task_number: 1,
        submitted_at: '2026-06-01T10:00:00Z',
        status: 'ai_graded',
        band_score: 6.5,
        grader: 'ai'
      },
      {
        id: 'sub-2',
        type: 'speaking',
        part_number: 2,
        submitted_at: '2026-06-02T15:30:00Z',
        status: 'pending',
        band_score: null,
        grader: 'tutor'
      }
    ];

    gradingService.getSubmissionHistory.mockResolvedValue({
      success: true,
      data: mockData,
    });

    render(<MemoryRouter><StudentHistoryPage /></MemoryRouter>);

    await waitFor(() => {
      // Check Desktop table headers
      expect(screen.getByText('Ngày nộp')).toBeInTheDocument();
      expect(screen.getByText('Kỹ năng')).toBeInTheDocument();
      
      // Check Data rendering
      expect(screen.getAllByText('writing').length).toBeGreaterThan(0);
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Đã chấm (AI)')).toBeInTheDocument();
      expect(screen.getAllByText('6.5').length).toBeGreaterThan(0);

      expect(screen.getAllByText('speaking').length).toBeGreaterThan(0);
      expect(screen.getByText('Part 2')).toBeInTheDocument();
      expect(screen.getByText('Đang chấm')).toBeInTheDocument();
      expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });
  });

  it('renders error state on API failure (error case)', async () => {
    gradingService.getSubmissionHistory.mockRejectedValue(new Error('Network error'));

    render(<MemoryRouter><StudentHistoryPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Lỗi!')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('renders error state on API returning success: false (error case)', async () => {
    gradingService.getSubmissionHistory.mockResolvedValue({
      success: false,
      error: { message: 'Custom error from backend' },
    });

    render(<MemoryRouter><StudentHistoryPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Custom error from backend')).toBeInTheDocument();
    });
  });

  it('opens FeedbackReport modal on row click', async () => {
    const mockData = [
      {
        id: 'sub-1',
        type: 'writing',
        task_number: 1,
        submitted_at: '2026-06-01T10:00:00Z',
        status: 'ai_graded',
        band_score: 6.5,
        grader: 'ai'
      }
    ];

    gradingService.getSubmissionHistory.mockResolvedValue({
      success: true,
      data: mockData,
    });

    render(<MemoryRouter><StudentHistoryPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    // Click the row (the table cell or the row itself)
    const taskCell = screen.getByText('Task 1');
    fireEvent.click(taskCell);

    // Modal should appear
    await waitFor(() => {
      expect(screen.getByTestId('mock-feedback-report')).toBeInTheDocument();
      expect(screen.getByText(/Kết quả — Writing Task 1/i)).toBeInTheDocument();
    });

    // Verify props passed to FeedbackReport
    expect(screen.getByText('Feedback for writing sub-1')).toBeInTheDocument();

    // Close the modal
    const closeBtn = screen.getByText('✕ Đóng');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('mock-feedback-report')).not.toBeInTheDocument();
    });
  });

  it('shows learner-redacted needs-review state and only offers retry when canRetry is true', async () => {
    gradingService.getSubmissionHistory.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'group-review', type: 'speaking', submitted_at: '2026-07-22T00:00:00Z',
          gradingStatus: 'needs_review', status: 'pending', band_score: null, canRetry: false,
        },
        {
          id: 'group-failed', type: 'speaking', submitted_at: '2026-07-22T01:00:00Z',
          gradingStatus: 'failed', status: 'grading_failed', band_score: null, canRetry: true,
        },
      ],
    });
    gradingService.retrySpeakingGrading.mockResolvedValue({ success: true });
    render(<MemoryRouter><StudentHistoryPage /></MemoryRouter>);
    expect(await screen.findByText('Trạng thái AI legacy cần xem xét')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại một lần' }));
    await waitFor(() => expect(gradingService.retrySpeakingGrading).toHaveBeenCalledWith('group-failed'));
  });
});
