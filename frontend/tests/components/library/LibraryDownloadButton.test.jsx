/**
 * TRACEABILITY MATRIX
 * -------------------
 * Test Case                                  | Requirement ID | Description
 * -------------------------------------------|----------------|------------------------------------------------
 * Render download button correctly           | FR-04          | Nút tải xuống hiển thị đúng dựa trên resource
 * Guest click shows login prompt             | FR-05          | Guest click Download thì hiển thị yêu cầu login/register
 * Student click calls download API           | FR-04          | Student click Download thì gọi API download
 * Student download API failure shows alert   | FR-04          | Bắt lỗi khi download API thất bại
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import LibraryDownloadButton from '../../../../src/components/library/LibraryDownloadButton';
import { useAuth } from '../../../../src/context/AuthContext';
import useLibrary from '../../../../src/hooks/useLibrary';

// Mock hooks and modules
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn()
}));

jest.mock('../../../../src/context/AuthContext', () => ({
  useAuth: jest.fn()
}));

jest.mock('../../../../src/hooks/useLibrary', () => ({
  __esModule: true,
  default: jest.fn()
}));

describe('LibraryDownloadButton (T043)', () => {
  const mockNavigate = jest.fn();
  const mockDownloadResource = jest.fn();
  const mockResource = { id: 'test-id-1', title: 'Test PDF' };
  
  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
    useLibrary.mockReturnValue({
      downloadResource: mockDownloadResource
    });
    
    // Mock window.alert and window.confirm
    jest.spyOn(window, 'alert').mockImplementation(() => {});
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders login prompt button for guest users', () => {
    // EARS[State-driven]: WHEN user is not authenticated THEN render lock icon
    useAuth.mockReturnValue({ isAuthenticated: false });
    
    render(
      <MemoryRouter>
        <LibraryDownloadButton resource={mockResource} />
      </MemoryRouter>
    );
    
    const btn = screen.getByTestId('library-download-btn');
    expect(btn).toHaveTextContent('Đăng nhập để tải');
    expect(btn.querySelector('.bi-lock-fill')).toBeInTheDocument();
  });

  it('renders download button for authenticated users', () => {
    // EARS[State-driven]: WHEN user is authenticated THEN render download icon
    useAuth.mockReturnValue({ isAuthenticated: true });
    
    render(
      <MemoryRouter>
        <LibraryDownloadButton resource={mockResource} />
      </MemoryRouter>
    );
    
    const btn = screen.getByTestId('library-download-btn');
    expect(btn).toHaveTextContent('Tải xuống');
    expect(btn.querySelector('.bi-download')).toBeInTheDocument();
  });

  it('prompts guest to login when clicked', () => {
    // EARS[Event]: WHEN Guest clicks download THEN show login prompt
    useAuth.mockReturnValue({ isAuthenticated: false });
    window.confirm.mockReturnValue(true);
    
    render(
      <MemoryRouter>
        <LibraryDownloadButton resource={mockResource} />
      </MemoryRouter>
    );
    
    fireEvent.click(screen.getByTestId('library-download-btn'));
    
    // EARS[Unwanted]: IN CASE guest tries to download THEN block and confirm redirect
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Vui lòng đăng nhập'));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    expect(mockDownloadResource).not.toHaveBeenCalled();
  });

  it('calls download API when student clicks download', async () => {
    // EARS[Event]: WHEN Student clicks download THEN call API
    useAuth.mockReturnValue({ isAuthenticated: true });
    mockDownloadResource.mockResolvedValue(true);
    
    render(
      <MemoryRouter>
        <LibraryDownloadButton resource={mockResource} />
      </MemoryRouter>
    );
    
    fireEvent.click(screen.getByTestId('library-download-btn'));
    
    expect(screen.getByText('Đang tải...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(mockDownloadResource).toHaveBeenCalledWith('test-id-1', 'Test PDF');
    });
  });

  it('shows alert when download API fails for student', async () => {
    useAuth.mockReturnValue({ isAuthenticated: true });
    mockDownloadResource.mockRejectedValue(new Error('Network error'));
    
    render(
      <MemoryRouter>
        <LibraryDownloadButton resource={mockResource} />
      </MemoryRouter>
    );
    
    fireEvent.click(screen.getByTestId('library-download-btn'));
    
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Network error');
    });
  });
});
