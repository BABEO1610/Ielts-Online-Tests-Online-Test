const crypto = require('node:crypto');
const AppError = require('../utils/AppError');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const CONTENT_TYPES = new Map([
  ['audio/mpeg', { normalized: 'audio/mpeg', extension: 'mp3' }],
  ['audio/mp3', { normalized: 'audio/mpeg', extension: 'mp3' }],
  ['audio/mp4', { normalized: 'audio/mp4', extension: 'm4a' }],
  ['audio/x-m4a', { normalized: 'audio/mp4', extension: 'm4a' }],
  ['audio/wav', { normalized: 'audio/wav', extension: 'wav' }],
  ['audio/x-wav', { normalized: 'audio/wav', extension: 'wav' }],
]);

const requireUuid = (value, field) => {
  if (!UUID.test(String(value || ''))) throw new AppError(`${field} không hợp lệ.`, 400, 'INVALID_FIELD');
  return String(value).toLowerCase();
};

const requireIdempotencyKey = (value) => {
  const key = String(value || '').trim();
  if (key.length < 16 || key.length > 128 || /\p{Cc}/u.test(key)) {
    throw new AppError('Idempotency-Key phải dài từ 16 đến 128 ký tự.', 400, 'INVALID_IDEMPOTENCY_KEY');
  }
  return key;
};

const normalizeUploadInput = (body = {}) => {
  const partNumber = Number(body.part_number);
  const sizeBytes = Number(body.size_bytes);
  const durationMs = Number(body.duration_ms);
  const contentType = String(body.content_type || '').split(';')[0].trim().toLowerCase();
  const media = CONTENT_TYPES.get(contentType);
  if (![1, 2, 3].includes(partNumber)) throw new AppError('part_number phải là 1, 2 hoặc 3.', 400, 'INVALID_FIELD');
  if (!media) throw new AppError('Định dạng âm thanh không được hỗ trợ.', 415, 'UNSUPPORTED_AUDIO_TYPE');
  if (!Number.isInteger(sizeBytes) || sizeBytes < 1) throw new AppError('size_bytes không hợp lệ.', 400, 'INVALID_FIELD');
  if (sizeBytes > MAX_AUDIO_BYTES) throw new AppError('Tệp âm thanh vượt quá 50 MiB.', 413, 'AUDIO_TOO_LARGE');
  if (!Number.isInteger(durationMs) || durationMs < 1) throw new AppError('duration_ms không hợp lệ.', 400, 'INVALID_FIELD');
  if (!SHA256.test(String(body.sha256 || ''))) throw new AppError('sha256 không hợp lệ.', 400, 'INVALID_FIELD');
  return { partNumber, sizeBytes, durationMs, sha256: body.sha256, contentType: media.normalized, extension: media.extension };
};

const normalizeParts = (parts) => {
  if (!Array.isArray(parts) || parts.length !== 3) {
    throw new AppError('Bài Speaking phải có đúng ba Part.', 400, 'INVALID_PART_SET');
  }
  const normalized = parts.map((part) => ({
    partNumber: Number(part.part_number),
    promptId: requireUuid(part.prompt_id, 'prompt_id'),
    uploadToken: String(part.upload_token || ''),
  })).sort((a, b) => a.partNumber - b.partNumber);
  if (normalized.some((part, index) => part.partNumber !== index + 1 || !part.uploadToken)) {
    throw new AppError('Tập part_number phải đúng bằng 1, 2, 3.', 400, 'INVALID_PART_SET');
  }
  return normalized;
};

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const canonicalJson = (value) => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Canonical JSON only accepts finite numbers');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.keys(value).sort().map((key) => {
      if (value[key] === undefined) throw new TypeError('Canonical JSON does not accept undefined');
      return `${JSON.stringify(key)}:${canonicalJson(value[key])}`;
    });
    return `{${entries.join(',')}}`;
  }
  throw new TypeError('Unsupported canonical JSON value');
};
const promptSnapshot = (row) => ({
  prompt_id: row.id,
  part_number: Number(row.passage_number),
  title: row.title || '',
  instruction: row.instruction || '',
  content: row.content || '',
});

const buildFingerprint = ({ testId, prompts, uploads }) => sha256(canonicalJson({
  schema: 'speaking-submit-v1',
  submission_type: 'speaking',
  test_id: testId,
  parts: prompts.map((prompt, index) => ({
    part_number: prompt.part_number,
    prompt_id: prompt.prompt_id,
    audio_object_key: uploads[index].object_key,
  })),
}));

const lockAudioObjects = async (client, uploads) => {
  const keys = [...new Set(uploads.map((upload) => upload.object_key))].sort();
  for (const key of keys) {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`speaking-audio-object:${key}`]);
  }
};

module.exports = {
  CONTENT_TYPES,
  MAX_AUDIO_BYTES,
  buildFingerprint,
  canonicalJson,
  lockAudioObjects,
  normalizeParts,
  normalizeUploadInput,
  promptSnapshot,
  requireIdempotencyKey,
  requireUuid,
  sha256,
};
