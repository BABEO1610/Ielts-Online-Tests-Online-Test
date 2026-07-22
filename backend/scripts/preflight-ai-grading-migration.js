const path = require('node:path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: false });

const REQUIRED_RELATIONS = [
  'users',
  'mock_tests',
  'test_passages',
  'writing_submissions',
  'speaking_submissions',
  'ai_grading_reports',
  'ai_usage_logs',
  'tutor_feedback_reports',
];

const relationPresence = async (client) => {
  const { rows } = await client.query(`
    SELECT relation_name AS name,
           to_regclass(format('public.%I', relation_name)) IS NOT NULL AS present
    FROM unnest($1::text[]) AS required(relation_name)
  `, [REQUIRED_RELATIONS]);
  return Object.fromEntries(rows.map((row) => [row.name, row.present]));
};

const columnSet = async (client, table) => {
  const { rows } = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
  `, [table]);
  return new Set(rows.map((row) => row.column_name));
};

const scalar = async (client, sql) => {
  const { rows } = await client.query(sql);
  return Number(rows[0]?.count || 0);
};

const tutorDuplicateCount = async (client, columns, foreignKey) => {
  if (!columns.has(foreignKey)) return null;
  const active = columns.has('deleted_at') ? 'AND deleted_at IS NULL' : '';
  return scalar(client, `
    SELECT count(*)::integer AS count
    FROM (
      SELECT ${foreignKey}
      FROM tutor_feedback_reports
      WHERE ${foreignKey} IS NOT NULL ${active}
      GROUP BY ${foreignKey}
      HAVING count(*) > 1
    ) duplicates
  `);
};

const inspectDatabase = async (client) => {
  const relations = await relationPresence(client);
  const missingRelations = Object.entries(relations)
    .filter(([, present]) => !present)
    .map(([name]) => name);
  if (missingRelations.length) {
    return { relations, missingRelations, blockers: ['BASELINE_SCHEMA_INCOMPLETE'] };
  }

  const speakingColumns = await columnSet(client, 'speaking_submissions');
  const tutorColumns = await columnSet(client, 'tutor_feedback_reports');
  const version = await client.query('SHOW server_version');
  const { rows: stateRows } = await client.query(`
    SELECT
      to_regclass('public.schema_migrations') IS NOT NULL AS has_history,
      to_regclass('public.ai_grading_jobs') IS NOT NULL AS has_jobs,
      to_regclass('public.speaking_analysis_artifacts') IS NOT NULL AS has_artifacts,
      to_regprocedure('public.set_updated_at()') IS NOT NULL AS has_updated_at_function
  `);
  const rowCounts = await client.query(`
    SELECT
      (SELECT count(*)::integer FROM users) AS users,
      (SELECT count(*)::integer FROM speaking_submissions) AS speaking_submissions,
      (SELECT count(*)::integer FROM writing_submissions) AS writing_submissions,
      (SELECT count(*)::integer FROM ai_grading_reports) AS ai_grading_reports
  `);
  const duplicateSpeakingParts = await scalar(client, `
    SELECT count(*)::integer AS count
    FROM (
      SELECT speaking_group_id, part_number
      FROM speaking_submissions
      WHERE speaking_group_id IS NOT NULL AND part_number IS NOT NULL
      GROUP BY speaking_group_id, part_number
      HAVING count(*) > 1
    ) duplicates
  `);
  const duplicateTutorSpeaking = await tutorDuplicateCount(
    client, tutorColumns, 'speaking_submission_id'
  );
  const duplicateTutorWriting = await tutorDuplicateCount(
    client, tutorColumns, 'writing_submission_id'
  );
  const state = stateRows[0];
  const blockers = [];
  if (!state.has_updated_at_function) blockers.push('SET_UPDATED_AT_FUNCTION_MISSING');
  if (duplicateSpeakingParts > 0) blockers.push('DUPLICATE_SPEAKING_GROUP_PART');
  if (duplicateTutorSpeaking > 0) blockers.push('DUPLICATE_ACTIVE_TUTOR_SPEAKING_REPORT');
  if (duplicateTutorWriting > 0) blockers.push('DUPLICATE_ACTIVE_TUTOR_WRITING_REPORT');

  return {
    relations,
    missingRelations,
    state,
    baselineRequired: !state.has_history,
    serverVersion: version.rows[0].server_version,
    rowCounts: rowCounts.rows[0],
    duplicateSpeakingParts,
    duplicateTutorSpeaking,
    duplicateTutorWriting,
    speakingRowsWithoutGroup: await scalar(client, `
      SELECT count(*)::integer AS count
      FROM speaking_submissions
      WHERE speaking_group_id IS NULL
    `),
    hardeningColumnsAlreadyPresent: [
      'audio_storage_key',
      'declared_audio_sha256',
      'audio_sha256',
      'audio_size_bytes',
      'declared_duration_ms',
      'source_prompt_id',
      'prompt_snapshot_sha256',
      'assigned_tutor_at',
      'updated_at',
      'deleted_at',
    ].filter((column) => speakingColumns.has(column)),
    blockers,
  };
};

const main = async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 15000,
    max: 1,
  });
  const client = await pool.connect();
  try {
    await client.query('BEGIN READ ONLY');
    await client.query('SET LOCAL statement_timeout = 30000');
    const result = await inspectDatabase(client);
    await client.query('ROLLBACK');
    console.log(JSON.stringify(result, null, 2));
    if (result.blockers.length) process.exitCode = 2;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

if (require.main === module) {
  main().catch((error) => {
    console.error(JSON.stringify({
      code: error.code || 'PREFLIGHT_FAILED',
      message: String(error.message).slice(0, 500),
    }));
    process.exitCode = 1;
  });
}

module.exports = { inspectDatabase };
