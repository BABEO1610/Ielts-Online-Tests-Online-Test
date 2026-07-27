import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TutorLibraryPage from '../../src/pages/tutor/TutorLibraryPage';
import { useAuth } from '../../src/context/AuthContext';
import {
  deleteLibraryResource,
  fetchLibraryResources,
  fetchMyLibraryResources,
} from '../../src/services/library.service';

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../src/services/library.service', () => ({
  fetchLibraryResources: vi.fn(),
  fetchMyLibraryResources: vi.fn(),
  deleteLibraryResource: vi.fn(),
}));

describe('TutorLibraryPage upload visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: { id: 'tutor-id', role: 'tutor' },
    });
    fetchLibraryResources.mockResolvedValue({
      data: [{ id: 'approved-id', title: 'Approved lesson', review_status: 'approved' }],
    });
    fetchMyLibraryResources.mockResolvedValue({
      data: [{ id: 'pending-id', title: 'New upload', review_status: 'pending' }],
    });
    deleteLibraryResource.mockResolvedValue({ success: true });
  });

  it('merges the tutor pending list with the public approved catalog', async () => {
    render(
      <MemoryRouter>
        <TutorLibraryPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('New upload')).toBeInTheDocument();
      expect(screen.getByText('Approved lesson')).toBeInTheDocument();
      expect(screen.getByText('Chờ duyệt')).toBeInTheDocument();
    });

    expect(fetchMyLibraryResources).toHaveBeenCalledTimes(1);
  });
});
