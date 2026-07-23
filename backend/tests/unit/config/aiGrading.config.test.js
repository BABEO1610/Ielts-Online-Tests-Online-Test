const { loadAiGradingConfig } = require('../../../src/config/aiGrading.config');

const key = Buffer.alloc(32, 7).toString('base64');
const enabledEnv = {
  NODE_ENV: 'test',
  AI_SPEAKING_ASYNC_ENABLED: 'true',
  AUDIO_UPLOAD_TOKEN_ACTIVE_KID: 'k1',
  AUDIO_UPLOAD_TOKEN_KEYS_JSON: JSON.stringify({ k1: key }),
};

describe('aiGrading.config', () => {
  test('is fail-closed by default', () => {
    const config = loadAiGradingConfig({ NODE_ENV: 'test' });
    expect(config.enabled).toBe(false);
    expect(config.publishSpeakingBands).toBe(false);
    expect(config.scoringConfigSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(config.writingScoringConfigSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  test('requires the active AEAD key when enabled', () => {
    expect(() => loadAiGradingConfig({ AI_SPEAKING_ASYNC_ENABLED: 'true' }))
      .toThrow('active audio upload token key');
  });

  test('rejects a rubric provider that the active adapter cannot execute', () => {
    expect(() => loadAiGradingConfig({ ...enabledEnv, AI_GRADING_PROVIDER: 'claude' }))
      .toThrow('only supports the pinned Gemini provider');
  });

  test('does not publish without a calibration digest', () => {
    const config = loadAiGradingConfig({ ...enabledEnv, AI_SPEAKING_PUBLISH_BANDS: 'true' });
    expect(config.publishSpeakingBands).toBe(false);
  });

  test('can explicitly enable clearly-labelled estimated Speaking bands without a calibration bundle', () => {
    const config = loadAiGradingConfig({
      ...enabledEnv,
      AI_SPEAKING_ESTIMATED_BANDS_ENABLED: 'true',
      AI_SPEAKING_ESTIMATION_VERSION: 'gemini-audio-estimate-v1',
      AI_SPEECH_EVIDENCE_PROVIDER: 'gemini',
    });
    expect(config.estimatedSpeakingBands).toBe(true);
    expect(config.speakingEstimateVersion).toBe('gemini-audio-estimate-v1');
    expect(config.provider.manifest.speech_evidence_provider).toBe('gemini');
  });

  test('pins the actual transcription provider and model into the scoring manifest', () => {
    const gemini = loadAiGradingConfig({ ...enabledEnv, AI_GRADING_MODEL: 'gemini-2.5-flash' });
    const whisper = loadAiGradingConfig({
      ...enabledEnv,
      AI_GRADING_MODEL: 'gemini-2.5-flash',
      OPENAI_API_KEY: 'test-only-key',
    });

    expect(gemini.provider.manifest).toMatchObject({
      transcription_provider: 'gemini',
      transcription_model: 'gemini-2.5-flash',
    });
    expect(whisper.provider.manifest).toMatchObject({
      transcription_provider: 'openai',
      transcription_model: 'whisper-1',
    });
    expect(whisper.scoringConfigSha256).not.toBe(gemini.scoringConfigSha256);
  });

  test('enforces pinned S3 configuration in production', () => {
    expect(() => loadAiGradingConfig({
      ...enabledEnv,
      NODE_ENV: 'production',
      OBJECT_STORAGE_PROVIDER: 'supabase',
    })).toThrow('must use S3');
  });
});
