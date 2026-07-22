const crypto = require('node:crypto');

const VERSION = 'v1';
const SHA256 = /^[0-9a-f]{64}$/;
const MAX_TOKEN_LENGTH = 4096;

class AudioUploadTokenError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'AudioUploadTokenError';
    this.errorCode = code;
    this.statusCode = code === 'UPLOAD_TOKEN_EXPIRED' ? 410 : 400;
  }
}

const fail = (message, code = 'UPLOAD_TOKEN_INVALID') => {
  throw new AudioUploadTokenError(message, code);
};

const decodeKey = (keyring, kid) => {
  const encoded = keyring?.[kid];
  if (!encoded) fail('Không tìm thấy khóa upload token.');
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) fail('Khóa upload token không hợp lệ.');
  return key;
};

const validatePayload = (payload) => {
  const valid = payload
    && typeof payload.user_id === 'string'
    && typeof payload.object_key === 'string'
    && payload.object_key.length > 0
    && [1, 2, 3].includes(payload.part_number)
    && typeof payload.content_type === 'string'
    && Number.isInteger(payload.size_bytes)
    && payload.size_bytes > 0
    && SHA256.test(payload.sha256 || '')
    && Number.isInteger(payload.duration_ms)
    && payload.duration_ms > 0
    && Number.isInteger(payload.iat)
    && Number.isInteger(payload.exp)
    && payload.exp > payload.iat;
  if (!valid) fail('Payload upload token không hợp lệ.');
};

const createAudioUploadToken = (payload, {
  keyring,
  activeKid,
  now = Date.now(),
  ttlSeconds = 300,
} = {}) => {
  if (!activeKid || !Number.isInteger(ttlSeconds) || ttlSeconds <= 0) fail('Cấu hình upload token không hợp lệ.');
  const issuedAt = Math.floor(now / 1000);
  const completePayload = { ...payload, iat: issuedAt, exp: issuedAt + ttlSeconds };
  validatePayload(completePayload);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', decodeKey(keyring, activeKid), iv);
  cipher.setAAD(Buffer.from(`${VERSION}.${activeKid}`));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(completePayload)), cipher.final()]);
  const token = [VERSION, activeKid, iv.toString('base64url'), encrypted.toString('base64url'), cipher.getAuthTag().toString('base64url')].join('.');
  return { token, expiresAt: new Date(completePayload.exp * 1000).toISOString() };
};

const parseToken = (token, keyring) => {
  const rawToken = String(token || '');
  if (rawToken.length > MAX_TOKEN_LENGTH) fail('Upload token quá dài.');
  const [version, kid, ivText, encryptedText, tagText, extra] = rawToken.split('.');
  if (version !== VERSION || !kid || !ivText || !encryptedText || !tagText || extra) fail('Upload token sai định dạng.');
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', decodeKey(keyring, kid), Buffer.from(ivText, 'base64url'));
    decipher.setAAD(Buffer.from(`${version}.${kid}`));
    decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64url')), decipher.final()]);
    return { kid, payload: JSON.parse(plaintext.toString('utf8')) };
  } catch (error) {
    if (error instanceof AudioUploadTokenError) throw error;
    return fail('Upload token không xác thực được.');
  }
};

const verifyAudioUploadToken = (token, {
  keyring,
  now = Date.now(),
  expectedUserId,
  expectedPartNumber,
  allowExpired = false,
} = {}) => {
  const { kid, payload } = parseToken(token, keyring);
  validatePayload(payload);
  if (!allowExpired && payload.exp <= Math.floor(now / 1000)) fail('Upload token đã hết hạn.', 'UPLOAD_TOKEN_EXPIRED');
  if (expectedUserId && payload.user_id !== expectedUserId) fail('Upload token không thuộc người dùng hiện tại.');
  if (expectedPartNumber && payload.part_number !== expectedPartNumber) fail('Upload token không khớp Part.');
  return Object.freeze({ ...payload, kid });
};

module.exports = {
  AudioUploadTokenError,
  createAudioUploadToken,
  verifyAudioUploadToken,
};
