const {
  checkSpeakingRuntime,
  EXPECTED_MIGRATIONS,
  EXPECTED_INDEX_COLUMNS,
} = require('../../../scripts/check-speaking-runtime');

const env = {
  AI_SPEAKING_ASYNC_ENABLED: 'true',
  OBJECT_STORAGE_PROVIDER: 'supabase',
  SPEAKING_AUDIO_BUCKET: 'speaking-audio-private',
  AI_GRADING_PROVIDER: 'gemini',
  AI_GRADING_MODEL: 'gemini-test-model',
  AI_TRANSCRIPTION_MODEL: 'gemini-test-model',
  AI_SPEECH_EVIDENCE_PROVIDER: 'gemini',
  FFMPEG_PATH: '/usr/bin/ffmpeg',
  FFPROBE_PATH: '/usr/bin/ffprobe',
};

const indexDef = `CREATE UNIQUE INDEX uq_speaking_artifact_job_config
  ON public.speaking_analysis_artifacts USING btree
  (speaking_submission_id, audio_sha256, scoring_config_sha256, source_job_id)`;

const createPool = ({ migrations = EXPECTED_MIGRATIONS, index = indexDef } = {}) => ({
  query: jest.fn(async (sql) => {
    if (/FROM schema_migrations/i.test(sql)) {
      return { rows: migrations.map((version) => ({ version })) };
    }
    if (/FROM pg_indexes/i.test(sql)) {
      return { rows: index ? [{ indexname: 'uq_speaking_artifact_job_config', indexdef: index }] : [] };
    }
    if (/GROUP BY status/i.test(sql)) {
      return { rows: [{ status: 'queued', count: '2' }, { status: 'completed', count: '3' }] };
    }
    if (/oldest_queued_age_seconds/i.test(sql)) {
      return { rows: [{ oldest_queued_age_seconds: '45' }] };
    }
    if (/last_error_code/i.test(sql)) {
      return { rows: [{ last_error_code: 'PROVIDER_TIMEOUT' }, { last_error_code: 'bad value https://secret' }] };
    }
    throw new Error('Unexpected runtime checker query');
  }),
});

describe('safe Speaking runtime checker', () => {
  test('reports only allowlisted runtime facts when all prerequisites exist', async () => {
    const lines = [];
    const result = await checkSpeakingRuntime({
      env,
      pool: createPool(),
      canExecute: jest.fn(() => true),
      write: (line) => lines.push(line),
    });

    expect(result.ok).toBe(true);
    expect(lines.join('\n')).toContain('feature_enabled: true');
    expect(lines.join('\n')).toContain('speaking-audio-private');
    expect(lines.join('\n')).toContain(EXPECTED_INDEX_COLUMNS.join(', '));
    expect(lines.join('\n')).toContain('PROVIDER_TIMEOUT');
    expect(lines.join('\n')).not.toContain('https://secret');
    expect(lines.join('\n')).not.toMatch(/DATABASE_URL|API_KEY|JWT|service-role|signed_url|student transcript/i);
  });

  test.each([
    ['missing ffmpeg', { canExecute: (command) => !String(command).includes('ffmpeg') }],
    ['missing migration', { migrations: EXPECTED_MIGRATIONS.slice(0, 2) }],
    ['wrong artifact index', { index: 'CREATE UNIQUE INDEX wrong ON speaking_analysis_artifacts (source_job_id)' }],
  ])('fails closed for %s', async (_label, overrides) => {
    const result = await checkSpeakingRuntime({
      env,
      pool: createPool(overrides),
      canExecute: overrides.canExecute || (() => true),
      write: () => {},
    });
    expect(result.ok).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
  });
});
