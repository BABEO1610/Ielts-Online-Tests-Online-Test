const one = async (db, sql, params) => (await db.query(sql, params)).rows[0] || null;
const json = (value) => value === undefined || value === null ? null : JSON.stringify(value);

const getReusableArtifact = (db, { submissionId, sourceJobId, audioSha256, scoringConfigSha256 }) => one(db,
  `SELECT * FROM speaking_analysis_artifacts
   WHERE speaking_submission_id = $1 AND source_job_id = $2 AND audio_sha256 = $3 AND scoring_config_sha256 = $4
     AND status IN ('complete','partial') AND deleted_at IS NULL
   LIMIT 1`,
  [submissionId, sourceJobId, audioSha256, scoringConfigSha256]);

const getArtifactByConfig = (db, { submissionId, sourceJobId, audioSha256, scoringConfigSha256 }) => one(db,
  `SELECT * FROM speaking_analysis_artifacts
   WHERE speaking_submission_id = $1 AND source_job_id = $2 AND audio_sha256 = $3 AND scoring_config_sha256 = $4
     AND deleted_at IS NULL LIMIT 1`,
  [submissionId, sourceJobId, audioSha256, scoringConfigSha256]);

const insertProcessingArtifact = (db, input) => one(db,
  `INSERT INTO speaking_analysis_artifacts (
     speaking_submission_id, source_job_id, audio_sha256, pipeline_version,
     scoring_config_sha256, provider_manifest_json, component_status_json
   ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)
   ON CONFLICT (speaking_submission_id, audio_sha256, scoring_config_sha256, source_job_id) DO NOTHING
   RETURNING *`,
  [input.submissionId, input.sourceJobId, input.audioSha256, input.pipelineVersion,
    input.scoringConfigSha256, json(input.providerManifest || {}), json(input.componentStatus || {})]);

const finalizeArtifact = (db, input) => one(db,
  `UPDATE speaking_analysis_artifacts AS artifact
   SET status = $5, language_code = $6, asr_transcript = $7, display_transcript = $8,
       asr_uncertainty_json = $9::jsonb, provider_manifest_json = $10::jsonb,
       component_status_json = $11::jsonb, words_json = $12::jsonb,
       segments_json = $13::jsonb, audio_quality_json = $14::jsonb,
       fluency_metrics_json = $15::jsonb, pronunciation_evidence_json = $16::jsonb,
       finalized_at = NOW()
   WHERE artifact.id = $1 AND artifact.status = 'processing'
     AND EXISTS (
       SELECT 1 FROM ai_grading_jobs job
       WHERE job.id = $2 AND job.status = 'running' AND job.lease_owner = $3
         AND job.lease_generation = $4 AND job.lease_expires_at >= NOW()
         AND job.scoring_config_sha256 = artifact.scoring_config_sha256
         AND EXISTS (
           SELECT 1 FROM speaking_submissions submission
           WHERE submission.id = artifact.speaking_submission_id
             AND submission.speaking_group_id = job.group_id
             AND submission.user_id = job.user_id
             AND submission.deleted_at IS NULL
         )
     )
   RETURNING artifact.*`,
  [input.artifactId, input.jobId, input.workerId, input.generation,
    input.status, input.languageCode || 'en', input.asrTranscript || null,
    input.displayTranscript || null, json(input.asrUncertainty),
    json(input.providerManifest || {}), json(input.componentStatus || {}),
    json(input.words), json(input.segments), json(input.audioQuality),
    json(input.fluencyMetrics), json(input.pronunciationEvidence)]);

const getArtifactsForJob = async (db, jobId) => (await db.query(
  `SELECT artifact.*, submission.part_number, submission.prompt_text,
          submission.prompt_snapshot_sha256
   FROM speaking_analysis_artifacts artifact
   JOIN speaking_submissions submission ON submission.id = artifact.speaking_submission_id
   WHERE artifact.source_job_id = $1 AND artifact.deleted_at IS NULL AND submission.deleted_at IS NULL
   ORDER BY submission.part_number`, [jobId])).rows;

const insertSpeakingReport = (db, input) => one(db,
  `INSERT INTO ai_grading_reports (
     submission_id, submission_type, speaking_group_id, grading_job_id,
     band_score, computed_band, task_achievement_score, coherence_score,
     lexical_score, grammar_score, fluency_score, pronunciation_score,
     criteria_json, feedback_json, status, prompt_version, model_name,
     pipeline_version, calibration_version, evidence_mode, requires_human_review,
     error_message
   ) VALUES (
     $1,'speaking',$2,$3,$4,$4,NULL,NULL,$6,$7,$5,$8,$9::jsonb,$10::jsonb,
     $11,$12,$13,$14,$15,$16,$17,$18
   )
   ON CONFLICT (grading_job_id) WHERE grading_job_id IS NOT NULL DO NOTHING
   RETURNING *`,
  [input.representativeSubmissionId, input.groupId, input.jobId,
    input.overallBand, input.fluencyAndCoherence, input.lexicalResource,
    input.grammaticalRangeAndAccuracy, input.pronunciation, json(input.criteria),
    json(input.feedback), input.status, input.promptVersion, input.modelName,
    input.pipelineVersion, input.calibrationVersion || null, input.evidenceMode,
    Boolean(input.requiresHumanReview), input.errorMessage || null]);

module.exports = {
  getReusableArtifact,
  getArtifactByConfig,
  insertProcessingArtifact,
  finalizeArtifact,
  getArtifactsForJob,
  insertSpeakingReport,
};
