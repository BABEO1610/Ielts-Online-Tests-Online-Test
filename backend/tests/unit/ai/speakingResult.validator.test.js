const {
  computeSpeakingOverall,
  validateSpeakingResult,
  projectSpeakingResult,
} = require('../../../src/ai/speakingResult.validator');

const criterion = (band, evidenceStatus = 'sufficient') => ({
  band,
  evidence_status: evidenceStatus,
  feedback: band === null ? null : '<b>Phản hồi</b>',
});

const expectErrorCode = (action, code) => {
  try {
    action();
  } catch (error) {
    expect(error.errorCode).toBe(code);
    return;
  }
  throw new Error(`Expected ${code}`);
};

const fullResult = () => ({
  assessment_type: 'estimated',
  evidence_mode: 'full_audio',
  is_partial_assessment: false,
  requires_human_review: false,
  criteria: {
    fluency_coherence: criterion(6.5),
    lexical_resource: criterion(6.5),
    grammatical_range_accuracy: criterion(6),
    pronunciation: criterion(6),
  },
  overall_band: 9,
  text_based_feedback: null,
  disclaimer: 'Điểm ước tính, không phải điểm IELTS chính thức.',
  pipeline_version: 'speaking-v1',
  calibration_version: 'vi-v1',
});

describe('speakingResult.validator', () => {
  test.each([
    [[6, 6, 6, 6], 6],
    [[6, 6, 6, 6.5], 6],
    [[6, 6, 6.5, 6.5], 6.5],
    [[6, 6, 6.5, 7], 6.5],
    [[6, 6.5, 6.5, 7], 6.5],
    [[6, 6.5, 7, 7], 6.5],
    [[6, 6.5, 7, 7.5], 7],
    [[6, 6.5, 7.5, 7.5], 7],
    [[0, 0, 0, 0], 0],
    [[9, 9, 9, 9], 9],
  ])('rounds %j with decimal half-up semantics', (bands, expected) => {
    expect(computeSpeakingOverall(bands)).toBe(expected);
  });

  test('drops provider overall and sanitizes learner feedback', () => {
    const input = fullResult();
    input.rawResponse = 'provider secret';
    input.reliability = { internal: 0.99 };
    input.criteria.fluency_coherence.internal_confidence = 0.99;
    input.part_feedback = [{
      part_number: 1,
      display_transcript: '<b>Hello</b>',
      feedback: '<script>unsafe</script>Useful',
      audio_quality_warnings: ['clipping'],
      raw_timestamps: [1, 2, 3],
    }];
    const result = validateSpeakingResult(input, { allowFullAudio: true });
    expect(result.overall_band).toBe(6.5);
    expect(result.criteria.fluency_coherence.feedback).toBe('Phản hồi');
    expect(result.part_feedback[0]).toEqual({
      part_number: 1,
      display_transcript: 'Hello',
      feedback: 'unsafeUseful',
      audio_quality_warnings: ['clipping'],
    });
    expect(result).not.toHaveProperty('rawResponse');
    expect(result).not.toHaveProperty('reliability');
    expect(result.criteria.fluency_coherence).not.toHaveProperty('internal_confidence');
  });

  test('fails closed when full-audio publication is disabled', () => {
    expectErrorCode(() => validateSpeakingResult(fullResult()), 'SPEAKING_BAND_RELEASE_GATED');
  });

  test('rejects a band without sufficient evidence', () => {
    const input = fullResult();
    input.evidence_mode = 'partial_audio';
    input.is_partial_assessment = true;
    input.requires_human_review = true;
    input.criteria.pronunciation = criterion(6, 'insufficient');
    input.overall_band = null;
    expectErrorCode(() => validateSpeakingResult(input), 'SPEAKING_EVIDENCE_INVALID');
  });

  test('requires partial audio to omit at least one band and its Overall', () => {
    const input = fullResult();
    input.evidence_mode = 'partial_audio';
    input.is_partial_assessment = true;
    input.requires_human_review = true;
    input.overall_band = null;
    expectErrorCode(() => validateSpeakingResult(input), 'SPEAKING_EVIDENCE_INVALID');
    input.criteria.pronunciation = criterion(null, 'insufficient');
    expect(validateSpeakingResult(input).overall_band).toBeNull();
    input.calibration_version = null;
    expectErrorCode(() => validateSpeakingResult(input), 'SPEAKING_EVIDENCE_INVALID');
  });

  test('requires every transcript-only band and overall to be null', () => {
    const input = fullResult();
    input.assessment_type = 'text_feedback_only';
    input.evidence_mode = 'transcript_only';
    input.is_partial_assessment = true;
    input.requires_human_review = true;
    input.overall_band = null;
    input.calibration_version = null;
    input.text_based_feedback = {
      lexical: 'Từ vựng', grammar: 'Ngữ pháp', coherence: 'Mạch lạc', warning: 'ASR không phải bản ghi nguyên văn.',
    };
    Object.values(input.criteria).forEach((item) => {
      item.band = null;
      item.feedback = null;
      item.evidence_status = 'unavailable';
    });
    expect(validateSpeakingResult(input).overall_band).toBeNull();
    input.criteria.pronunciation.feedback = 'Điểm phát âm giả';
    expectErrorCode(() => validateSpeakingResult(input), 'SPEAKING_EVIDENCE_INVALID');
    input.criteria.pronunciation.feedback = null;
    input.criteria.lexical_resource.band = 6;
    expectErrorCode(() => validateSpeakingResult(input), 'SPEAKING_EVIDENCE_INVALID');
  });

  test('redacts review references from learners', () => {
    const review = { evidence_mode: 'partial_audio' };
    expect(projectSpeakingResult({ status: 'needs_review', result: review, role: 'student' })).toBeNull();
    expect(projectSpeakingResult({ status: 'needs_review', result: review, role: 'tutor', assigned: true })).toEqual(review);
    expect(projectSpeakingResult({ status: 'completed', result: fullResult(), role: 'student' })).toEqual(fullResult());
  });
});
