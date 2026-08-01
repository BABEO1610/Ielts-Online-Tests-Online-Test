const { spawnSync } = require('node:child_process');
const path = require('node:path');

const EXPECTED_MIGRATIONS = Object.freeze([
  '025_harden_ai_grading_schema.sql',
  '026_create_speaking_analysis_artifacts.sql',
  '030_retry_speaking_artifacts_by_job.sql',
]);
const EXPECTED_INDEX_NAME = 'uq_speaking_artifact_job_config';
const EXPECTED_INDEX_COLUMNS = Object.freeze([
  'speaking_submission_id',
  'audio_sha256',
  'scoring_config_sha256',
  'source_job_id',
]);

const isEnabled = (value) => ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());

const defaultCanExecute = (command) => {
  const result = spawnSync(command, ['-version'], {
    shell: false,
    stdio: 'ignore',
    timeout: 5000,
    windowsHide: true,
  });
  return !result.error && result.status === 0;
};

const sanitizeErrorCode = (value) => {
  const code = String(value || '').trim().toUpperCase();
  return /^[A-Z][A-Z0-9_]{1,63}$/.test(code) ? code : 'INVALID_ERROR_CODE';
};

const checkSpeakingRuntime = async ({
  env = process.env,
  pool,
  canExecute = defaultCanExecute,
  write = (line) => process.stdout.write(`${line}\n`),
} = {}) => {
  if (!pool) throw new Error('Runtime checker requires a database pool');
  const failures = [];
  const featureEnabled = isEnabled(env.AI_SPEAKING_ASYNC_ENABLED);
  const storageProvider = String(env.OBJECT_STORAGE_PROVIDER || '').toLowerCase();
  const bucket = env.SPEAKING_AUDIO_BUCKET || env.SUPABASE_SPEAKING_BUCKET || '';
  const provider = env.AI_GRADING_PROVIDER || '';
  const gradingModel = env.AI_GRADING_MODEL || '';
  const transcriptionModel = env.AI_TRANSCRIPTION_MODEL || gradingModel;
  const evidenceProvider = env.AI_SPEECH_EVIDENCE_PROVIDER || '';
  const ffmpeg = env.FFMPEG_PATH || 'ffmpeg';
  const ffprobe = env.FFPROBE_PATH || 'ffprobe';
  const ffmpegOk = canExecute(ffmpeg);
  const ffprobeOk = canExecute(ffprobe);

  if (!featureEnabled) failures.push('FEATURE_DISABLED');
  if (storageProvider !== 'supabase') failures.push('STORAGE_PROVIDER_INVALID');
  if (!bucket) failures.push('STORAGE_BUCKET_MISSING');
  if (!provider || !gradingModel || !transcriptionModel || !evidenceProvider) {
    failures.push('MODEL_CONFIGURATION_INCOMPLETE');
  }
  if (!ffmpegOk) failures.push('FFMPEG_UNAVAILABLE');
  if (!ffprobeOk) failures.push('FFPROBE_UNAVAILABLE');

  write('Speaking AI runtime check');
  write(`feature_enabled: ${featureEnabled}`);
  write(`storage_provider: ${storageProvider || 'missing'}`);
  write(`storage_bucket: ${bucket || 'missing'}`);
  write(`grading_provider: ${provider || 'missing'}`);
  write(`grading_model: ${gradingModel || 'missing'}`);
  write(`transcription_model: ${transcriptionModel || 'missing'}`);
  write(`speech_evidence_provider: ${evidenceProvider || 'missing'}`);
  write(`ffmpeg_executable: ${ffmpegOk}`);
  write(`ffprobe_executable: ${ffprobeOk}`);

  try {
    const migrationResult = await pool.query(
      'SELECT version FROM schema_migrations WHERE version = ANY($1::text[]) ORDER BY version',
      [EXPECTED_MIGRATIONS]
    );
    const applied = migrationResult.rows.map((row) => row.version);
    if (EXPECTED_MIGRATIONS.some((version) => !applied.includes(version))) {
      failures.push('REQUIRED_MIGRATION_MISSING');
    }
    write(`migrations_applied: ${applied.join(', ') || 'none'}`);

    const indexResult = await pool.query(
      `SELECT indexname, indexdef FROM pg_indexes
       WHERE schemaname = 'public' AND tablename = 'speaking_analysis_artifacts'
         AND indexname = $1`,
      [EXPECTED_INDEX_NAME]
    );
    const indexDef = String(indexResult.rows[0]?.indexdef || '').toLowerCase();
    const indexOk = indexDef.includes('unique')
      && EXPECTED_INDEX_COLUMNS.every((column) => indexDef.includes(column));
    if (!indexOk) failures.push('ARTIFACT_UNIQUE_INDEX_INVALID');
    write(`artifact_unique_index: ${indexOk ? `${EXPECTED_INDEX_NAME} (${EXPECTED_INDEX_COLUMNS.join(', ')})` : 'missing_or_invalid'}`);

    const statusResult = await pool.query(
      `SELECT status, COUNT(*)::bigint AS count
       FROM ai_grading_jobs
       WHERE submission_type = 'speaking' AND deleted_at IS NULL
         AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY status ORDER BY status`
    );
    const counts = statusResult.rows.map((row) => `${row.status}=${Number(row.count)}`).join(', ');
    write(`recent_jobs_7d: ${counts || 'none'}`);

    const queuedResult = await pool.query(
      `SELECT COALESCE(EXTRACT(EPOCH FROM (NOW() - MIN(created_at)))::bigint, 0)
         AS oldest_queued_age_seconds
       FROM ai_grading_jobs
       WHERE submission_type = 'speaking' AND status = 'queued' AND deleted_at IS NULL`
    );
    write(`oldest_queued_age_seconds: ${Number(queuedResult.rows[0]?.oldest_queued_age_seconds || 0)}`);

    const errorResult = await pool.query(
      `SELECT last_error_code
       FROM ai_grading_jobs
       WHERE submission_type = 'speaking' AND last_error_code IS NOT NULL
         AND deleted_at IS NULL
       ORDER BY updated_at DESC LIMIT 20`
    );
    const errorCodes = [...new Set(errorResult.rows.map((row) => sanitizeErrorCode(row.last_error_code)))];
    write(`recent_error_codes: ${errorCodes.join(', ') || 'none'}`);
  } catch {
    failures.push('DATABASE_RUNTIME_CHECK_FAILED');
    write('database_checks: failed');
  }

  const uniqueFailures = [...new Set(failures)];
  write(`prerequisites: ${uniqueFailures.length ? `failed (${uniqueFailures.join(', ')})` : 'ok'}`);
  return { ok: uniqueFailures.length === 0, failures: uniqueFailures };
};

const main = async () => {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: false });
  const { pool } = require('../src/db/pool');
  try {
    const result = await checkSpeakingRuntime({ pool });
    if (!result.ok) process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  main().catch(() => {
    process.stderr.write('Speaking AI runtime check failed safely.\n');
    process.exitCode = 1;
  });
}

module.exports = {
  checkSpeakingRuntime,
  defaultCanExecute,
  sanitizeErrorCode,
  EXPECTED_MIGRATIONS,
  EXPECTED_INDEX_COLUMNS,
};
