const {
  validateProbe,
  analyzePcm16Wav,
  assertAllowedAudioType,
  AudioNormalizerService,
  MediaError,
} = require('../../../src/media/audioNormalizer.service');

const wav = (samples) => {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + dataSize, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(16000, 24); buffer.writeUInt32LE(32000, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  samples.forEach((sample, index) => buffer.writeInt16LE(sample, 44 + index * 2));
  return buffer;
};

describe('audioNormalizer service', () => {
  test('accepts one bounded audio stream', () => {
    expect(validateProbe({
      format: { duration: '61.25' },
      streams: [{ codec_type: 'audio', codec_name: 'aac', sample_rate: '48000', channels: 2 }],
    })).toEqual({ durationSeconds: 61.25, codec: 'aac', sampleRate: 48000, channels: 2 });
  });

  test('rejects missing audio and excessive duration', () => {
    expect(() => validateProbe({ format: { duration: '1' }, streams: [] })).toThrow(MediaError);
    expect(() => validateProbe({
      format: { duration: String(16 * 60) }, streams: [{ codec_type: 'audio' }],
    })).toThrow('15 phút');
  });

  test('accepts only approved magic-byte types and rejects video streams', () => {
    expect(assertAllowedAudioType({ ext: 'wav', mime: 'audio/wav' })).toEqual({
      ext: 'wav', mime: 'audio/wav',
    });
    expect(() => assertAllowedAudioType({ ext: 'webm', mime: 'audio/webm' })).toThrow('Magic bytes');
    expect(() => validateProbe({
      format: { duration: '10' },
      streams: [{ codec_type: 'audio' }, { codec_type: 'video' }],
    })).toThrow(MediaError);
  });

  test('rejects disallowed magic bytes before invoking media tools', async () => {
    const runner = jest.fn();
    const service = new AudioNormalizerService({
      runner,
      fileTypeDetector: jest.fn().mockResolvedValue({ ext: 'webm', mime: 'audio/webm' }),
    });

    await expect(service.normalize(Buffer.alloc(64, 1))).rejects.toMatchObject({
      code: 'AUDIO_FORMAT_INVALID',
    });
    expect(runner).not.toHaveBeenCalled();
  });

  test('falls back to the PATH media command when a configured binary path is stale', async () => {
    const fs = require('node:fs/promises');
    let call = 0;
    const runner = jest.fn(async (command, args) => {
      call += 1;
      if (call === 1) {
        throw new MediaError('spawn C:/stale/ffprobe.exe ENOENT', 'MEDIA_TOOL_UNAVAILABLE');
      }
      if (call === 2) {
        expect(command).toBe('ffprobe');
        return {
          stdout: Buffer.from(JSON.stringify({
            format: { duration: '1' },
            streams: [{ codec_type: 'audio', codec_name: 'aac', sample_rate: '16000', channels: 1 }],
          })),
          stderr: Buffer.alloc(0),
        };
      }
      await fs.writeFile(args.at(-1), wav([1000, -1000, 1000, -1000]));
      return { stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
    });
    const service = new AudioNormalizerService({
      runner,
      ffprobe: 'C:/stale/ffprobe.exe',
      ffmpeg: 'ffmpeg',
      fileTypeDetector: jest.fn().mockResolvedValue({ ext: 'wav', mime: 'audio/wav' }),
    });

    await expect(service.normalize(Buffer.alloc(64, 1))).resolves.toMatchObject({
      contentType: 'audio/wav',
      durationMs: 1000,
    });
    expect(runner.mock.calls.map(([command]) => command)).toEqual([
      'C:/stale/ffprobe.exe',
      'ffprobe',
      'ffmpeg',
    ]);
  });

  test('source never invokes a shell', () => {
    const source = require('node:fs').readFileSync(require.resolve('../../../src/media/audioNormalizer.service'), 'utf8');
    expect(source).toMatch(/shell:\s*false/);
    expect(source).toMatch(/'-nostdin'/);
  });

  test('measures clipping/silence and rejects an effectively silent normalized signal', () => {
    expect(analyzePcm16Wav(wav([1000, 2000, -2000, 32767]))).toMatchObject({
      warnings: expect.arrayContaining(['audio_clipping_detected']),
    });
    expect(() => analyzePcm16Wav(wav(new Array(100).fill(0)))).toThrow('hầu như');
  });
});
