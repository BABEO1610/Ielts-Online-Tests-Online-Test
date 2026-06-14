import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TutorLibraryToolbar from '../../../../src/components/library/TutorLibraryToolbar';

const mockAuthValue = {
  user: null
};

vi.mock('../../../../src/context/AuthContext', () => ({
  useAuth: () => mockAuthValue,
}));

describe('TutorLibraryToolbar component', () => {
  it('renders upload button when user is tutor', () => {
    mockAuthValue.user = { role: 'tutor' };
    render(<TutorLibraryToolbar onUploadClick={() => {}} />);
    expect(screen.getByTestId('tutor-library-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('upload-resource-btn')).toBeInTheDocument();
  });

  it('renders upload button when user is admin', () => {
    mockAuthValue.user = { role: 'admin' };
    render(<TutorLibraryToolbar onUploadClick={() => {}} />);
    expect(screen.getByTestId('tutor-library-toolbar')).toBeInTheDocument();
  });

  it('does not render when user is student', () => {
    mockAuthValue.user = { role: 'student' };
    const { container } = render(<TutorLibraryToolbar onUploadClick={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when user is guest', () => {
    mockAuthValue.user = null;
    const { container } = render(<TutorLibraryToolbar onUploadClick={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
