const { gradeSpeakingSessionFromEvidence } = require('./grading.service');

class SpeakingRubricScorer {
  async score() { throw new Error('score is not implemented'); }
}

const criterion = (value) => ({
  band: value.band,
  evidence_status: 'sufficient',
  feedback: value.feedback || '',
});

const formatPartFeedback = (artifact, result) => {
  const item = result.partFeedback.find(
    (feedback) => Number(feedback.partNumber) === Number(artifact.part_number)
  );
  const details = [
    item?.summary,
    ...(item?.strengths || []),
    ...(item?.weaknesses || []),
  ].filter(Boolean);
  return {
    part_number: Number(artifact.part_number),
    display_transcript: artifact.display_transcript || artifact.asr_transcript || '',
    feedback: details.join(' '),
    audio_quality_warnings: artifact.audio_quality_json?.warnings || [],
  };
};

const toEvidencePart = (artifact, part) => ({
  part_number: Number(part.part_number),
  prompt_text: part.prompt_text,
  asr_transcript: artifact.asr_transcript,
  audio_quality: artifact.audio_quality_json || {},
  fluency_metrics: artifact.fluency_metrics_json || {},
  pronunciation_evidence: artifact.pronunciation_evidence_json || {},
});

class GeminiSpeakingRubricScorer extends SpeakingRubricScorer {
  constructor({ gradeFromEvidence = gradeSpeakingSessionFromEvidence } = {}) {
    super();
    this.gradeFromEvidence = gradeFromEvidence;
  }

  async score({ artifacts, parts, job }) {
    const artifactByPart = new Map(
      artifacts.map((artifact) => [Number(artifact.part_number), artifact])
    );
    const evidenceParts = parts.map((part) => toEvidencePart(
      artifactByPart.get(Number(part.part_number)),
      part
    ));
    const result = await this.gradeFromEvidence(evidenceParts, {
      testTitle: parts[0]?.test_title || null,
      usageContext: {
        userId: job.user_id,
        feature: 'speaking_grading',
        entityType: 'ai_grading_job',
        entityId: job.id,
      },
    });
    return {
      result: {
        assessment_type: 'estimated',
        evidence_mode: 'full_audio',
        is_partial_assessment: false,
        requires_human_review: false,
        overall_band: result.overallBand,
        criteria: {
          fluency_coherence: criterion(result.criteria.fluencyCoherence),
          lexical_resource: criterion(result.criteria.lexicalResource),
          grammatical_range_accuracy: criterion(result.criteria.grammaticalRangeAccuracy),
          pronunciation: criterion(result.criteria.pronunciation),
        },
        part_feedback: artifacts.map((artifact) => formatPartFeedback(artifact, result)),
        text_based_feedback: null,
        disclaimer: 'Điểm AI ước tính từ transcript và audio để luyện tập, không phải điểm IELTS chính thức.',
      },
      provider: {
        modelName: result.modelName,
        promptVersion: result.promptVersion,
      },
    };
  }
}

module.exports = { SpeakingRubricScorer, GeminiSpeakingRubricScorer };
