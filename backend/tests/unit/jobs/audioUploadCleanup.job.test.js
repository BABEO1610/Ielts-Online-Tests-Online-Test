jest.mock('../../../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn() }));

const { AudioUploadCleanupJob } = require('../../../src/jobs/audioUploadCleanup.job');

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OLD_KEY = `quarantine/speaking/${USER_ID}/22222222-2222-4222-8222-222222222222.mp3`;
const BOUND_KEY = `quarantine/speaking/${USER_ID}/33333333-3333-4333-8333-333333333333.wav`;

const createPool = ({ batchBound = [BOUND_KEY], finalBound = [] } = {}) => {
  const client = {
    query: jest.fn(async (sql) => {
      if (String(sql).includes('SELECT 1 FROM speaking_submissions')) {
        return { rows: finalBound.length ? [{ '?column?': 1 }] : [] };
      }
      return { rows: [] };
    }),
    release: jest.fn(),
  };
  return {
    query: jest.fn(async () => ({ rows: batchBound.map((audio_storage_key) => ({ audio_storage_key })) })),
    connect: jest.fn(async () => client),
    client,
  };
};

const config = {
  storage: { quarantineMinAgeSeconds: 86400, cleanupBatchSize: 100 },
};

describe('audio upload quarantine cleanup', () => {
  test('deletes only old, unbound objects after a final locked DB cross-check', async () => {
    const pool = createPool();
    const storage = {
      listObjects: jest.fn(async () => ({
        objects: [OLD_KEY, BOUND_KEY].map((key) => ({ key, lastModified: '2026-07-20T00:00:00Z' })),
        nextCursor: null,
      })),
      deleteObject: jest.fn(async () => true),
    };
    const job = new AudioUploadCleanupJob({
      pool, storage, config, now: () => Date.parse('2026-07-22T00:00:00Z'),
    });
    await expect(job.runBatch()).resolves.toEqual({ scanned: 2, eligible: 1, deleted: 1 });
    expect(storage.deleteObject).toHaveBeenCalledWith({ key: OLD_KEY });
    expect(storage.deleteObject).not.toHaveBeenCalledWith({ key: BOUND_KEY });
    expect(pool.client.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [`speaking-audio-object:${OLD_KEY}`]
    );
  });

  test('keeps an object that becomes bound between batch scan and deletion', async () => {
    const pool = createPool({ batchBound: [], finalBound: [OLD_KEY] });
    const storage = {
      listObjects: jest.fn(async () => ({
        objects: [{ key: OLD_KEY, lastModified: '2026-07-20T00:00:00Z' }],
        nextCursor: null,
      })),
      deleteObject: jest.fn(),
    };
    const job = new AudioUploadCleanupJob({
      pool, storage, config, now: () => Date.parse('2026-07-22T00:00:00Z'),
    });
    await expect(job.runBatch()).resolves.toEqual({ scanned: 1, eligible: 1, deleted: 0 });
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });
});
