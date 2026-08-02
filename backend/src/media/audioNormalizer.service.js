const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const MAX_INPUT_BYTES = 50 * 1024 * 1024;
const MAX_DURATION_SECONDS = 15 * 60;
const MAX_PROCESS_OUTPUT_BYTES = 1024 * 1024;
const ALLOWED_AUDIO_EXTENSIONS = new Set(['m4a', 'mp3', 'mp4', 'wav', 'webm', 'ogg']);
const ALLOWED_AUDIO_CODECS = new Set([
  'aac', 'alac', 'mp3', 'pcm_s16le', 'pcm_s24le', 'pcm_s32le', 'pcm_f32le',
  'opus', 'vorbis', 'flac'
]);
const MIME_FAMILIES = new Map([
  ['audio/mpeg', 'mp3'], ['audio/mp3', 'mp3'],
  ['audio/mp4', 'mp4'], ['audio/x-m4a', 'mp4'],
  ['audio/wav', 'wav'], ['audio/x-wav', 'wav'],
  ['audio/webm', 'webm'], ['video/webm', 'webm'],
  ['audio/ogg', 'ogg']
]);

class MediaError extends Error {
  constructor(message, code, { retryable = false } = {}) {
    super(message);
    this.name = 'MediaError';
    this.code = code;
    this.retryable = retryable;
  }
}

const fileTypeFromBuffer = async (buffer) => {
  const detector = await import('file-type');
  return detector.fileTypeFromBuffer(buffer);
};

const assertAllowedAudioType = (detected) => {
  if (!detected || !ALLOWED_AUDIO_EXTENSIONS.has(String(detected.ext).toLowerCase())) {
    throw new MediaError('Magic bytes không thuộc MP3, M4A hoặc WAV được phép.', 'AUDIO_FORMAT_INVALID');
  }
  return { ext: detected.ext.toLowerCase(), mime: String(detected.mime || '').toLowerCase() };
};

const assertExpectedContentType = (detected, expectedContentType) => {
  if (!expectedContentType) return;
  const expectedFamily = MIME_FAMILIES.get(String(expectedContentType).split(';')[0].trim().toLowerCase());
  const detectedFamily = detected.ext === 'mp3' ? 'mp3'
    : detected.ext === 'wav' ? 'wav'
      : ['m4a', 'mp4'].includes(detected.ext) ? 'mp4'
      : detected.ext === 'webm' ? 'webm'
      : detected.ext === 'ogg' ? 'ogg' : null;
  if (!expectedFamily || expectedFamily !== detectedFamily) {
    throw new MediaError('Storage MIME không khớp magic bytes của audio.', 'AUDIO_MIME_MISMATCH');
  }
};

const runProcess = (command, args, { timeoutMs = 30000, spawnImpl = spawn } = {}) => new Promise((resolve, reject) => {
  const child = spawnImpl(command, args, { windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
  const stdout = [];
  const stderr = [];
  let bytes = 0;
  let settled = false;
  const finish = (callback) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    callback();
  };
  const collect = (target) => (chunk) => {
    bytes += chunk.length;
    if (bytes > MAX_PROCESS_OUTPUT_BYTES) {
      child.kill('SIGKILL');
      finish(() => reject(new MediaError('Media tool output exceeded limit', 'MEDIA_TOOL_OUTPUT_LIMIT')));
      return;
    }
    target.push(Buffer.from(chunk));
  };
  child.stdout.on('data', collect(stdout));
  child.stderr.on('data', collect(stderr));
  child.once('error', (error) => finish(() => reject(new MediaError(error.message, 'MEDIA_TOOL_UNAVAILABLE'))));
  child.once('close', (code) => finish(() => {
    if (code !== 0) return reject(new MediaError(Buffer.concat(stderr).toString('utf8').slice(0, 500), 'AUDIO_DECODE_FAILED'));
    resolve({ stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) });
  }));
  const timer = setTimeout(() => {
    child.kill('SIGKILL');
    finish(() => reject(new MediaError('Media process timed out', 'MEDIA_PROCESS_TIMEOUT', { retryable: true })));
  }, timeoutMs);
});

const validateProbe = (probe) => {
  const durationSeconds = Number(probe?.format?.duration);
  const streams = Array.isArray(probe?.streams) ? probe.streams : [];
  const audio = streams.find((stream) => stream.codec_type === 'audio');
  const containsVideo = streams.some((stream) => stream.codec_type === 'video');
  if (!audio || containsVideo || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new MediaError('Tệp không có luồng audio hợp lệ.', 'AUDIO_FORMAT_INVALID');
  }
  if (durationSeconds > MAX_DURATION_SECONDS) {
    throw new MediaError('Thời lượng audio vượt quá 15 phút.', 'AUDIO_DURATION_EXCEEDED');
  }
  if (!ALLOWED_AUDIO_CODECS.has(String(audio.codec_name || '').toLowerCase())) {
    throw new MediaError('Audio codec không thuộc danh sách được phê duyệt.', 'AUDIO_CODEC_INVALID');
  }
  return { durationSeconds, codec: audio.codec_name || null, sampleRate: Number(audio.sample_rate) || null, channels: audio.channels || null };
};

const findWavData = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF') {
    throw new MediaError('WAV chuẩn hóa không hợp lệ.', 'AUDIO_NORMALIZED_INVALID');
  }
  let offset = 12;
  let dataOffset = -1;
  let dataSize = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === 'data') {
      dataOffset = offset + 8;
      dataSize = Math.min(size, buffer.length - dataOffset);
      break;
    }
    offset += 8 + size + (size % 2);
  }
  if (dataOffset < 0 || dataSize < 2) throw new MediaError('WAV không có PCM data.', 'AUDIO_NORMALIZED_INVALID');
  return { dataOffset, dataSize };
};

const samplePcm16 = (buffer, dataOffset, dataSize) => {
  const totalSamples = Math.floor(dataSize / 2);
  const stride = Math.max(1, Math.ceil(totalSamples / 1000000));
  let sumSquares = 0;
  let clipped = 0;
  let silent = 0;
  let sampled = 0;
  for (let index = 0; index < totalSamples; index += stride) {
    const value = buffer.readInt16LE(dataOffset + index * 2);
    const magnitude = Math.abs(value);
    sumSquares += value * value;
    if (magnitude >= 32760) clipped += 1;
    if (magnitude <= 164) silent += 1;
    sampled += 1;
  }
  return { sumSquares, clipped, silent, sampled };
};

const analyzePcm16Wav = (buffer) => {
  const { dataOffset, dataSize } = findWavData(buffer);
  const { sumSquares, clipped, silent, sampled } = samplePcm16(buffer, dataOffset, dataSize);
  const rms = Math.sqrt(sumSquares / sampled);
  const rmsDbfs = rms > 0 ? 20 * Math.log10(rms / 32768) : -120;
  const clippingRatio = clipped / sampled;
  const silenceRatio = silent / sampled;
  const warnings = [];
  if (clippingRatio > 0.01) warnings.push('audio_clipping_detected');
  if (silenceRatio > 0.9 || rmsDbfs < -45) warnings.push('audio_mostly_silent');
  if (silenceRatio > 0.995 || rmsDbfs < -55) {
    throw new MediaError('Audio hầu như không có tín hiệu giọng nói.', 'AUDIO_SILENT');
  }
  return {
    rms_dbfs: Math.round(rmsDbfs * 100) / 100,
    clipping_ratio: Math.round(clippingRatio * 1000000) / 1000000,
    silence_ratio: Math.round(silenceRatio * 1000000) / 1000000,
    warnings,
  };
};

const parseProbeResult = (stdout) => {
  try {
    return validateProbe(JSON.parse(stdout.toString('utf8')));
  } catch (error) {
    if (error instanceof MediaError) throw error;
    throw new MediaError('ffprobe trả dữ liệu không hợp lệ.', 'AUDIO_PROBE_INVALID');
  }
};

const sameCommand = (left, right) => String(left || '').trim().toLowerCase()
  === String(right || '').trim().toLowerCase();

/**
 * A configured binary path can become stale after a package-manager upgrade
 * (notably WinGet).  Keep the configured binary as the first choice, but use
 * the approved PATH command once when spawning that path fails.  This lets a
 * running deployment recover when ffmpeg/ffprobe is still available on PATH
 * without ever enabling a shell.
 */
const runWithPathFallback = async ({ runner, command, fallbackCommand, args, options }) => {
  try {
    return await runner(command, args, options);
  } catch (error) {
    if (error?.code !== 'MEDIA_TOOL_UNAVAILABLE' || sameCommand(command, fallbackCommand)) {
      throw error;
    }
    return runner(fallbackCommand, args, options);
  }
};

const buildNormalizedResult = (normalized, metadata, detectedType) => {
  if (!normalized.length || normalized.length > 64 * 1024 * 1024) {
    throw new MediaError('Audio chuẩn hóa không hợp lệ.', 'AUDIO_NORMALIZED_INVALID');
  }
  return {
    buffer: normalized,
    contentType: 'audio/wav',
    durationMs: Math.round(metadata.durationSeconds * 1000),
    quality: {
      duration_ms: Math.round(metadata.durationSeconds * 1000),
      source_codec: metadata.codec,
      ...analyzePcm16Wav(normalized),
    },
    providerManifest: {
      normalizer: 'ffmpeg-pcm16-mono-16khz-v1',
      source_extension: detectedType.ext,
      source_mime: detectedType.mime,
    },
  };
};

class AudioNormalizerService {
  constructor({
    runner = runProcess,
    tempRoot = os.tmpdir(),
    ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg',
    ffprobe = process.env.FFPROBE_PATH || 'ffprobe',
    fileTypeDetector = fileTypeFromBuffer,
  } = {}) {
    this.runner = runner;
    this.tempRoot = tempRoot;
    this.ffmpeg = ffmpeg;
    this.ffprobe = ffprobe;
    this.fileTypeDetector = fileTypeDetector;
  }

  async normalize(audioBuffer, { expectedContentType } = {}) {
    const input = Buffer.from(audioBuffer || []);
    if (!input.length || input.length > MAX_INPUT_BYTES) {
      throw new MediaError('Kích thước audio không hợp lệ.', 'AUDIO_SIZE_INVALID');
    }
    const detectedType = assertAllowedAudioType(await this.fileTypeDetector(input));
    assertExpectedContentType(detectedType, expectedContentType);
    const workspace = await fs.mkdtemp(path.join(this.tempRoot, 'ielts-audio-'));
    const inputPath = path.join(workspace, 'input.audio');
    const outputPath = path.join(workspace, 'normalized.wav');
    try {
      await fs.writeFile(inputPath, input, { flag: 'wx' });
      const probeResult = await runWithPathFallback({
        runner: this.runner,
        command: this.ffprobe,
        fallbackCommand: 'ffprobe',
        args: ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', inputPath],
        options: { timeoutMs: 15000 },
      });
      const metadata = parseProbeResult(probeResult.stdout);
      await runWithPathFallback({
        runner: this.runner,
        command: this.ffmpeg,
        fallbackCommand: 'ffmpeg',
        args: [
          '-nostdin', '-hide_banner', '-loglevel', 'error', '-i', inputPath,
          '-map_metadata', '-1', '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', '-y', outputPath,
        ],
        options: { timeoutMs: 45000 },
      });
      return buildNormalizedResult(await fs.readFile(outputPath), metadata, detectedType);
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  }
}

module.exports = {
  AudioNormalizerService,
  MediaError,
  runProcess,
  validateProbe,
  assertAllowedAudioType,
  analyzePcm16Wav,
  runWithPathFallback,
  MAX_DURATION_SECONDS,
};
