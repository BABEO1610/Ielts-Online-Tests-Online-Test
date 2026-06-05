/**
 * Traceability Matrix:
 * - T039_G (Dummy Test Selection Page): 
 *   - FR-01 (Happy Path): Renders successfully and displays both "Làm Writing Mock 1" and "Làm Speaking Mock 1" buttons.
 *   - FR-02 (Action): Clicking "Làm Writing Mock 1" triggers navigation to `/mock-test/writing/mock-1`.
 *   - FR-03 (Action): Clicking "Làm Speaking Mock 1" triggers navigation to `/mock-test/speaking/mock-1`.
 *   - ERR-01 (Error Case): Clicking a button that causes navigation error should trigger the catch block and log error, without crashing the UI.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DummyTestEntry from '../../../src/pages/grading/DummyTestEntry';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: vi.fn(),
    };
});

describe('DummyTestEntry Component', () => {
    const mockNavigate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        useNavigate.mockReturnValue(mockNavigate);
        // Suppress console.error for expected error tests
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('renders the component with correct headers and buttons (Happy Path)', () => {
        render(
            <MemoryRouter>
                <DummyTestEntry />
            </MemoryRouter>
        );

        expect(screen.getByText('Trang Chọn Bài Thi (Dummy)')).toBeInTheDocument();
        expect(screen.getByText('Vui lòng chọn bài Mock Test để kiểm thử')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /làm writing mock 1/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /làm speaking mock 1/i })).toBeInTheDocument();
    });

    it('navigates to the correct Writing Mock 1 URL when clicked (Happy Path)', () => {
        render(
            <MemoryRouter>
                <DummyTestEntry />
            </MemoryRouter>
        );

        const writingBtn = screen.getByRole('button', { name: /làm writing mock 1/i });
        fireEvent.click(writingBtn);

        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/mock-test/writing/mock-1');
    });

    it('navigates to the correct Speaking Mock 1 URL when clicked (Happy Path)', () => {
        render(
            <MemoryRouter>
                <DummyTestEntry />
            </MemoryRouter>
        );

        const speakingBtn = screen.getByRole('button', { name: /làm speaking mock 1/i });
        fireEvent.click(speakingBtn);

        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/mock-test/speaking/mock-1');
    });

    it('handles navigation error gracefully (Error Case - Boundary Value)', () => {
        // We will simulate a scenario where navigate throws an error
        const mockError = new Error('Test navigation error');
        mockNavigate.mockImplementation(() => {
            throw mockError;
        });

        render(
            <MemoryRouter>
                <DummyTestEntry />
            </MemoryRouter>
        );

        const writingBtn = screen.getByRole('button', { name: /làm writing mock 1/i });
        fireEvent.click(writingBtn); // This will trigger handleNavigate which catches the error

        // EARS[State-driven]: WHEN error occurs, THE component catches it and logs to console.error
        expect(console.error).toHaveBeenCalledWith("Navigation error:", mockError);
        
        // Ensure component is still rendered (did not crash)
        expect(screen.getByText('Trang Chọn Bài Thi (Dummy)')).toBeInTheDocument();
    });
});
