/**
 * Traceability Matrix:
 * - T047: Filter theo date range. Hiển thị AI calls/tokens theo ngày/feature. Không hiển thị nội dung essay/chat.
 * - SPEC ADM-01: Admin can track system usage metrics.
 * - SPEC ADM-05: Strict data privacy - Admins MUST NOT see user PII or content (essays/transcripts) on usage dashboards.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AiUsageDashboard from '../../../../src/components/admin/AiUsageDashboard';

describe('AiUsageDashboard Component', () => {
  const mockFetchData = vi.fn();

  const mockData = [
    { date: '2026-06-01', feature: 'Writing Evaluation', calls: 10, tokens: 15000 },
    { date: '2026-06-02', feature: 'Speaking Feedback', calls: 5, tokens: 8000 }
  ];

  it('should render filters, summary cards, and table structure', () => {
    render(<AiUsageDashboard onFetchData={mockFetchData} usageData={mockData} />);

    expect(screen.getByTestId('ai-usage-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('start-date-input')).toBeInTheDocument();
    expect(screen.getByTestId('end-date-input')).toBeInTheDocument();
    expect(screen.getByTestId('total-calls')).toBeInTheDocument();
    expect(screen.getByTestId('total-tokens')).toBeInTheDocument();
    expect(screen.getByTestId('usage-table')).toBeInTheDocument();
  });

  it('should calculate totals correctly in summary cards', () => {
    render(<AiUsageDashboard onFetchData={mockFetchData} usageData={mockData} />);

    expect(screen.getByTestId('total-calls')).toHaveTextContent('15'); // 10 + 5
    expect(screen.getByTestId('total-tokens')).toHaveTextContent('23,000'); // 15000 + 8000
  });

  it('should call onFetchData with correct dates when filter is clicked', () => {
    render(<AiUsageDashboard onFetchData={mockFetchData} />);

    const startInput = screen.getByTestId('start-date-input');
    const endInput = screen.getByTestId('end-date-input');
    const filterBtn = screen.getByTestId('filter-btn');

    fireEvent.change(startInput, { target: { value: '2026-06-01' } });
    fireEvent.change(endInput, { target: { value: '2026-06-30' } });
    fireEvent.click(filterBtn);

    expect(mockFetchData).toHaveBeenCalledWith({ startDate: '2026-06-01', endDate: '2026-06-30' });
  });

  it('should render loading spinner when isLoading is true', () => {
    render(<AiUsageDashboard onFetchData={mockFetchData} isLoading={true} />);
    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
  });

  it('should render empty state when usageData is empty', () => {
    render(<AiUsageDashboard onFetchData={mockFetchData} usageData={[]} />);
    expect(screen.getByTestId('dashboard-empty')).toBeInTheDocument();
    expect(screen.getByText('No usage data found for the selected date range.')).toBeInTheDocument();
  });

  it('should render error alert when error occurs', () => {
    render(<AiUsageDashboard onFetchData={mockFetchData} error={{ message: 'Network error' }} />);
    expect(screen.getByTestId('dashboard-error')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('SECURITY TEST (ADM-05): Should NEVER render sensitive user content even if injected into data payload', () => {
    const maliciousData = [
      {
        date: '2026-06-01',
        feature: 'Writing',
        calls: 1,
        tokens: 100,
        // Simulated accidental data leakage from backend
        essayContent: 'SECRET_ESSAY_CONTENT',
        chatHistory: 'SECRET_CHAT_LOGS'
      }
    ];

    render(<AiUsageDashboard onFetchData={mockFetchData} usageData={maliciousData} />);

    // Assert that the UI is explicitly blind to these fields
    expect(screen.queryByText('SECRET_ESSAY_CONTENT')).not.toBeInTheDocument();
    expect(screen.queryByText('SECRET_CHAT_LOGS')).not.toBeInTheDocument();
  });
});
