const { ObjectStorageAdapter } = require('./objectStorage.adapter');

const streamToBuffer = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
};

class S3ObjectStorageAdapter extends ObjectStorageAdapter {
  constructor(config, dependencies = {}) {
    super();
    const sdk = dependencies.sdk || require('@aws-sdk/client-s3');
    this.commands = sdk;
    this.presign = dependencies.presign || require('@aws-sdk/s3-request-presigner').getSignedUrl;
    this.client = dependencies.client || new sdk.S3Client({
      region: config.region,
      endpoint: config.endpoint || undefined,
      forcePathStyle: Boolean(config.endpoint),
    });
    this.bucket = config.bucket;
  }

  async createSignedUpload({ key, contentType, contentLength, checksumSha256, expiresInSeconds }) {
    const checksum = Buffer.from(checksumSha256, 'hex').toString('base64');
    const command = new this.commands.PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
      ChecksumSHA256: checksum,
    });
    return {
      uploadUrl: await this.presign(this.client, command, { expiresIn: expiresInSeconds }),
      requiredHeaders: { 'content-type': contentType, 'x-amz-checksum-sha256': checksum },
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    };
  }

  async statObject({ key }) {
    try {
      const result = await this.client.send(new this.commands.HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { key, size: Number(result.ContentLength), contentType: result.ContentType || null, etag: result.ETag || null };
    } catch (error) {
      if (error.$metadata?.httpStatusCode === 404 || error.name === 'NotFound') return null;
      throw error;
    }
  }

  async createSignedDownload({ key, expiresInSeconds }) {
    const command = new this.commands.GetObjectCommand({ Bucket: this.bucket, Key: key });
    return {
      url: await this.presign(this.client, command, { expiresIn: expiresInSeconds }),
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    };
  }

  async downloadObject({ key }) {
    const result = await this.client.send(new this.commands.GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return streamToBuffer(result.Body);
  }

  async deleteObject({ key }) {
    await this.client.send(new this.commands.DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    return true;
  }

  async listObjects({ prefix, before = null, limit = 100, cursor = null }) {
    const result = await this.client.send(new this.commands.ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
      MaxKeys: Math.min(Math.max(Number(limit) || 100, 1), 1000),
      ContinuationToken: cursor || undefined,
    }));
    const cutoff = before ? new Date(before).getTime() : Number.POSITIVE_INFINITY;
    const objects = (result.Contents || [])
      .filter((item) => item.Key && item.LastModified && item.LastModified.getTime() < cutoff)
      .map((item) => ({
        key: item.Key,
        size: Number(item.Size || 0),
        lastModified: item.LastModified.toISOString(),
      }));
    return { objects, nextCursor: result.NextContinuationToken || null };
  }
}

module.exports = S3ObjectStorageAdapter;
