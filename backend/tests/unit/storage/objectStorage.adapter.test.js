const {
  FakeObjectStorageAdapter,
  createObjectStorageAdapter,
} = require('../../../src/storage/objectStorage.adapter');

describe('objectStorage.adapter', () => {
  test('fake adapter signs, stats, downloads and deletes private objects', async () => {
    const storage = new FakeObjectStorageAdapter({ now: () => 1000 });
    const signed = await storage.createSignedUpload({ key: 'q/a', contentType: 'audio/mp4', expiresInSeconds: 60 });
    expect(signed.requiredHeaders).toEqual({ 'content-type': 'audio/mp4' });
    storage.putObject('q/a', 'audio', { contentType: 'audio/mp4' });
    await expect(storage.statObject({ key: 'q/a' })).resolves.toMatchObject({ size: 5 });
    await expect(storage.downloadObject({ key: 'q/a' })).resolves.toEqual(Buffer.from('audio'));
    await expect(storage.createSignedDownload({ key: 'q/a', expiresInSeconds: 60 })).resolves.toMatchObject({
      url: expect.stringContaining('/download/'),
    });
    await expect(storage.listObjects({ prefix: 'q/', before: new Date(2000).toISOString() }))
      .resolves.toMatchObject({ objects: [expect.objectContaining({ key: 'q/a' })] });
    await expect(storage.deleteObject({ key: 'q/a' })).resolves.toBe(true);
  });

  test('factory accepts an injected adapter without loading a provider SDK', () => {
    const adapter = {};
    expect(createObjectStorageAdapter({ provider: 's3' }, { adapter })).toBe(adapter);
  });
});
