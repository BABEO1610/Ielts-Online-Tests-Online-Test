/**
 * @file backend/src/ai/grading.prompt.js
 * Builds IELTS Writing grading prompts for AI.
 * No DB queries, no AI calls — pure prompt construction.
 */

const buildSystemPrompt = (taskType) => {
  const criterionName = taskType === 'task1'
    ? 'Task Achievement'
    : 'Task Response';

  return [
    'You are an IELTS Writing examiner assistant.',
    'Grade strictly according to official IELTS Writing band descriptors.',
    `This is a Writing ${taskType === 'task1' ? 'Task 1' : 'Task 2'} submission.`,
    '',
    `Criterion 1: ${criterionName} (25%)`,
    'Criterion 2: Coherence and Cohesion (25%)',
    'Criterion 3: Lexical Resource (25%)',
    'Criterion 4: Grammatical Range and Accuracy (25%)',
    '',
    'Band scores range from 0 to 9 in 0.5 increments.',
    '',
    buildBandDescriptors(taskType),
    '',
    buildCalibrationRules(),
    '',
    'IMPORTANT RULES:',
    '- Feedback must be in Vietnamese, clear for band 4-5 students.',
    '- Be specific — cite actual errors from the essay.',
    '- Do NOT fabricate information not in the essay.',
    '- Do NOT be overly optimistic.',
    '- Do NOT use markdown in output.',
    '- Output ONLY valid JSON matching the schema below.',
    '- Do NOT wrap JSON in code blocks.',
  ].join('\n');
};

const buildBandDescriptors = (taskType) => {
  const taDesc = taskType === 'task1'
    ? buildTask1TaDescriptors()
    : buildTask2TrDescriptors();
  return taDesc;
};

const buildTask1TaDescriptors = () => [
  'TASK 1 — Task Achievement criteria:',
  '- Does the response address the task requirements?',
  '- Are key features, trends, and changes described?',
  '- Is there a clear overview?',
  '- Are specific data points used as evidence?',
  '- No personal opinions required.',
].join('\n');

const buildTask2TrDescriptors = () => [
  'TASK 2 — Task Response criteria:',
  '- Does the essay address the correct question type?',
  '- Is there a clear, consistent position?',
  '- Are ideas fully developed with reasoning/examples?',
  '- Is there a suitable conclusion?',
].join('\n');

const buildCalibrationRules = () => [
  'CALIBRATION:',
  '- Most students are band 4-6. Do not inflate scores.',
  '- Band 9: Near-perfect. Band 7: Good with minor issues.',
  '- Band 5: Limited, frequent errors. Band 3: Very limited.',
  '- If Task Achievement/Response is seriously weak,',
  '  overallBand must not exceed that criterion by more than 1.0.',
  '- If essay is under IELTS word requirement, TA/TR is affected.',
].join('\n');

const buildJsonSchema = () => JSON.stringify({
  overallBand: 'number 0-9',
  criteria: {
    taskAchievementOrResponse: { band: 'number', feedback: 'string' },
    coherenceCohesion: { band: 'number', feedback: 'string' },
    lexicalResource: { band: 'number', feedback: 'string' },
    grammarRangeAccuracy: { band: 'number', feedback: 'string' },
  },
  summary: 'string',
  strengths: ['string'],
  weaknesses: ['string'],
  majorErrors: [{ original: 'string', issue: 'string', suggestion: 'string' }],
  improvedVersion: 'string',
  nextStudyAdvice: 'string',
  wordCountFeedback: 'string or null',
  disclaimer: 'string',
}, null, 2);

const buildUserPrompt = ({
  taskType, questionPrompt, studentAnswer,
  wordCount, ieltsMinWords, testTitle,
}) => {
  const parts = [
    `Task type: Writing ${taskType === 'task1' ? 'Task 1' : 'Task 2'}`,
  ];
  if (testTitle) parts.push(`Test: ${testTitle}`);
  parts.push(`Student word count: ${wordCount}`);
  parts.push(`IELTS minimum words: ${ieltsMinWords}`);

  if (wordCount < ieltsMinWords) {
    parts.push(
      `WARNING: Essay is under IELTS word requirement (${ieltsMinWords}).`,
      'This MUST affect Task Achievement/Response score.'
    );
  }

  parts.push('', '--- QUESTION ---', questionPrompt || '(No prompt provided)');
  parts.push('', '--- STUDENT ANSWER ---', studentAnswer);
  parts.push('', '--- REQUIRED OUTPUT FORMAT (JSON only) ---');
  parts.push(buildJsonSchema());

  return parts.join('\n');
};

module.exports = { buildSystemPrompt, buildUserPrompt };
