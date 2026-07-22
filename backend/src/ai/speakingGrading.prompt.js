const buildSpeakingSystemPrompt = () => [
  'You are an IELTS Speaking examiner assistant.',
  'Grade the complete IELTS Speaking session as a tutor reference, strictly according to IELTS Speaking band descriptors.',
  '',
  'Criteria:',
  '1. Fluency and Coherence (25%)',
  '2. Lexical Resource (25%)',
  '3. Grammatical Range and Accuracy (25%)',
  '4. Pronunciation (25%)',
  '',
  'Band scores range from 0 to 9 in 0.5 increments.',
  'Assess the full 3-part session as one 11-14 minute speaking test. Do not assign separate band scores per part.',
  'Pronunciation must be estimated from transcript evidence and any available audio notes. Do not pretend to hear details that are not available.',
  '',
  'IMPORTANT RULES:',
  '- summary, strengths, weaknesses, explanations, detailedFeedback, and actionPlan must be in Vietnamese.',
  '- transcriptNotes must mention that tutor should verify pronunciation by listening to the audio.',
  '- partFeedback must include practical comments for Part 1, Part 2, and Part 3.',
  '- Be concrete and cite actual short quotes from the transcript when useful.',
  '- Do NOT fabricate content not present in the transcript.',
  '- Do NOT use markdown in output.',
  '- Output ONLY valid JSON matching the schema.',
  '- Do NOT wrap JSON in code blocks.',
].join('\n');

const SPEAKING_SCHEMA = {
  partNumber: 'null for full Speaking session',
  overallBand: 'number 0-9',
  criteria: {
    fluencyCoherence: {
      band: 'number',
      feedback: '2-4 Vietnamese sentences explaining the score',
    },
    lexicalResource: {
      band: 'number',
      feedback: '2-4 Vietnamese sentences explaining the score',
    },
    grammaticalRangeAccuracy: {
      band: 'number',
      feedback: '2-4 Vietnamese sentences explaining the score',
    },
    pronunciation: {
      band: 'number',
      feedback: '2-4 Vietnamese sentences explaining the audio-based estimate',
    },
  },
  summary: '4-6 Vietnamese sentences',
  strengths: ['2-4 concrete strengths in Vietnamese'],
  weaknesses: ['2-4 concrete weaknesses in Vietnamese'],
  majorErrors: [{
    error: 'exact short quote from the transcript',
    explanation: 'problem explained in Vietnamese',
    correction: 'improved phrase/sentence',
  }],
  detailedFeedback: {
    fluencyCoherence: '2-4 Vietnamese sentences',
    lexicalResource: '2-4 Vietnamese sentences',
    grammaticalRangeAccuracy: '2-4 Vietnamese sentences',
    pronunciation: '2-4 Vietnamese sentences',
  },
  partFeedback: [{
    partNumber: 'number 1, 2, or 3',
    summary: 'Vietnamese comments about this part',
    strengths: ['Vietnamese strengths for this part'],
    weaknesses: ['Vietnamese weaknesses for this part'],
  }],
  actionPlan: ['3-5 specific Vietnamese next steps'],
  nextStudyAdvice: 'string in Vietnamese',
  transcriptNotes: 'string in Vietnamese',
  disclaimer: 'string',
};
const buildSpeakingSchema = () => JSON.stringify(SPEAKING_SCHEMA, null, 2);

const buildSpeakingUserPrompt = ({
  partNumber,
  promptText,
  transcript,
  testTitle,
}) => [
  `Test: ${testTitle || '(No test title provided)'}`,
  `Speaking partNumber: ${partNumber}`,
  '',
  '--- PART PROMPT / QUESTIONS ---',
  promptText || '(No prompt provided)',
  '',
  '--- STUDENT TRANSCRIPT ---',
  transcript || '(No transcript provided)',
  '',
  '--- REQUIRED OUTPUT FORMAT (JSON only) ---',
  buildSpeakingSchema(),
].join('\n');

const buildSpeakingSessionUserPrompt = ({
  parts,
  testTitle,
}) => [
  `Test: ${testTitle || '(No test title provided)'}`,
  'Speaking scope: full 3-part IELTS Speaking session',
  '',
  ...parts.flatMap(part => [
    `--- PART ${part.partNumber} PROMPT / QUESTIONS ---`,
    part.promptText || '(No prompt provided)',
    '',
    `--- PART ${part.partNumber} STUDENT TRANSCRIPT ---`,
    part.transcript || '(No transcript provided)',
    '',
  ]),
  '--- REQUIRED OUTPUT FORMAT (JSON only) ---',
  buildSpeakingSchema(),
].join('\n');

const buildSpeakingEvidenceSystemPrompt = () => [
  'You are an IELTS Speaking examiner assistant producing a practice estimate.',
  'Assess one complete three-part session against the four public IELTS Speaking criteria.',
  'Use the ASR transcript for wording, grammar, vocabulary, relevance, and coherence.',
  'Use fluency_metrics and pronunciation_evidence extracted from the actual audio for delivery and pronunciation.',
  'Never infer pronunciation from spelling or transcript text.',
  'Do not silently correct ASR grammar before grading. Treat uncertain transcript spans cautiously.',
  'Return criterion bands from 0 to 9 in 0.5 increments; the backend computes Overall independently.',
  'All feedback fields must be concise Vietnamese, while quoted learner language stays in English.',
  'Return ONLY valid JSON matching the requested schema, without markdown.',
].join('\n');

const buildSpeakingEvidenceSessionUserPrompt = ({ parts, testTitle }) => [
  `Test: ${testTitle || '(Không có tên bài)'}`,
  'Dưới đây là transcript ASR chưa sửa cùng evidence đã phân tích từ audio thật.',
  JSON.stringify({ parts }, null, 2),
  'REQUIRED OUTPUT FORMAT (JSON only):',
  buildSpeakingSchema(),
].join('\n\n');

const buildAudioEvidenceSystemPrompt = () => [
  'Analyze the supplied English learner audio for delivery evidence only.',
  'Listen to the actual waveform. The ASR transcript is a reference and may contain recognition errors.',
  'Do not assign IELTS bands or numeric scores. Do not infer acoustic facts from transcript spelling.',
  'Assess observable pace, pauses, hesitation, repair, repetition, intelligibility, segmental clarity,',
  'word stress, rhythm, intonation, and connected speech across this audio part.',
  'Mark a component insufficient only when the recording truly prevents a defensible observation.',
  'Return ONLY JSON matching the response schema. Summary strings must be Vietnamese.',
].join('\n');

const buildAudioEvidenceUserPrompt = ({ asrTranscript, languageCode = 'en' }) => [
  `Language: ${languageCode}`,
  'ASR transcript (untrusted reference; do not correct it):',
  asrTranscript || '(trống)',
  'Analyze the attached audio now.',
].join('\n\n');

const audioEvidenceResponseSchema = {
  type: 'object',
  required: [
    'fluency_sufficient',
    'pronunciation_sufficient',
    'fluency_metrics',
    'pronunciation_evidence',
  ],
  properties: {
    fluency_sufficient: { type: 'boolean' },
    pronunciation_sufficient: { type: 'boolean' },
    fluency_metrics: {
      type: 'object',
      required: ['speech_rate', 'hesitation', 'pause_control', 'repetition_and_repair', 'delivery_summary'],
      properties: {
        speech_rate: { type: 'string' },
        hesitation: { type: 'string' },
        pause_control: { type: 'string' },
        repetition_and_repair: { type: 'string' },
        delivery_summary: { type: 'string' },
      },
    },
    pronunciation_evidence: {
      type: 'object',
      required: ['intelligibility', 'segmental_accuracy', 'word_stress', 'rhythm', 'intonation', 'connected_speech', 'evidence_summary'],
      properties: {
        intelligibility: { type: 'string' },
        segmental_accuracy: { type: 'string' },
        word_stress: { type: 'string' },
        rhythm: { type: 'string' },
        intonation: { type: 'string' },
        connected_speech: { type: 'string' },
        evidence_summary: { type: 'string' },
      },
    },
  },
};

module.exports = {
  buildSpeakingSystemPrompt,
  buildSpeakingUserPrompt,
  buildSpeakingSessionUserPrompt,
  buildSpeakingEvidenceSystemPrompt,
  buildSpeakingEvidenceSessionUserPrompt,
  buildAudioEvidenceSystemPrompt,
  buildAudioEvidenceUserPrompt,
  audioEvidenceResponseSchema,
};
