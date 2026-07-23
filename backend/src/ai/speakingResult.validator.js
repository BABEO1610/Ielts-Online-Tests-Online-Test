const AppError = require('../utils/AppError');

const CRITERIA = [
  'fluency_coherence',
  'lexical_resource',
  'grammatical_range_accuracy',
  'pronunciation',
];
const EVIDENCE_STATUSES = new Set(['sufficient', 'insufficient', 'unavailable']);

const fail = (message, code = 'SPEAKING_EVIDENCE_INVALID') => {
  throw new AppError(message, 422, code);
};

const sanitizeText = (value, maxLength = 4000) => {
  if (value === null || value === undefined) return null;
  return String(value)
    .replace(/<[^>]*>/g, '')
    .replace(/\p{Cc}/gu, ' ')
    .trim()
    .slice(0, maxLength);
};

const requireText = (value, field, maxLength = 4000) => {
  const normalized = sanitizeText(value, maxLength);
  if (!normalized) fail(`Thiếu ${field}.`);
  return normalized;
};

const isBand = (value) => Number.isFinite(value)
  && value >= 0
  && value <= 9
  && Number.isInteger(value * 2);

const computeSpeakingOverall = (bands) => {
  if (!Array.isArray(bands) || bands.length !== 4 || !bands.every(isBand)) {
    fail('Cần đúng bốn band hợp lệ để tính Overall.');
  }
  const halfUnitSum = bands.reduce((sum, band) => sum + Math.round(band * 2), 0);
  return Math.floor((halfUnitSum + 2) / 4) / 2;
};

const normalizeCriterion = (criterion) => {
  if (!criterion || !EVIDENCE_STATUSES.has(criterion.evidence_status)) {
    fail('Trạng thái evidence của tiêu chí không hợp lệ.');
  }
  const band = criterion.band === null ? null : Number(criterion.band);
  if (band !== null && (!isBand(band) || criterion.evidence_status !== 'sufficient')) {
    fail('Band chỉ được phép khi evidence đầy đủ.');
  }
  return {
    band,
    evidence_status: criterion.evidence_status,
    feedback: sanitizeText(criterion.feedback),
  };
};

const normalizeCriteria = (criteria) => Object.fromEntries(CRITERIA.map((key) => {
  if (!Object.prototype.hasOwnProperty.call(criteria || {}, key)) fail(`Thiếu tiêu chí ${key}.`);
  return [key, normalizeCriterion(criteria[key])];
}));

const validateAssessmentShape = (result) => {
  const expectedAssessment = result.evidence_mode === 'transcript_only'
    ? 'text_feedback_only' : 'estimated';
  if (result.assessment_type !== expectedAssessment) fail('assessment_type không khớp evidence mode.');
  if (typeof result.is_partial_assessment !== 'boolean'
    || typeof result.requires_human_review !== 'boolean') {
    fail('Cờ partial/review phải là boolean.');
  }
};

const normalizeTextFeedback = (value, evidenceMode) => {
  if (evidenceMode !== 'transcript_only') {
    if (value !== null && value !== undefined) fail('Text feedback chỉ dành cho transcript-only.');
    return null;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Thiếu text_based_feedback.');
  return {
    lexical: sanitizeText(value.lexical) || '',
    grammar: sanitizeText(value.grammar) || '',
    coherence: sanitizeText(value.coherence) || '',
    warning: requireText(value.warning, 'cảnh báo ASR'),
  };
};

const normalizePartFeedback = (value) => {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value) || value.length > 3) fail('part_feedback không hợp lệ.');
  const seen = new Set();
  return value.map((item) => {
    const partNumber = Number(item?.part_number);
    if (![1, 2, 3].includes(partNumber) || seen.has(partNumber)) fail('part_feedback trùng hoặc sai Part.');
    seen.add(partNumber);
    return {
      part_number: partNumber,
      display_transcript: sanitizeText(item.display_transcript, 20000) || '',
      feedback: sanitizeText(item.feedback) || '',
      audio_quality_warnings: (Array.isArray(item.audio_quality_warnings)
        ? item.audio_quality_warnings.slice(0, 20).map((warning) => sanitizeText(warning, 100)).filter(Boolean)
        : []),
    };
  });
};

const normalizeGeneratedAt = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) fail('generated_at không hợp lệ.');
  return date.toISOString();
};

const validateMode = (result, criteria, allowFullAudio) => {
  const bands = CRITERIA.map((key) => criteria[key].band);
  if (result.evidence_mode === 'full_audio') {
    if (!allowFullAudio) fail('Public Speaking band chưa được mở.', 'SPEAKING_BAND_RELEASE_GATED');
    if (bands.some((band) => band === null) || !result.calibration_version) fail('Full audio thiếu band hoặc calibration.');
    if (result.is_partial_assessment !== false || result.requires_human_review !== false) fail('Full audio không thể là partial review.');
    return computeSpeakingOverall(bands);
  }
  if (result.evidence_mode === 'partial_audio') {
    if (result.is_partial_assessment !== true || result.requires_human_review !== true) fail('Partial audio phải chuyển human review.');
    if (result.overall_band !== null || bands.every((band) => band !== null)) {
      fail('Partial audio phải thiếu ít nhất một band và có Overall null.');
    }
    return null;
  }
  if (result.evidence_mode === 'transcript_only') {
    if (result.overall_band !== null || bands.some((band) => band !== null) || result.calibration_version !== null) {
      fail('Transcript-only không được có band/calibration.');
    }
    if (result.is_partial_assessment !== true || result.requires_human_review !== true) fail('Transcript-only thiếu review flag.');
    if (CRITERIA.some((key) => criteria[key].feedback !== null)) fail('Transcript-only không được có criterion feedback.');
    return null;
  }
  return fail('Evidence mode không hợp lệ.');
};

const validateSpeakingResult = (input, { allowFullAudio = false } = {}) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Kết quả Speaking không hợp lệ.');
  validateAssessmentShape(input);
  const criteria = normalizeCriteria(input?.criteria);
  const overallBand = validateMode(input, criteria, allowFullAudio);
  const calibrationVersion = input.calibration_version === null
    ? null : requireText(input.calibration_version, 'calibration_version', 80);
  if (CRITERIA.some((key) => criteria[key].band !== null) && !calibrationVersion) {
    fail('Band Speaking phải có calibration_version.');
  }
  return {
    assessment_type: input.assessment_type,
    evidence_mode: input.evidence_mode,
    is_partial_assessment: input.is_partial_assessment,
    requires_human_review: input.requires_human_review,
    criteria,
    overall_band: overallBand,
    part_feedback: normalizePartFeedback(input.part_feedback),
    text_based_feedback: normalizeTextFeedback(input.text_based_feedback, input.evidence_mode),
    disclaimer: requireText(input.disclaimer, 'disclaimer'),
    pipeline_version: requireText(input.pipeline_version, 'pipeline_version', 80),
    calibration_version: calibrationVersion,
    generated_at: normalizeGeneratedAt(input.generated_at),
  };
};

const projectSpeakingResult = ({ status, result, role, assigned = false }) => {
  if (status === 'completed') return result;
  if (status === 'needs_review' && (role === 'admin' || (role === 'tutor' && assigned))) return result;
  return null;
};

module.exports = {
  CRITERIA,
  computeSpeakingOverall,
  isBand,
  projectSpeakingResult,
  sanitizeText,
  validateSpeakingResult,
};
