import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import LandingPage from '../../../src/pages/LandingPage';

/**
 * Traceability Matrix:
 * - USER-01/07: Landing Page (UI Only) - Displays Call-to-Action buttons linking to /login and /register.
 */

describe('LandingPage Component', () => {
    const renderComponent = () => {
        render(
            <MemoryRouter>
                <LandingPage />
            </MemoryRouter>
        );
    };

    it('renders the IELTSZone title', () => {
        renderComponent();
        expect(screen.getByText('IELTSZone')).toBeInTheDocument();
    });

    // EARS[State]: The landing page must display Call-to-Action buttons linking to /login and /register
    it('renders the Call-to-Action buttons linking to /login and /register (Happy Path)', () => {
        renderComponent();
        
        const registerLink = screen.getByRole('link', { name: /Bắt đầu ngay/i });
        expect(registerLink).toBeInTheDocument();
        expect(registerLink).toHaveAttribute('href', '/register');

        const loginLink = screen.getByRole('link', { name: /Đăng nhập/i });
        expect(loginLink).toBeInTheDocument();
        expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('renders the feature cards correctly', () => {
        renderComponent();
        
        expect(screen.getByText('Chấm bài bằng AI')).toBeInTheDocument();
        expect(screen.getByText('Thư viện tài liệu')).toBeInTheDocument();
        expect(screen.getByText('Lộ trình cá nhân hóa')).toBeInTheDocument();
    });
    
    it('handles rendering correctly without crashing (Boundary Case / Component Resilience)', () => {
        // As this is a pure UI component without state/props, the boundary case 
        // is simply ensuring it mounts successfully without throwing errors.
        expect(() => renderComponent()).not.toThrow();
    });
});
