const crypto = require('node:crypto');
const { FakeObjectStorageAdapter } = require('../../../src/storage/objectStorage.adapter');
const { SpeakingEvidenceService, assertEvidenceSize } = require('../../../src/services/speakingEvidence.service');

jest.mock('../../../src/db/queries/speakingAnalysis.queries', () => ({
  getReusableArtifact: jest.fn(),
  insertProcessingArtifact: jest.fn(),
  getArtifactByConfig: jest.fn(),
  finalizeArtifact: jest.fn(),
}));
const artifacts = require('../../../src/db/queries/speakingAnalysis.queries');

describe('SpeakingEvidenceService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('keeps ASR and display transcript separate and marks missing speech evidence partial', async () => {
    const body = Buffer.from('real-audio-bytes');
    const hash = crypto.createHash('sha256').update(body).digest('hex');
    const storage = new FakeObjectStorageAdapter();
    storage.putObject('private/audio.mp3', body, { contentType: 'audio/mpeg' });
    const pool = { query: jest.fn().mockResolvedValue({ rows: [{ id: 'submission-1' }] }) };
    artifacts.getReusableArtifact.mockResolvedValue(null);
    artifacts.insertProcessingArtifact.mockResolvedValue({ id: 'artifact-1', status: 'processing' });
    artifacts.finalizeArtifact.mockImplementation(async (_db, input) => ({ id: 'artifact-1', ...input }));
    const service = new SpeakingEvidenceService({
      pool,
      storage,
      normalizer: { normalize: jest.fn().mockResolvedValue({
        buffer: body, contentType: 'audio/wav', quality: {}, providerManifest: { version: 'test' },
      }) },
      transcriber: { transcribe: jest.fn().mockResolvedValue({
        asrTranscript: 'I goed home', displayTranscript: 'I goed home',
        providerManifest: { model: 'test' }, words: null, segments: null, uncertainty: null,
      }) },
      speechEvidence: { analyze: jest.fn().mockResolvedValue({
        status: 'unavailable', componentStatus: { fluency: { status: 'unavailable' }, pronunciation: { status: 'unavailable' } },
        providerManifest: { provider: 'none' }, fluencyMetrics: null, pronunciationEvidence: null,
      }) },
    });
    const result = await service.processPart({
      submission: { id: 'submission-1', audio_storage_key: 'private/audio.mp3', audio_size_bytes: body.length, declared_audio_sha256: hash },
      job: { id: 'job-1', user_id: 'user-1', scoring_config_sha256: 'a'.repeat(64), pipeline_version: 'v1' },
      workerId: 'worker-1', generation: 1,
    });
    expect(result.status).toBe('partial');
    expect(result.asrTranscript).toBe('I goed home');
    expect(result.displayTranscript).toBe('I goed home');
    expect(artifacts.getReusableArtifact).toHaveBeenCalledWith(pool, expect.objectContaining({
      sourceJobId: 'job-1',
    }));
    expect(artifacts.finalizeArtifact).toHaveBeenCalledWith(pool, expect.objectContaining({ status: 'partial' }));
    const [leaseSql] = pool.query.mock.calls[0];
    expect(leaseSql).toMatch(/job\.group_id = submission\.speaking_group_id/i);
    expect(leaseSql).toMatch(/job\.user_id = submission\.user_id/i);
  });

  test('rejects oversized evidence before persistence', () => {
    expect(() => assertEvidenceSize({ providerManifest: { text: 'x'.repeat(33000) } }))
      .toThrow('vượt giới hạn');
  });

  test('rejects a downloaded object when its checksum differs from the bound upload digest', async () => {
    const body = Buffer.from('changed-audio-bytes');
    const storage = new FakeObjectStorageAdapter();
    storage.putObject('private/audio.m4a', body, { contentType: 'audio/mp4' });
    const pool = { query: jest.fn() };
    const normalizer = { normalize: jest.fn() };
    const service = new SpeakingEvidenceService({
      pool,
      storage,
      normalizer,
      transcriber: {},
      speechEvidence: {},
    });

    await expect(service.processPart({
      submission: {
        id: 'submission-1',
        audio_storage_key: 'private/audio.m4a',
        audio_size_bytes: body.length,
        declared_audio_sha256: crypto.createHash('sha256').update('original-audio').digest('hex'),
      },
      job: {
        id: 'job-1', user_id: 'user-1', scoring_config_sha256: 'a'.repeat(64), pipeline_version: 'v1',
      },
      workerId: 'worker-1',
      generation: 1,
    })).rejects.toMatchObject({ errorCode: 'AUDIO_SHA256_MISMATCH' });
    expect(normalizer.normalize).not.toHaveBeenCalled();
    expect(pool.query).not.toHaveBeenCalled();
  });
});
