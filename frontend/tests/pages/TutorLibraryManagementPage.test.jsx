/**
 * TRACEABILITY MATRIX
 * -------------------
 * Test Case                                  | Requirement ID | Description
 * -------------------------------------------|----------------|------------------------------------------------
 * Access Denied for Student/Guest            | FR-17          | Ngăn chặn truy cập nếu role không phải là tutor/admin
 * Authorized Access for Tutor                | FR-14          | Hiển thị trang quản lý nếu role hợp lệ
 * Load Resources on Mount                    | FR-14          | Tự động gọi API fetch danh sách tài liệu
 * Filter by Type                             | FR-02          | Gửi request mới khi thay đổi filter loại tài liệu
 * Click Edit / Delete calls respective action| FR-11, FR-13   | Thao tác trên UI gọi hàm tương ứng
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TutorLibraryManagementPage from '../../../src/pages/TutorLibraryManagementPage';
import { useAuth } from '../../../src/context/AuthContext';
import useLibrary from '../../../src/hooks/useLibrary';

// Mock the context and hook
jest.mock('../../../src/context/AuthContext', () => ({
  useAuth: jest.fn()
}));

jest.mock('../../../src/hooks/useLibrary', () => ({
  __esModule: true,
  default: jest.fn()
}));

// Mock the components used inside
jest.mock('../../../src/components/library/ResourceCard', () => ({ resource, onEdit, onDelete }) => (
  <div data-testid="mock-resource-card">
    <span>{resource.title}</span>
    <button data-testid={`edit-btn-${resource.id}`} onClick={() => onEdit(resource)}>Edit</button>
    <button data-testid={`delete-btn-${resource.id}`} onClick={() => onDelete(resource)}>Delete</button>
  </div>
));
jest.mock('../../../src/components/library/TutorLibraryToolbar', () => ({ onUploadClick }) => (
  <button data-testid="mock-toolbar-upload" onClick={onUploadClick}>Upload Toolbar</button>
));
jest.mock('../../../src/components/library/ResourceUploadModal', () => ({ isOpen, onClose }) => (
  isOpen ? <div data-testid="mock-upload-modal"><button onClick={onClose}>Close</button></div> : null
));
jest.mock('../../../src/components/library/ResourceEditModal', () => ({ isOpen, onClose }) => (
  isOpen ? <div data-testid="mock-edit-modal"><button onClick={onClose}>Close</button></div> : null
));

describe('TutorLibraryManagementPage', () => {
  const mockFetchResources = jest.fn();
  const mockDeleteResource = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default valid useLibrary
    useLibrary.mockReturnValue({
      loading: false,
      error: null,
      fetchResources: mockFetchResources.mockResolvedValue({ data: [] }),
      deleteResource: mockDeleteResource,
      downloadResource: jest.fn(),
      clearError: jest.fn()
    });
  });

  it('should redirect if user is not authenticated or not tutor/admin', () => {
    // EARS[Unwanted]: IN CASE user is student THEN access is blocked
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { role: 'student' },
      isLoading: false
    });

    render(
      <MemoryRouter initialEntries={['/manage']}>
        <TutorLibraryManagementPage />
      </MemoryRouter>
    );

    // <Navigate> redirects, so the page content shouldn't be rendered
    expect(screen.queryByText('Quản lý Thư viện')).not.toBeInTheDocument();
  });

  it('should render management page and load resources if user is tutor', async () => {
    // EARS[Event]: WHEN user is tutor THEN page renders and loads data
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { role: 'tutor' },
      isLoading: false
    });
    
    const mockData = [
      { id: '1', title: 'IELTS PDF', resource_type: 'pdf', is_published: true },
      { id: '2', title: 'IELTS Audio', resource_type: 'audio', is_published: false }
    ];
    
    mockFetchResources.mockResolvedValue({ data: mockData });

    render(
      <MemoryRouter>
        <TutorLibraryManagementPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Quản lý Thư viện')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(mockFetchResources).toHaveBeenCalled();
      expect(screen.getAllByTestId('mock-resource-card')).toHaveLength(2);
      expect(screen.getByText('IELTS PDF')).toBeInTheDocument();
    });
  });

  it('should apply filters and refetch data when filter changes', async () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { role: 'admin' },
      isLoading: false
    });

    render(
      <MemoryRouter>
        <TutorLibraryManagementPage />
      </MemoryRouter>
    );

    const typeSelect = screen.getByTestId('filter-type-select');
    
    fireEvent.change(typeSelect, { target: { value: 'pdf' } });
    
    await waitFor(() => {
      expect(mockFetchResources).toHaveBeenCalledWith(expect.objectContaining({
        resource_type: 'pdf'
      }));
    });
  });

  it('should open edit modal when edit is clicked', async () => {
    useAuth.mockReturnValue({
      isAuthenticated: true, user: { role: 'admin' }, isLoading: false
    });
    mockFetchResources.mockResolvedValue({ data: [{ id: '1', title: 'IELTS', resource_type: 'pdf' }] });

    render(<MemoryRouter><TutorLibraryManagementPage /></MemoryRouter>);
    
    await waitFor(() => screen.getByTestId('edit-btn-1'));
    
    fireEvent.click(screen.getByTestId('edit-btn-1'));
    expect(screen.getByTestId('mock-edit-modal')).toBeInTheDocument();
  });
  
  it('should call deleteResource when delete is confirmed', async () => {
    // Mock window.confirm
    const confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);
    
    useAuth.mockReturnValue({
      isAuthenticated: true, user: { role: 'tutor' }, isLoading: false
    });
    mockFetchResources.mockResolvedValue({ data: [{ id: '1', title: 'IELTS', resource_type: 'pdf' }] });

    render(<MemoryRouter><TutorLibraryManagementPage /></MemoryRouter>);
    
    await waitFor(() => screen.getByTestId('delete-btn-1'));
    
    fireEvent.click(screen.getByTestId('delete-btn-1'));
    
    expect(confirmSpy).toHaveBeenCalled();
    expect(mockDeleteResource).toHaveBeenCalledWith('1');
    
    confirmSpy.mockRestore();
  });
});
