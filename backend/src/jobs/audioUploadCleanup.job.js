const crypto = require('node:crypto');
const logger = require('../utils/logger');
const { aiGradingConfig } = require('../config/aiGrading.config');
const { createObjectStorageAdapter } = require('../storage/objectStorage.adapter');

const QUARANTINE_PREFIX = 'quarantine/speaking/';
const SAFE_KEY = /^quarantine\/speaking\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:mp3|m4a|wav)$/i;
const safeObjectId = (key) => crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);

class AudioUploadCleanupJob {
  constructor({ pool, storage, config = aiGradingConfig, now = () => Date.now() } = {}) {
    this.pool = pool || require('../db/pool').pool;
    this.storage = storage || createObjectStorageAdapter(config.storage);
    this.config = config;
    this.now = now;
  }

  async findOldObjects() {
    const cutoff = new Date(this.now() - this.config.storage.quarantineMinAgeSeconds * 1000).toISOString();
    const limit = this.config.storage.cleanupBatchSize;
    const objects = [];
    let cursor = null;
    let pages = 0;
    do {
      const page = await this.storage.listObjects({
        prefix: QUARANTINE_PREFIX,
        before: cutoff,
        limit,
        cursor,
      });
      objects.push(...(page.objects || []).filter((object) => (
        SAFE_KEY.test(object.key)
        && new Date(object.lastModified).getTime() < new Date(cutoff).getTime()
      )));
      cursor = page.nextCursor || null;
      pages += 1;
    } while (cursor && objects.length < limit && pages < 20);
    return objects.slice(0, limit);
  }

  async deleteIfStillUnbound(object) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`speaking-audio-object:${object.key}`]
      );
      const bound = await client.query(
        `SELECT 1 FROM speaking_submissions
         WHERE audio_storage_key = $1
         LIMIT 1`,
        [object.key]
      );
      if (bound.rows.length > 0) {
        await client.query('COMMIT');
        return false;
      }
      await this.storage.deleteObject({ key: object.key });
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      logger.warn('Quarantine cleanup object failed', {
        objectId: safeObjectId(object.key),
        errorCode: error.code || 'AUDIO_CLEANUP_FAILED',
      });
      return false;
    } finally {
      client.release();
    }
  }

  async runBatch() {
    const oldObjects = await this.findOldObjects();
    if (oldObjects.length === 0) return { scanned: 0, eligible: 0, deleted: 0 };
    const keys = oldObjects.map((object) => object.key);
    const boundResult = await this.pool.query(
      `SELECT audio_storage_key
       FROM speaking_submissions
       WHERE audio_storage_key = ANY($1::text[])`,
      [keys]
    );
    const bound = new Set(boundResult.rows.map((row) => row.audio_storage_key));
    const eligible = oldObjects.filter((object) => !bound.has(object.key));
    let deleted = 0;
    for (const object of eligible) {
      if (await this.deleteIfStillUnbound(object)) deleted += 1;
    }
    logger.info('Quarantine cleanup batch complete', {
      scanned: oldObjects.length,
      eligible: eligible.length,
      deleted,
    });
    return { scanned: oldObjects.length, eligible: eligible.length, deleted };
  }
}

module.exports = { AudioUploadCleanupJob, QUARANTINE_PREFIX, SAFE_KEY, safeObjectId };
