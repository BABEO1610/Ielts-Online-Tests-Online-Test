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
    '- summary, strengths, weaknesses, explanations, detailedFeedback, vocabulary reasons, grammar explanations, and actionPlan must be in Vietnamese.',
    '- improvedVersion must be an IELTS-style sample rewrite in English.',
    '- summary must contain 4 to 6 useful Vietnamese sentences about overall quality and the main problems.',
    '- Each criterion feedback must contain 2 to 4 Vietnamese sentences explaining why that score was awarded.',
    '- strengths must contain 2 to 4 concrete strengths when possible.',
    '- majorErrors must contain at least 3 items when the essay has enough errors.',
    '- Each majorErrors item must cite an exact short quote from the student answer, explain the problem, and give a correction or improvement.',
    '- actionPlan must contain 3 to 5 specific next steps the student can practice.',
    '- Feedback must be detailed, practical, and clear for band 4-6 students.',
    '- Be specific — cite actual errors from the essay.',
    '- Do NOT fabricate information not in the essay.',
    '- Do NOT be overly optimistic.',
    '- Avoid one-sentence generic feedback sections.',
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
  taskNumber: 'number 1 or 2',
  overallBand: 'number 0-9',
  criteria: {
    taskAchievementOrResponse: {
      band: 'number',
      feedback: '2-4 Vietnamese sentences explaining the score',
    },
    coherenceCohesion: {
      band: 'number',
      feedback: '2-4 Vietnamese sentences explaining the score',
    },
    lexicalResource: {
      band: 'number',
      feedback: '2-4 Vietnamese sentences explaining the score',
    },
    grammarRangeAccuracy: {
      band: 'number',
      feedback: '2-4 Vietnamese sentences explaining the score',
    },
  },
  summary: '4-6 Vietnamese sentences',
  strengths: ['2-4 concrete strengths in Vietnamese'],
  weaknesses: ['2-4 concrete weaknesses in Vietnamese'],
  majorErrors: [{
    error: 'exact short quote from the student answer',
    explanation: 'problem explained in Vietnamese',
    correction: 'corrected phrase/sentence or improvement suggestion',
  }],
  detailedFeedback: {
    taskAchievementOrResponse: '2-4 Vietnamese sentences',
    coherenceCohesion: '2-4 Vietnamese sentences',
    lexicalResource: '2-4 Vietnamese sentences',
    grammarRangeAccuracy: '2-4 Vietnamese sentences',
  },
  improvedVersion: 'string in English',
  vocabularySuggestions: [{ original: 'string', better: 'string', reason: 'string in Vietnamese' }],
  grammarCorrections: [{ original: 'string', corrected: 'string', explanation: 'string in Vietnamese' }],
  actionPlan: ['3-5 specific Vietnamese next steps'],
  nextStudyAdvice: 'string in Vietnamese',
  wordCountFeedback: 'string or null',
  disclaimer: 'string',
}, null, 2);

const buildUserPrompt = ({
  taskType, questionPrompt, studentAnswer,
  wordCount, ieltsMinWords, testTitle,
}) => {
  const parts = [
    `Task type: Writing ${taskType === 'task1' ? 'Task 1' : 'Task 2'}`,
    `taskNumber: ${taskType === 'task1' ? 1 : 2}`,
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
