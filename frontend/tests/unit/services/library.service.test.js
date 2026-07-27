import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../../src/services/api';
import {
  createLibraryResource,
  fetchMyLibraryResourceById,
  fetchMyLibraryResources,
} from '../../../src/services/library.service';

vi.mock('../../../src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('frontend library service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the tutor resources including pending documents', async () => {
    const payload = { success: true, data: [{ id: 'pending-id' }] };
    api.get.mockResolvedValue({ data: payload });

    await expect(fetchMyLibraryResources()).resolves.toEqual(payload);
    expect(api.get).toHaveBeenCalledWith('/library/mine', { params: {} });
  });

  it('loads a pending document through the protected owner endpoint', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: { id: 'pending-id' } } });

    await fetchMyLibraryResourceById('pending-id');
    expect(api.get).toHaveBeenCalledWith('/library/mine/pending-id');
  });

  it('uploads the expected multipart fields and leaves the boundary to the browser', async () => {
    api.post.mockResolvedValue({ data: { success: true, data: { id: 'new-id' } } });
    const file = new File(['%PDF-1.7'], 'lesson.pdf', { type: 'application/pdf' });
    const onProgress = vi.fn();

    await createLibraryResource(
      { title: 'Lesson', description: 'Details', category: 'Reading' },
      file,
      onProgress
    );

    const [url, formData, config] = api.post.mock.calls[0];
    expect(url).toBe('/library');
    expect(formData.get('title')).toBe('Lesson');
    expect(formData.get('file')).toBe(file);
    expect(config).toEqual({ onUploadProgress: onProgress });
    expect(config.headers).toBeUndefined();
  });
});
