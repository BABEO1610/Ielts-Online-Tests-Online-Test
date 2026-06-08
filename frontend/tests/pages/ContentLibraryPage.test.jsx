/**
 * Traceability Matrix:
 * | Test Case | Requirement ID | SPEC Section | Description |
 * |-----------|----------------|--------------|-------------|
 * | TC01      | FR-01 / FR-05  | SPEC §3.1,3.3| Verify /library route renders page with "Thư viện" title and navbar |
 * | TC02      | FR-05          | SPEC §3.3    | Verify StudentNavbar displays guest login/register buttons when guest |
 * | TC03      | FR-01          | SPEC §3.1    | Verify StudentNavbar displays profile dropdown when authenticated |
 * | TC04      | FR-01 / FR-02  | SPEC §3.1    | Verify ContentLibraryPage displays resource list and filter controls |
 * | TC05      | FR-01          | SPEC §3.1    | Verify empty state displays when no resources |
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ContentLibraryPage from '../../src/pages/ContentLibraryPage';

// Mock contexts and hooks
let mockAuthValue = {
  user: null,
  isAuthenticated: false,
  logout: vi.fn(),
};

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => mockAuthValue,
}));

let mockLibraryValue = {
  loading: false,
  error: null,
  fetchResources: vi.fn(),
  deleteResource: vi.fn(),
  downloadResource: vi.fn(),
  clearError: vi.fn(),
};

vi.mock('../../src/hooks/useLibrary', () => ({
  default: () => mockLibraryValue,
}));

describe('ContentLibraryPage & StudentNavbar (Routing & Navigation)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthValue.user = null;
    mockAuthValue.isAuthenticated = false;
    
    mockLibraryValue.loading = false;
    mockLibraryValue.error = null;
    mockLibraryValue.fetchResources.mockResolvedValue({
      data: [
        {
          id: 1,
          title: 'Cambridge IELTS 16',
          resource_type: 'pdf',
          file_size_bytes: 1048576,
          created_at: '2023-01-01T00:00:00Z',
          is_published: true
        }
      ],
      meta: { total: 1 }
    });
  });

  it('TC01: Renders page successfully with public navigation link and "Thư viện" title', async () => {
    render(
      <BrowserRouter>
        <ContentLibraryPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Thư viện Tài liệu')).toBeInTheDocument();
    
    const navLink = screen.getByTestId('library-nav-link');
    expect(navLink).toBeInTheDocument();
    expect(navLink.getAttribute('href')).toBe('/library');
    
    await waitFor(() => {
      expect(mockLibraryValue.fetchResources).toHaveBeenCalled();
    });
  });

  it('TC02: Renders login and register buttons in Guest mode', async () => {
    mockAuthValue.isAuthenticated = false;

    render(
      <BrowserRouter>
        <ContentLibraryPage />
      </BrowserRouter>
    );

    expect(screen.getByTestId('guest-auth-buttons')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-dropdown')).not.toBeInTheDocument();
  });

  it('TC03: Renders user profile dropdown when authenticated', async () => {
    mockAuthValue.isAuthenticated = true;
    mockAuthValue.user = { full_name: 'Alex Johnson' };

    render(
      <BrowserRouter>
        <ContentLibraryPage />
      </BrowserRouter>
    );

    expect(screen.getByTestId('profile-dropdown')).toBeInTheDocument();
    expect(screen.queryByTestId('guest-auth-buttons')).not.toBeInTheDocument();
  });

  it('TC04: Displays resource list and filter controls', async () => {
    render(
      <BrowserRouter>
        <ContentLibraryPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Cambridge IELTS 16')).toBeInTheDocument();
    });
    
    // Check filter buttons
    expect(screen.getByText('Tất cả')).toBeInTheDocument();
    expect(screen.getByText('Tài liệu PDF')).toBeInTheDocument();
    expect(screen.getByText('File Audio')).toBeInTheDocument();
  });

  it('TC05: Displays empty state when no resources', async () => {
    mockLibraryValue.fetchResources.mockResolvedValueOnce({
      data: [],
      meta: { total: 0 }
    });

    render(
      <BrowserRouter>
        <ContentLibraryPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Chưa có tài liệu nào')).toBeInTheDocument();
      expect(screen.queryByText('Cambridge IELTS 16')).not.toBeInTheDocument();
    });
  });
});
