const { ObjectStorageAdapter } = require('./objectStorage.adapter');

class SupabaseObjectStorageAdapter extends ObjectStorageAdapter {
  constructor(config, { client } = {}) {
    super();
    this.bucket = config.bucket;
    this.client = client || require('../config/supabase');
  }

  bucketApi() {
    return this.client.storage.from(this.bucket);
  }

  async createSignedUpload({ key, contentType }) {
    const { data, error } = await this.bucketApi().createSignedUploadUrl(key, { upsert: false });
    if (error) throw error;
    return {
      uploadUrl: data.signedUrl,
      requiredHeaders: { 'content-type': contentType },
      // Supabase controls this TTL; expose it separately from the application token.
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    };
  }

  async statObject({ key }) {
    const splitAt = key.lastIndexOf('/');
    const prefix = splitAt < 0 ? '' : key.slice(0, splitAt);
    const name = splitAt < 0 ? key : key.slice(splitAt + 1);
    const { data, error } = await this.bucketApi().list(prefix, { search: name, limit: 2 });
    if (error) throw error;
    const object = data?.find((entry) => entry.name === name);
    if (!object) return null;
    return {
      key,
      size: Number(object.metadata?.size || 0),
      contentType: object.metadata?.mimetype || null,
      etag: object.metadata?.eTag || object.metadata?.etag || null,
    };
  }

  async createSignedDownload({ key, expiresInSeconds }) {
    const { data, error } = await this.bucketApi().createSignedUrl(key, expiresInSeconds, { download: false });
    if (error) throw error;
    return {
      url: data.signedUrl,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    };
  }

  async downloadObject({ key }) {
    const { data, error } = await this.bucketApi().download(key);
    if (error) throw error;
    return Buffer.from(await data.arrayBuffer());
  }

  async deleteObject({ key }) {
    const { error } = await this.bucketApi().remove([key]);
    if (error) throw error;
    return true;
  }


  async listObjects() {
    // Production async Speaking is restricted to S3. Refuse blind cleanup on
    // Supabase because its folder listing is not an atomic recursive inventory.
    const error = new Error('Recursive quarantine listing is unavailable for the Supabase development adapter');
    error.code = 'STORAGE_LIST_UNSUPPORTED';
    throw error;
  }
}

module.exports = SupabaseObjectStorageAdapter;
