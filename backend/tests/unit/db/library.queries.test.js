jest.mock('../../../src/db/pool', () => ({
  pool: { query: jest.fn() },
}));

const { pool } = require('../../../src/db/pool');
const libraryQueries = require('../../../src/db/queries/library.queries');

describe('library queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockResolvedValue({ rows: [] });
  });

  it('keeps public results approved and excludes soft-deleted rows', async () => {
    await libraryQueries.getAllResources({ search: 'IELTS' });

    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain("review_status = 'approved'");
    expect(sql).toContain('deleted_at IS NULL');
    expect(values).toEqual(['%IELTS%']);
  });

  it('builds all public filters with parameterized values', async () => {
    await libraryQueries.getAllResources({
      category: 'Reading',
      resource_type: 'pdf',
      search: 'IELTS',
    });

    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain('category = $1');
    expect(sql).toContain('resource_type = $2');
    expect(sql).toContain('ILIKE $3');
    expect(values).toEqual(['Reading', 'pdf', '%IELTS%']);
  });

  it('accepts legacy string and empty filter inputs', async () => {
    await libraryQueries.getAllResources('Reading');
    expect(pool.query.mock.calls[0][1]).toEqual(['Reading']);

    await libraryQueries.getAllResources(null);
    expect(pool.query.mock.calls[1][1]).toEqual([]);
  });

  it('returns all moderation states for the current uploader', async () => {
    await libraryQueries.getResourcesByUploader('tutor-id', {
      category: 'Reading',
      resource_type: 'pdf',
    });

    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain('uploaded_by = $1');
    expect(sql).not.toContain("review_status = 'approved'");
    expect(sql).toContain('deleted_at IS NULL');
    expect(values).toEqual(['tutor-id', 'Reading', 'pdf']);
  });

  it('supports search for the current uploader', async () => {
    await libraryQueries.getResourcesByUploader('tutor-id', { search: 'lesson' });
    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain('ILIKE $2');
    expect(values).toEqual(['tutor-id', '%lesson%']);
  });

  it('accepts an empty uploader filter object', async () => {
    await libraryQueries.getResourcesByUploader('tutor-id', null);
    expect(pool.query.mock.calls[0][1]).toEqual(['tutor-id']);
  });

  it('queries public, owned and admin-managed details', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 'resource-id' }] });

    await expect(libraryQueries.getResourceById('resource-id'))
      .resolves.toEqual({ id: 'resource-id' });
    expect(pool.query.mock.calls[0][0]).toContain("review_status = 'approved'");

    await libraryQueries.getResourceById('resource-id', 'tutor-id');
    expect(pool.query.mock.calls[1][1]).toEqual(['resource-id', 'tutor-id']);

    await libraryQueries.getManagedResourceById('resource-id', 'admin-id', true);
    expect(pool.query.mock.calls[2][1]).toEqual(['resource-id', 'admin-id', true]);
  });

  it('returns null when detail queries find no active row', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    await expect(libraryQueries.getResourceById('missing-id')).resolves.toBeNull();
    await expect(
      libraryQueries.getResourceById('missing-id', 'tutor-id')
    ).resolves.toBeNull();
    await expect(
      libraryQueries.getManagedResourceById('missing-id', 'tutor-id', false)
    ).resolves.toBeNull();
  });

  it('creates a pending resource with parameterized metadata', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 'resource-id', review_status: 'pending' }] });
    const result = await libraryQueries.createResource({
      title: 'Lesson',
      description: '',
      resource_type: 'pdf',
      file_url: 'https://example.test/file.pdf',
      file_size_bytes: 100,
      category: 'Reading',
      uploaded_by: 'tutor-id',
    });

    expect(result.review_status).toBe('pending');
    expect(pool.query.mock.calls[0][0]).toContain("TRUE, 'pending'");
    expect(pool.query.mock.calls[0][1]).toHaveLength(7);
  });

  it('normalizes optional create metadata to null', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 'resource-id' }] });
    await libraryQueries.createResource({
      title: 'Minimal',
      resource_type: 'pdf',
      file_url: 'https://example.test/file.pdf',
      file_size_bytes: 0,
      uploaded_by: 'tutor-id',
    });
    expect(pool.query.mock.calls[0][1]).toEqual([
      'Minimal', null, 'pdf', 'https://example.test/file.pdf', null, null, 'tutor-id',
    ]);
  });

  it('updates metadata with and without a replacement file', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 'resource-id' }] });
    await libraryQueries.updateResource(
      'resource-id',
      'tutor-id',
      { title: 'Metadata', description: '', category: null },
      false
    );
    expect(pool.query.mock.calls[0][1]).toEqual([
      'Metadata', null, null, 'resource-id', 'tutor-id', false,
    ]);

    await libraryQueries.updateResource(
      'resource-id',
      'admin-id',
      {
        title: 'File',
        resource_type: 'pdf',
        file_url: 'https://example.test/new.pdf',
        file_size_bytes: 10,
      },
      true
    );
    expect(pool.query.mock.calls[1][0]).toContain('file_url = $5');
    expect(pool.query.mock.calls[1][1]).toHaveLength(9);
  });

  it('soft deletes metadata instead of deleting the row', async () => {
    await libraryQueries.deleteResource('resource-id', 'tutor-id', false);

    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain('UPDATE library_resources');
    expect(sql).toContain('SET deleted_at = COALESCE(deleted_at, NOW())');
    expect(sql).not.toContain('DELETE FROM library_resources');
    expect(sql).toContain('storage_cleanup_pending = TRUE');
    expect(values).toEqual(['resource-id', 'tutor-id', false]);
  });

  it('marks storage cleanup complete after object deletion', async () => {
    await libraryQueries.markStorageCleanupComplete('resource-id');
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('storage_cleanup_pending = FALSE'),
      ['resource-id']
    );
  });
});
