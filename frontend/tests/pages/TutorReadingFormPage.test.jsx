import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TutorReadingFormPage from '../../src/pages/tutor/TutorReadingFormPage';
import { testService } from '../../src/services/test.service';

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/services/test.service', () => ({
  testService: {
    createTest: vi.fn()
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock ReadingTestPreviewModal to avoid rendering complexities in tests
vi.mock('../../src/components/tutor/reading/ReadingTestPreviewModal.jsx', () => ({
  default: () => <div data-testid="preview-modal" />,
}));
describe('TutorReadingFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // mock window.alert
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    window.alert.mockRestore();
  });

  it('shows alert if title is empty when saving', async () => {
    render(
      <BrowserRouter>
        <TutorReadingFormPage />
      </BrowserRouter>
    );

    const saveBtn = screen.getByText('Save Test');
    fireEvent.click(saveBtn);

    expect(window.alert).toHaveBeenCalledWith('Test title is required');
    expect(testService.createTest).not.toHaveBeenCalled();
  });

  it('calls createTest and navigates on successful save', async () => {
    testService.createTest.mockResolvedValueOnce({ success: true, data: 'test-1' });

    render(
      <BrowserRouter>
        <TutorReadingFormPage />
      </BrowserRouter>
    );

    const titleInput = screen.getByPlaceholderText('e.g. Cambridge 18 Reading Test 1');
    fireEvent.change(titleInput, { target: { value: 'Mock Test' } });

    const saveBtn = screen.getByText('Save Test');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(testService.createTest).toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalledWith('Test saved and published!');
      expect(mockNavigate).toHaveBeenCalledWith('/tutor/tests');
    });
  });

  it('calls createTest as draft', async () => {
    testService.createTest.mockResolvedValueOnce({ success: true, data: 'test-1' });

    render(
      <BrowserRouter>
        <TutorReadingFormPage />
      </BrowserRouter>
    );

    const titleInput = screen.getByPlaceholderText('e.g. Cambridge 18 Reading Test 1');
    fireEvent.change(titleInput, { target: { value: 'Mock Draft' } });

    const draftBtn = screen.getByText('Save as Draft');
    fireEvent.click(draftBtn);

    await waitFor(() => {
      expect(testService.createTest).toHaveBeenCalled();
      const payload = testService.createTest.mock.calls[0][0];
      expect(payload.publishAt).toBeNull();
      expect(window.alert).toHaveBeenCalledWith('Draft saved successfully!');
    });
  });
});
