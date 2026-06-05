/**
 * Traceability Matrix:
 * - SPEC §3 STU-12: 3 Thẻ Card: Target Band, Current Avg Score, Remaining Quotas.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StudentDashboardWidgets from '../../../src/components/grading/StudentDashboardWidgets';
import gradingService from '../../../src/services/grading.service';

vi.mock('../../../src/services/grading.service');

describe('StudentDashboardWidgets Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('nên hiển thị loading skeletons ban đầu', () => {
    gradingService.getDashboardStats.mockReturnValue(new Promise(() => {})); // pending promise
    render(<StudentDashboardWidgets />);
    expect(screen.getByTestId('dashboard-widgets-loading')).toBeInTheDocument();
  });

  it('nên gọi API lấy thống kê và hiển thị 3 thẻ card thành công (Happy Path)', async () => {
    const mockData = {
      success: true,
      data: {
        target_band_score: 7.5,
        avg_band_score: 6.8,
        ai_grading_quota_remaining: 12
      }
    };
    gradingService.getDashboardStats.mockResolvedValue(mockData);

    render(<StudentDashboardWidgets />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-widgets')).toBeInTheDocument();
    });

    expect(screen.getByText('Mục tiêu IELTS')).toBeInTheDocument();
    expect(screen.getByText('7.5')).toBeInTheDocument();

    expect(screen.getByText('Điểm trung bình')).toBeInTheDocument();
    expect(screen.getByText('6.8')).toBeInTheDocument();

    expect(screen.getByText('Lượt AI còn lại')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('nên hiển thị thông báo lỗi khi API trả về success: false (Error Pattern)', async () => {
    gradingService.getDashboardStats.mockResolvedValue({
      success: false,
      error: { message: 'Lấy dữ liệu thất bại' }
    });

    render(<StudentDashboardWidgets />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-widgets-error')).toBeInTheDocument();
    });

    expect(screen.getByText(/Lấy dữ liệu thất bại/i)).toBeInTheDocument();
  });

  it('nên hiển thị thông báo lỗi hệ thống khi API bị unhandled exception (Error Pattern)', async () => {
    gradingService.getDashboardStats.mockRejectedValue(new Error('Network error'));

    render(<StudentDashboardWidgets />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-widgets-error')).toBeInTheDocument();
    });

    expect(screen.getByText(/Network error/i)).toBeInTheDocument();
  });

  it('nên hiển thị N/A khi thiếu giá trị (Boundary Values)', async () => {
    const mockData = {
      success: true,
      data: {
        target_band_score: null,
        avg_band_score: null,
        ai_grading_quota_remaining: 0
      }
    };
    gradingService.getDashboardStats.mockResolvedValue(mockData);

    render(<StudentDashboardWidgets />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-widgets')).toBeInTheDocument();
    });

    const naElements = screen.getAllByText('N/A');
    expect(naElements.length).toBe(2);
    expect(screen.getByText('0')).toBeInTheDocument(); // quota
  });
});
