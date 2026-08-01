const mockUpload = jest.fn();
const mockRemove = jest.fn();
const mockGetPublicUrl = jest.fn();
const mockFrom = jest.fn(() => ({
  upload: mockUpload,
  remove: mockRemove,
  getPublicUrl: mockGetPublicUrl,
}));

jest.mock('../../../src/config/supabase', () => ({
  storage: { from: mockFrom },
}));

jest.mock('../../../src/db/queries/library.queries', () => ({
  getAllResources: jest.fn(),
  getResourcesByUploader: jest.fn(),
  getResourceById: jest.fn(),
  getManagedResourceById: jest.fn(),
  createResource: jest.fn(),
  updateResource: jest.fn(),
  deleteResource: jest.fn(),
  markStorageCleanupComplete: jest.fn(),
}));

const libraryQueries = require('../../../src/db/queries/library.queries');
const libraryService = require('../../../src/services/library.service');

const pdfFile = () => ({
  originalname: 'lesson.pdf',
  mimetype: 'application/octet-stream',
  size: 24,
  buffer: Buffer.from('%PDF-1.7\n1 0 obj\n%%EOF'),
});

describe('library.service upload workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpload.mockResolvedValue({ data: { path: 'stored.pdf' }, error: null });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://project.supabase.co/storage/v1/object/public/ieltszone_library/stored.pdf' },
    });
    mockRemove.mockResolvedValue({ error: null });
  });

  it('uses the detected MIME and persists a pending resource', async () => {
    libraryQueries.createResource.mockImplementation(async (data) => ({
      id: 'resource-id',
      review_status: 'pending',
      ...data,
    }));

    const result = await libraryService.createResource(
      { title: 'Reading lesson', category: 'Reading' },
      pdfFile(),
      'tutor-id'
    );

    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/\.pdf$/),
      expect.any(Buffer),
      expect.objectContaining({ contentType: 'application/pdf' })
    );
    expect(libraryQueries.createResource).toHaveBeenCalledWith(
      expect.objectContaining({
        resource_type: 'pdf',
        uploaded_by: 'tutor-id',
      })
    );
    expect(result.review_status).toBe('pending');
  });

  it('removes the newly uploaded object when the DB insert fails', async () => {
    libraryQueries.createResource.mockRejectedValue(new Error('DB unavailable'));

    await expect(
      libraryService.createResource({ title: 'Reading lesson' }, pdfFile(), 'tutor-id')
    ).rejects.toThrow('DB unavailable');

    expect(mockRemove).toHaveBeenCalledWith(['stored.pdf']);
  });

  it('rejects spoofed PDF content before writing to storage', async () => {
    const spoofedFile = {
      ...pdfFile(),
      buffer: Buffer.from('MZ fake executable content'),
    };

    await expect(
      libraryService.createResource({ title: 'Unsafe' }, spoofedFile, 'tutor-id')
    ).rejects.toMatchObject({ statusCode: 422 });

    expect(mockUpload).not.toHaveBeenCalled();
    expect(libraryQueries.createResource).not.toHaveBeenCalled();
  });

  it('returns the current tutor resources including moderation states', async () => {
    const resources = [{ id: 'pending-id', review_status: 'pending' }];
    libraryQueries.getResourcesByUploader.mockResolvedValue(resources);

    await expect(
      libraryService.listMyResources('tutor-id', { category: 'Reading' })
    ).resolves.toEqual(resources);
    expect(libraryQueries.getResourcesByUploader).toHaveBeenCalledWith(
      'tutor-id',
      { category: 'Reading' }
    );
  });

  it('delegates public listing and resource detail lookups', async () => {
    libraryQueries.getAllResources.mockResolvedValue([{ id: 'public-id' }]);
    libraryQueries.getResourceById.mockResolvedValue({ id: 'public-id' });

    await expect(libraryService.listResources({ resource_type: 'pdf' }))
      .resolves.toEqual([{ id: 'public-id' }]);
    await expect(libraryService.getResourceDetail('public-id'))
      .resolves.toEqual({ id: 'public-id' });

    libraryQueries.getResourceById.mockResolvedValue(null);
    await expect(libraryService.getResourceDetail('missing-id'))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('enforces owner/admin access for managed detail', async () => {
    libraryQueries.getManagedResourceById.mockResolvedValue({ id: 'resource-id' });

    await libraryService.getManagedResourceDetail('resource-id', 'admin-id', 'admin');
    expect(libraryQueries.getManagedResourceById)
      .toHaveBeenCalledWith('resource-id', 'admin-id', true);

    libraryQueries.getManagedResourceById.mockResolvedValue(null);
    await expect(
      libraryService.getManagedResourceDetail('resource-id', 'tutor-id', 'tutor')
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('requires a file and rejects unidentifiable content', async () => {
    await expect(
      libraryService.createResource({ title: 'Missing' }, null, 'tutor-id')
    ).rejects.toMatchObject({ errorCode: 'FILE_REQUIRED' });
    await expect(
      libraryService.validateFileMagicBytes(Buffer.from('plain text'))
    ).rejects.toMatchObject({ errorCode: 'FILE_INVALID' });
  });

  it('handles storage URL and provider error branches', async () => {
    await expect(
      libraryService.deleteFileFromSupabase('/uploads/library/local.pdf')
    ).resolves.toBe(false);
    await expect(
      libraryService.deleteFileFromSupabase('https://project.supabase.co/malformed.pdf')
    ).rejects.toMatchObject({ errorCode: 'STORAGE_URL_INVALID' });

    mockRemove.mockResolvedValueOnce({ error: { message: 'remove failed' } });
    await expect(
      libraryService.deleteFileFromSupabase(
        'https://project.supabase.co/storage/v1/object/public/ieltszone_library/stored.pdf',
        true
      )
    ).resolves.toBe(false);

    mockUpload.mockResolvedValueOnce({ error: { message: 'upload failed' } });
    await expect(
      libraryService.uploadFileToSupabase(pdfFile(), 'application/pdf')
    ).rejects.toMatchObject({ errorCode: 'UPLOAD_ERROR' });
  });

  it('cleans the new object and reports a conflict when update loses a race', async () => {
    libraryQueries.getManagedResourceById.mockResolvedValue({
      id: 'resource-id',
      file_url: 'https://project.supabase.co/storage/v1/object/public/ieltszone_library/old.pdf',
    });
    libraryQueries.updateResource.mockResolvedValue(null);

    await expect(
      libraryService.updateResource(
        'resource-id',
        'tutor-id',
        'tutor',
        { title: 'Updated' },
        pdfFile()
      )
    ).rejects.toMatchObject({ statusCode: 409, errorCode: 'RESOURCE_CONFLICT' });

    expect(mockRemove).toHaveBeenCalledWith(['stored.pdf']);
  });

  it('updates metadata without replacing the stored file', async () => {
    const existing = { id: 'resource-id', file_url: 'https://example.test/old.pdf' };
    libraryQueries.getManagedResourceById.mockResolvedValue(existing);
    libraryQueries.updateResource.mockResolvedValue({ ...existing, title: 'Updated' });

    await expect(
      libraryService.updateResource(
        'resource-id',
        'tutor-id',
        'tutor',
        { title: 'Updated', description: '', category: '' }
      )
    ).resolves.toMatchObject({ title: 'Updated' });
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('replaces a file and attempts to clean the previous object', async () => {
    const oldUrl = 'https://project.supabase.co/storage/v1/object/public/ieltszone_library/old.pdf';
    libraryQueries.getManagedResourceById.mockResolvedValue({
      id: 'resource-id',
      file_url: oldUrl,
    });
    libraryQueries.updateResource.mockResolvedValue({ id: 'resource-id' });

    await libraryService.updateResource(
      'resource-id',
      'admin-id',
      'admin',
      { title: 'Updated' },
      pdfFile()
    );

    expect(libraryQueries.updateResource).toHaveBeenCalledWith(
      'resource-id',
      'admin-id',
      expect.objectContaining({ resource_type: 'pdf' }),
      true
    );
    expect(mockRemove).toHaveBeenCalledWith(['old.pdf']);
  });

  it('cleans a replacement file when the update query throws', async () => {
    libraryQueries.getManagedResourceById.mockResolvedValue({
      id: 'resource-id',
      file_url: 'https://example.test/old.pdf',
    });
    libraryQueries.updateResource.mockRejectedValue(new Error('update failed'));

    await expect(
      libraryService.updateResource(
        'resource-id',
        'tutor-id',
        'tutor',
        { title: 'Updated' },
        pdfFile()
      )
    ).rejects.toThrow('update failed');
    expect(mockRemove).toHaveBeenCalledWith(['stored.pdf']);
  });

  it('rejects update/delete when the resource is missing', async () => {
    libraryQueries.getManagedResourceById.mockResolvedValue(null);
    await expect(
      libraryService.updateResource('missing', 'tutor-id', 'tutor', { title: 'Nope' })
    ).rejects.toMatchObject({ statusCode: 404 });

    libraryQueries.deleteResource.mockResolvedValue(null);
    await expect(
      libraryService.deleteResource('missing', 'tutor-id', 'tutor')
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('keeps a failed storage cleanup retryable', async () => {
    const deleted = {
      id: 'resource-id',
      file_url: 'https://project.supabase.co/storage/v1/object/public/ieltszone_library/stored.pdf',
    };
    libraryQueries.deleteResource.mockResolvedValue(deleted);
    mockRemove
      .mockResolvedValueOnce({ error: { message: 'temporary failure' } })
      .mockResolvedValueOnce({ error: null });

    await expect(
      libraryService.deleteResource('resource-id', 'tutor-id', 'tutor')
    ).rejects.toMatchObject({ errorCode: 'STORAGE_DELETE_ERROR' });
    expect(libraryQueries.markStorageCleanupComplete).not.toHaveBeenCalled();

    await expect(
      libraryService.deleteResource('resource-id', 'tutor-id', 'tutor')
    ).resolves.toEqual(deleted);
    expect(libraryQueries.deleteResource).toHaveBeenCalledTimes(2);
    expect(libraryQueries.markStorageCleanupComplete).toHaveBeenCalledWith('resource-id');
  });
});
