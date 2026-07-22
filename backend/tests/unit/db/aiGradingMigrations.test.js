const fs = require('node:fs');
const path = require('node:path');

const migrationDir = path.resolve(__dirname, '../../../src/db/migrations');
const read = (name) => fs.readFileSync(path.join(migrationDir, name), 'utf8');
const tableBody = (sql, table) => sql
  .match(new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+${table}\\s*\\(([\\s\\S]*?)\\);`, 'i'))[1]
  .replace(/\s+/g, ' ')
  .trim();

describe('AI grading migration contracts', () => {
  const prerequisite = read('008a_bootstrap_missing_prerequisites.sql');
  const canonicalLibrary = read('012_create_library_resources.sql');
  const queue = read('025_harden_ai_grading_schema.sql');
  const artifacts = read('026_create_speaking_analysis_artifacts.sql');
  const featureSql = `${queue}\n${artifacts}`;

  test('creates only the two approved feature tables', () => {
    const tables = [...featureSql.matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([a-z_]+)/gi)]
      .map((match) => match[1]);
    expect(tables).toEqual(['ai_grading_jobs', 'speaking_analysis_artifacts']);
  });

  test('008a only bootstraps the canonical legacy library table required by migration 011', () => {
    expect(tableBody(prerequisite, 'library_resources'))
      .toBe(tableBody(canonicalLibrary, 'library_resources'));
    expect(prerequisite).not.toMatch(/ai_grading_jobs|speaking_analysis_artifacts/i);
  });

  test.each([prerequisite, queue, artifacts])('does not delete production data', (sql) => {
    const executable = sql.replace(/^\s*--.*$/gm, '');
    expect(executable).not.toMatch(/\b(?:DROP\s+TABLE|DELETE\s+FROM|TRUNCATE)\b/i);
  });

  test('contains queue concurrency and idempotency invariants', () => {
    expect(queue).toMatch(/lease_generation\s+INTEGER\s+NOT NULL/i);
    expect(queue).toMatch(/uq_ai_job_idempotency/i);
    expect(queue).toMatch(/uq_ai_job_root_fingerprint/i);
    expect(queue).toMatch(/uq_ai_job_retry_child/i);
    expect(queue).toMatch(/chk_ai_job_terminal/i);
  });

  test('enforces fail-closed report shapes for new job-backed Speaking writes', () => {
    expect(queue).toMatch(/chk_ai_report_job_projection/i);
    expect(queue).toMatch(/chk_ai_report_transcript_unscored/i);
    expect(queue).toMatch(/chk_ai_report_partial_shape/i);
    expect(queue).toMatch(/chk_ai_report_full_shape/i);
    expect(queue).toMatch(/chk_ai_report_speaking_band_steps/i);
    expect(queue.match(/NOT VALID/gi).length).toBeGreaterThanOrEqual(10);
  });

  test('keeps legacy transcripts display-only', () => {
    expect(artifacts).toMatch(/No synthetic job\/artifact is created/i);
    expect(artifacts).not.toMatch(/INSERT\s+INTO/i);
    expect(artifacts).toMatch(/uq_speaking_artifact_config/i);
  });
});
