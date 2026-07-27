const queries = require('../../../src/db/queries/speakingAnalysis.queries');

const dbWith = (rows = []) => ({ query: jest.fn().mockResolvedValue({ rows }) });

describe('speaking analysis queries', () => {
  test('artifact finalization is fenced by the active job lease', async () => {
    const db = dbWith([{ id: 'artifact-1' }]);
    await queries.finalizeArtifact(db, {
      artifactId: 'artifact-1', jobId: 'job-1', workerId: 'worker-1', generation: 2,
      status: 'partial', componentStatus: { asr: 'complete' },
    });
    const [sql] = db.query.mock.calls[0];
    expect(sql).toMatch(/artifact\.status = 'processing'/i);
    expect(sql).toMatch(/job\.lease_generation = \$4/i);
    expect(sql).toMatch(/job\.lease_expires_at >= NOW\(\)/i);
    expect(sql).toMatch(/job\.scoring_config_sha256 = artifact\.scoring_config_sha256/i);
    expect(sql).toMatch(/submission\.speaking_group_id = job\.group_id/i);
    expect(sql).toMatch(/submission\.user_id = job\.user_id/i);
  });

  test('cache insert never mutates an existing immutable artifact', async () => {
    const db = dbWith([]);
    await queries.insertProcessingArtifact(db, {
      submissionId: 'submission-1', sourceJobId: 'job-1', audioSha256: 'a'.repeat(64),
      pipelineVersion: 'v1', scoringConfigSha256: 'b'.repeat(64),
    });
    const [sql] = db.query.mock.calls[0];
    expect(sql).toMatch(/ON CONFLICT .* DO NOTHING/is);
    expect(sql).toMatch(/speaking_submission_id, audio_sha256, scoring_config_sha256, source_job_id/i);
    expect(sql).not.toMatch(/DO UPDATE/i);
  });

  test('scopes reusable artifacts to the exact grading job', async () => {
    const db = dbWith([]);
    await queries.getReusableArtifact(db, {
      submissionId: 'submission-1', sourceJobId: 'job-retry-2',
      audioSha256: 'a'.repeat(64), scoringConfigSha256: 'b'.repeat(64),
    });
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/source_job_id = \$2/i);
    expect(params).toEqual(['submission-1', 'job-retry-2', 'a'.repeat(64), 'b'.repeat(64)]);
  });

  test('report insert projects an explicit column allowlist', async () => {
    const db = dbWith([]);
    await queries.insertSpeakingReport(db, {
      representativeSubmissionId: 'submission-1', groupId: 'group-1', jobId: 'job-1',
      overallBand: null, criteria: {}, feedback: {}, status: 'needs_review',
      promptVersion: 'v1', modelName: 'model', pipelineVersion: 'pipeline',
      evidenceMode: 'transcript_only', requiresHumanReview: true,
    });
    const [sql] = db.query.mock.calls[0];
    expect(sql).not.toMatch(/raw|reliability/i);
    expect(sql).toMatch(/requires_human_review/i);
    expect(sql).toMatch(/ON CONFLICT \(grading_job_id\)/i);
  });
});
