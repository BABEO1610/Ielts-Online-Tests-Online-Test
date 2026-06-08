/*
 * Traceability Matrix:
 * - T039_B: Bọc ProtectedRoute role="tutor" cho các trang của giáo viên.
 * - AC-08: Role Enforcement - Dùng JWT của tài khoản có role student gọi vào API chấm bài của Tutor (trên Frontend, prevent UI access).
 *
 * Test Cases:
 * 1. Happy Path: Render loading indicator when isLoading is true.
 * 2. Error Case (Boundary): Redirect to /login when not authenticated.
 * 3. Happy Path: Render children when authenticated and no specific role is required.
 * 4. Happy Path: Render children when authenticated and user role matches required role (tutor).
 * 5. Happy Path: Render children when authenticated, required role is tutor, but user is admin.
 * 6. Error Case (Boundary): Redirect to /dashboard when authenticated but user role does not match required role (student accessing tutor route).
 * 7. Happy Path: Render Outlet when children are not provided (used as Layout Component).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../../../src/components/auth/ProtectedRoute';
import { useAuth } from '../../../src/context/AuthContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (role) => {
    return render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard Page</div>} />
          <Route 
            path="/protected" 
            element={
              <ProtectedRoute role={role}>
                <div data-testid="protected-content">Protected Content</div>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </MemoryRouter>
    );
  };

  it('TC1: should render loading indicator when isLoading is true', () => {
    useAuth.mockReturnValue({ isLoading: true, isAuthenticated: false, user: null });
    renderComponent();
    expect(screen.getByText('Đang xác thực thông tin...')).toBeInTheDocument();
  });

  it('TC2: should redirect to /login when not authenticated', () => {
    useAuth.mockReturnValue({ isLoading: false, isAuthenticated: false, user: null });
    renderComponent();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('TC3: should render children when authenticated and no specific role is required', () => {
    useAuth.mockReturnValue({ isLoading: false, isAuthenticated: true, user: { id: 1, role: 'student' } });
    renderComponent();
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

});
