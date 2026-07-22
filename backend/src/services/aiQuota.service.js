const AppError = require('../utils/AppError');

const utcDate = (date = new Date()) => date.toISOString().slice(0, 10);

const lockQuotaWindow = async (client, userId, date) => {
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`ai-grading:${userId}:${date}`]);
};

const reserveOriginalWithQuota = async ({
  client,
  userId,
  idempotencyKey,
  fingerprint,
  lookupIdempotency,
  lookupFingerprint,
  countOriginalUsage,
  reserveOriginal,
  dailyLimit = 10,
  date = utcDate(),
}) => {
  await lockQuotaWindow(client, userId, date);
  const replay = await lookupIdempotency(client, userId, idempotencyKey);
  if (replay) {
    if (replay.input_fingerprint !== fingerprint) {
      throw new AppError('Khóa chống lặp đã được dùng cho dữ liệu khác.', 409, 'IDEMPOTENCY_KEY_REUSED');
    }
    if (new Date(replay.idempotency_expires_at) <= new Date()) {
      throw new AppError('Cửa sổ phát lại đã hết hạn.', 410, 'IDEMPOTENCY_WINDOW_EXPIRED');
    }
    return { kind: 'replay', value: replay };
  }
  const duplicate = await lookupFingerprint(client, userId, fingerprint);
  if (duplicate) return { kind: 'duplicate', value: duplicate };
  const usage = await countOriginalUsage(client, userId, date);
  if (usage >= dailyLimit) {
    throw new AppError('Bạn đã dùng hết lượt chấm AI trong ngày.', 429, 'DAILY_GRADING_QUOTA_EXCEEDED');
  }
  return { kind: 'reserved', value: await reserveOriginal(client) };
};

module.exports = { lockQuotaWindow, reserveOriginalWithQuota, utcDate };
