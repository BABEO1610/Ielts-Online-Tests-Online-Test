/**
 * TRACEABILITY MATRIX
 * -------------------
 * Test Case                                  | Requirement ID | Description
 * -------------------------------------------|----------------|------------------------------------------------
 * Do not render for Student/Guest            | T044, FR-17    | Trả về rỗng (không render) khi role là student hoặc guest
 * Render correctly for Tutor/Admin           | T044, FR-14    | Render nút thành công khi login với role tutor/admin
 * Navigate to Builder on click               | T044           | Click nút sẽ gọi hàm navigate sang module objective-testing
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import MockTestBuilderEntry from '../../../../src/components/library/MockTestBuilderEntry';
import { useAuth } from '../../../../src/context/AuthContext';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn()
}));

jest.mock('../../../../src/context/AuthContext', () => ({
  useAuth: jest.fn()
}));

describe('MockTestBuilderEntry (T044)', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
  });

  it('does not render if user is not tutor or admin', () => {
    // EARS[State-driven]: WHEN role is student THEN render nothing
    useAuth.mockReturnValue({
      user: { role: 'student' }
    });

    const { container } = render(
      <MemoryRouter>
        <MockTestBuilderEntry />
      </MemoryRouter>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders button if user is tutor', () => {
    // EARS[State-driven]: WHEN role is tutor THEN render button
    useAuth.mockReturnValue({
      user: { role: 'tutor' }
    });

    render(
      <MemoryRouter>
        <MockTestBuilderEntry />
      </MemoryRouter>
    );

    const btn = screen.getByTestId('mock-test-builder-entry-btn');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent('Tạo đề Mock Test');
  });

  it('renders button if user is admin', () => {
    useAuth.mockReturnValue({
      user: { role: 'admin' }
    });

    render(
      <MemoryRouter>
        <MockTestBuilderEntry />
      </MemoryRouter>
    );

    expect(screen.getByTestId('mock-test-builder-entry-btn')).toBeInTheDocument();
  });

  it('navigates to builder without resourceId', () => {
    useAuth.mockReturnValue({
      user: { role: 'tutor' }
    });

    render(
      <MemoryRouter>
        <MockTestBuilderEntry />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('mock-test-builder-entry-btn'));

    // EARS[Event]: WHEN clicked THEN navigate to objective testing module
    expect(mockNavigate).toHaveBeenCalledWith('/tutor/mock-tests/builder');
  });

  it('navigates to builder with resourceId as query param', () => {
    useAuth.mockReturnValue({
      user: { role: 'admin' }
    });

    render(
      <MemoryRouter>
        <MockTestBuilderEntry resourceId="resource-123" />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('mock-test-builder-entry-btn'));

    expect(mockNavigate).toHaveBeenCalledWith('/tutor/mock-tests/builder?source=resource-123');
  });
});
