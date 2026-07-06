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

const buildSpeakingSchema = () => JSON.stringify({
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
      feedback: '2-4 Vietnamese sentences explaining the transcript-based estimate',
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
}, null, 2);

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

module.exports = {
  buildSpeakingSystemPrompt,
  buildSpeakingUserPrompt,
  buildSpeakingSessionUserPrompt,
};
