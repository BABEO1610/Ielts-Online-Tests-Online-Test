import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Dashboard from '../../src/pages/Dashboard';

// Mock the AuthContext
vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { full_name: 'Minh Nguyễn', avatar_url: '' },
    logout: vi.fn(),
  })
}));

describe('Dashboard Page', () => {
  it('renders without crashing and displays the user name', () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
    
    // Check Hero text
    expect(screen.getByText(/Chào mừng trở lại, Minh/i)).toBeInTheDocument();
    
    // Check Features Grid
    expect(screen.getByText(/Luyện viết cùng AI/i)).toBeInTheDocument();
    expect(screen.getByText(/Phòng thi mô phỏng/i)).toBeInTheDocument();
    expect(screen.getByText(/Đọc hiểu chuyên sâu/i)).toBeInTheDocument();
    expect(screen.getByText(/Nghe hiểu thực tế/i)).toBeInTheDocument();
    
    // Check Promo Band
    expect(screen.getByText(/Kho Tài Liệu IELTS Phong Phú/i)).toBeInTheDocument();
  });
});
