const {
  createAudioUploadToken,
  verifyAudioUploadToken,
} = require('../../../src/security/audioUploadToken');

const keyring = { k1: Buffer.alloc(32, 1).toString('base64') };
const payload = {
  user_id: 'user-1',
  object_key: 'quarantine/speaking/user-1/file.m4a',
  part_number: 1,
  content_type: 'audio/mp4',
  size_bytes: 1024,
  sha256: 'a'.repeat(64),
  duration_ms: 1000,
};

describe('audioUploadToken', () => {
  test('round-trips a bound AEAD payload', () => {
    const { token } = createAudioUploadToken(payload, { keyring, activeKid: 'k1', now: 1000, ttlSeconds: 60 });
    const decoded = verifyAudioUploadToken(token, {
      keyring, now: 2000, expectedUserId: 'user-1', expectedPartNumber: 1,
    });
    expect(decoded.object_key).toBe(payload.object_key);
    expect(token).not.toContain(payload.object_key);
  });

  test('rejects tampering and ownership mismatches', () => {
    const { token } = createAudioUploadToken(payload, { keyring, activeKid: 'k1', now: 1000 });
    expect(() => verifyAudioUploadToken(`${token}x`, { keyring })).toThrow();
    expect(() => verifyAudioUploadToken(token, { keyring, expectedUserId: 'user-2' })).toThrow();
  });

  test('rejects oversized tokens before attempting decryption', () => {
    expect(() => verifyAudioUploadToken('x'.repeat(4097), { keyring })).toThrow('Upload token quá dài.');
  });

  test('permits authenticated expired decoding only for an authoritative replay lookup', () => {
    const { token } = createAudioUploadToken(payload, { keyring, activeKid: 'k1', now: 1000, ttlSeconds: 1 });
    expect(() => verifyAudioUploadToken(token, { keyring, now: 3000 })).toThrow();
    expect(verifyAudioUploadToken(token, { keyring, now: 3000, allowExpired: true }).user_id).toBe('user-1');
  });

  test('old kid remains decryptable during key rotation', () => {
    const { token } = createAudioUploadToken(payload, { keyring, activeKid: 'k1' });
    const rotated = { ...keyring, k2: Buffer.alloc(32, 2).toString('base64') };
    expect(verifyAudioUploadToken(token, { keyring: rotated }).kid).toBe('k1');
  });
});
