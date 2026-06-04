import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AuthLayout from '../../../../src/components/layout/AuthLayout';

/**
 * Traceability Matrix:
 * - Requirement: T043 - Component căn giữa màn hình cho các trang đăng nhập/đăng ký.
 * - EARS: EARS[State]: WHILE rendering auth pages, THE system SHALL wrap children in a centered layout.
 */

describe('AuthLayout Component', () => {
  it('should render children correctly', () => {
    // EARS[State]: WHILE rendering auth pages, THE system SHALL wrap children in a centered layout.
    render(
      <AuthLayout>
        <div data-testid="test-child">Child Content</div>
      </AuthLayout>
    );

    const child = screen.getByTestId('test-child');
    expect(child).toBeInTheDocument();
    expect(child).toHaveTextContent('Child Content');
  });

  it('should apply centering and layout classes to wrapper', () => {
    const { container } = render(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    // Kiểm tra thẻ div wrapper ngoài cùng
    const outerContainer = container.firstChild;
    expect(outerContainer).toHaveClass('auth-container');
  });

  it('should apply Uber-inspired design classes to card container', () => {
    const { container } = render(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    // Kiểm tra UI của container hiển thị form (Uber card style)
    const cardWrapper = container.querySelector('.auth-card-wrapper');
    expect(cardWrapper).toBeInTheDocument();
    
    const cardContent = container.querySelector('.card-content');
    expect(cardContent).toBeInTheDocument();
  });
});
