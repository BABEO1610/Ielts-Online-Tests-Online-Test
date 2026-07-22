class ObjectStorageAdapter {
  async createSignedUpload() { throw new Error('createSignedUpload is not implemented'); }
  async statObject() { throw new Error('statObject is not implemented'); }
  async createSignedDownload() { throw new Error('createSignedDownload is not implemented'); }
  async downloadObject() { throw new Error('downloadObject is not implemented'); }
  async deleteObject() { throw new Error('deleteObject is not implemented'); }
  async listObjects() { throw new Error('listObjects is not implemented'); }
}

class FakeObjectStorageAdapter extends ObjectStorageAdapter {
  constructor({ now = () => Date.now() } = {}) {
    super();
    this.now = now;
    this.objects = new Map();
  }

  putObject(key, body, metadata = {}) {
    this.objects.set(key, { body: Buffer.from(body), ...metadata, createdAt: new Date(this.now()) });
  }

  async createSignedUpload({ key, contentType, expiresInSeconds }) {
    return {
      uploadUrl: `https://storage.invalid/upload/${encodeURIComponent(key)}`,
      requiredHeaders: { 'content-type': contentType },
      expiresAt: new Date(this.now() + expiresInSeconds * 1000).toISOString(),
    };
  }

  async statObject({ key }) {
    const object = this.objects.get(key);
    if (!object) return null;
    return { key, size: object.body.length, contentType: object.contentType || null, etag: object.etag || null };
  }

  async createSignedDownload({ key, expiresInSeconds }) {
    if (!this.objects.has(key)) return null;
    return {
      url: `https://storage.invalid/download/${encodeURIComponent(key)}`,
      expiresAt: new Date(this.now() + expiresInSeconds * 1000).toISOString(),
    };
  }

  async downloadObject({ key }) {
    const object = this.objects.get(key);
    return object ? Buffer.from(object.body) : null;
  }

  async deleteObject({ key }) {
    return this.objects.delete(key);
  }

  async listObjects({ prefix = '', before = null, limit = 100, cursor = null } = {}) {
    const offset = Number(cursor || 0);
    const cutoff = before ? new Date(before).getTime() : Number.POSITIVE_INFINITY;
    const matching = [...this.objects.entries()]
      .filter(([key, object]) => key.startsWith(prefix) && object.createdAt.getTime() < cutoff)
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(offset, offset + limit)
      .map(([key, object]) => ({
        key,
        size: object.body.length,
        lastModified: object.createdAt.toISOString(),
      }));
    return {
      objects: matching,
      nextCursor: matching.length === limit ? String(offset + matching.length) : null,
    };
  }
}

const createObjectStorageAdapter = (config, dependencies = {}) => {
  if (dependencies.adapter) return dependencies.adapter;
  if (config.provider === 's3') {
    const S3ObjectStorageAdapter = require('./s3ObjectStorage.adapter');
    return new S3ObjectStorageAdapter(config, dependencies);
  }
  if (config.provider === 'supabase') {
    const SupabaseObjectStorageAdapter = require('./supabaseObjectStorage.adapter');
    return new SupabaseObjectStorageAdapter(config, dependencies);
  }
  if (config.provider === 'fake') return new FakeObjectStorageAdapter(dependencies);
  throw new Error(`Unsupported object storage provider: ${config.provider}`);
};

module.exports = { ObjectStorageAdapter, FakeObjectStorageAdapter, createObjectStorageAdapter };
