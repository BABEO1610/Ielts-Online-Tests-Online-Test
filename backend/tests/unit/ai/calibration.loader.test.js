const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  calibrationGate,
  loadCalibrationBundle,
} = require('../../../src/ai/calibration/calibration.loader');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const scoringDigest = 'a'.repeat(64);
const bundle = {
  schema_version: 1,
  version: 'vi-ielts-v1',
  scoring_config_sha256: scoringDigest,
  population: 'vi-l2-english',
  approved_at: '2026-07-22T00:00:00.000Z',
  approved_by: ['examiner-1', 'examiner-2'],
  criteria: {
    fluency_coherence: { minimum_speakers: 100, minimum_lower_95_ci: 0.75 },
    lexical_resource: { minimum_speakers: 100, minimum_lower_95_ci: 0.75 },
    grammatical_range_accuracy: { minimum_speakers: 100, minimum_lower_95_ci: 0.75 },
    pronunciation: { minimum_speakers: 100, minimum_lower_95_ci: 0.75 },
  },
};

describe('calibration.loader', () => {
  test('returns null when no approved bundle is configured', async () => {
    await expect(loadCalibrationBundle({})).resolves.toBeNull();
    expect(calibrationGate({ publishEnabled: true, bundle: null, scoringConfigSha256: scoringDigest }).allowed).toBe(false);
  });

  test('validates digest, signature, binding and freezes the bundle', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ielts-calibration-'));
    const file = path.join(dir, 'bundle.json');
    const raw = Buffer.from(JSON.stringify(bundle));
    await fs.writeFile(file, raw);
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const signature = crypto.sign(null, raw, privateKey).toString('base64');

    const loaded = await loadCalibrationBundle({
      bundlePath: file,
      expectedSha256: sha256(raw),
      expectedScoringConfigSha256: scoringDigest,
      publicKey,
      signature,
    });

    expect(Object.isFrozen(loaded)).toBe(true);
    expect(calibrationGate({ publishEnabled: true, bundle: loaded, scoringConfigSha256: scoringDigest })).toEqual({
      allowed: true,
      reason: null,
    });
    await fs.rm(dir, { recursive: true, force: true });
  });

  test('fails closed on a digest mismatch', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ielts-calibration-'));
    const file = path.join(dir, 'bundle.json');
    await fs.writeFile(file, JSON.stringify(bundle));
    await expect(loadCalibrationBundle({ bundlePath: file, expectedSha256: 'b'.repeat(64) }))
      .rejects.toMatchObject({ errorCode: 'CALIBRATION_DIGEST_MISMATCH' });
    await fs.rm(dir, { recursive: true, force: true });
  });
});
