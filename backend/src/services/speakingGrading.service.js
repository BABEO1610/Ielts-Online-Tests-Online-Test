const AppError = require('../utils/AppError');
const { validateSpeakingResult } = require('../ai/speakingResult.validator');
const jobQueries = require('../db/queries/aiGradingJobs.queries');
const analysisQueries = require('../db/queries/speakingAnalysis.queries');

const join = (items) => (Array.isArray(items) ? items.filter(Boolean).join(' ') : '');
const unscored = (status = 'unavailable') => ({ band: null, evidence_status: status, feedback: null });

const buildTranscriptReviewResult = ({ artifacts, feedback, pipelineVersion, generatedAt = new Date().toISOString() }) => {
  const byPart = new Map((feedback?.part_feedback || []).map((item) => [Number(item.part_number), item.feedback]));
  return validateSpeakingResult({
    assessment_type: 'text_feedback_only',
    evidence_mode: 'transcript_only',
    is_partial_assessment: true,
    requires_human_review: true,
    overall_band: null,
    criteria: {
      fluency_coherence: unscored(),
      lexical_resource: unscored('insufficient'),
      grammatical_range_accuracy: unscored('insufficient'),
      pronunciation: unscored(),
    },
    part_feedback: artifacts.map((artifact) => ({
      part_number: Number(artifact.part_number),
      display_transcript: artifact.display_transcript || '',
      feedback: byPart.get(Number(artifact.part_number)) || '',
      audio_quality_warnings: artifact.audio_quality_json?.warnings || [],
    })),
    text_based_feedback: {
      lexical: join(feedback?.lexical_observations),
      grammar: join(feedback?.grammar_observations),
      coherence: join(feedback?.coherence_observations),
      warning: feedback?.uncertainty_note || 'Bản chép lời có thể chứa lỗi nhận dạng; tutor cần nghe audio để xác nhận.',
    },
    disclaimer: 'Không có band Speaking: transcript không đủ để chấm Fluency & Coherence hoặc Pronunciation và có thể chứa lỗi ASR.',
    pipeline_version: pipelineVersion,
    calibration_version: null,
    generated_at: generatedAt,
  });
};

class SpeakingGradingService {
  constructor({ pool, allowBandPublication = false } = {}) {
    this.pool = pool || require('../db/pool').pool;
    this.allowBandPublication = allowBandPublication;
  }

  async lockGroup(client, groupId, userId) {
    const parts = await client.query(
      `SELECT * FROM speaking_submissions
       WHERE speaking_group_id = $1 AND user_id = $2 AND deleted_at IS NULL
       ORDER BY part_number FOR UPDATE`, [groupId, userId]);
    const complete = parts.rows.length === 3
      && parts.rows.every((part, index) => Number(part.part_number) === index + 1);
    if (!complete) throw new AppError('Group Speaking không đủ ba Part.', 409, 'SPEAKING_GROUP_INCOMPLETE');
    return parts.rows;
  }

  async insertReport(client, input, representativeSubmissionId) {
    const { job, status, result, provider } = input;
    if (status === 'failed' || !result) return;
    const inserted = await analysisQueries.insertSpeakingReport(client, {
      representativeSubmissionId, groupId: job.group_id, jobId: job.id,
      overallBand: result.overall_band,
      fluencyAndCoherence: result.criteria.fluency_coherence.band,
      lexicalResource: result.criteria.lexical_resource.band,
      grammaticalRangeAndAccuracy: result.criteria.grammatical_range_accuracy.band,
      pronunciation: result.criteria.pronunciation.band,
      criteria: result.criteria,
      feedback: status === 'completed' ? { public_result: result } : { review_result: result },
      status, promptVersion: provider.promptVersion || 'speaking-evidence-v1',
      modelName: provider.modelName || 'none', pipelineVersion: job.pipeline_version,
      calibrationVersion: result.calibration_version, evidenceMode: result.evidence_mode,
      requiresHumanReview: result.requires_human_review,
    });
    if (!inserted) throw new AppError('Report của grading job đã tồn tại.', 409, 'SPEAKING_REPORT_CONFLICT');
  }

  async updateGroupStatus(client, groupId, userId, status) {
    const next = status === 'completed' ? 'ai_graded' : status === 'failed' ? 'grading_failed' : 'pending';
    await client.query(
      `UPDATE speaking_submissions SET status = $2, updated_at = NOW()
       WHERE speaking_group_id = $1 AND user_id = $3 AND deleted_at IS NULL`,
      [groupId, next, userId]);
  }

  async finishJob(client, input) {
    const { job, workerId, generation, status, provider } = input;
    const finished = await jobQueries.finishJob(client, {
      jobId: job.id, workerId, generation, status,
      errorCode: provider.errorCode, errorMessage: provider.errorMessage,
      retryable: provider.retryable,
    });
    if (!finished) throw new AppError('Worker lease đã hết khi finalize.', 409, 'STALE_WORKER_LEASE');
    return finished;
  }

  async persistTerminal({ job, workerId, generation, status, result = null, provider = {} }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const parts = await this.lockGroup(client, job.group_id, job.user_id);
      const input = { job, workerId, generation, status, result, provider };
      await this.insertReport(client, input, parts[0].id);
      await this.updateGroupStatus(client, job.group_id, job.user_id, status);
      const finished = await this.finishJob(client, input);
      await client.query('COMMIT');
      return finished;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  finalizeReview({ result, ...input }) {
    const validated = result ? validateSpeakingResult({
      ...result,
      pipeline_version: input.job.pipeline_version,
      generated_at: new Date().toISOString(),
    }) : null;
    return this.persistTerminal({ ...input, result: validated, status: 'needs_review' });
  }

  finalizeCompleted({ result, ...input }) {
    if (!this.allowBandPublication) {
      throw new AppError('Chấm điểm Speaking ước tính chưa được bật.', 503, 'SPEAKING_BAND_RELEASE_GATED');
    }
    const validated = validateSpeakingResult({
      ...result,
      pipeline_version: input.job.pipeline_version,
      generated_at: new Date().toISOString(),
    }, { allowFullAudio: true });
    if (validated.evidence_mode !== 'full_audio') throw new AppError('Chỉ full_audio được công bố band.', 422, 'SPEAKING_FULL_AUDIO_REQUIRED');
    return this.persistTerminal({ ...input, result: validated, status: 'completed' });
  }

  finalizeFailed(input) {
    return this.persistTerminal({ ...input, status: 'failed', result: null });
  }
}

module.exports = { SpeakingGradingService, buildTranscriptReviewResult };
