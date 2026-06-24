const { pool } = require('../../db/pool');
const repository = require('./assistant.repository');
const { ASSISTANT_INTENTS, normalizeText } = require('./assistant.intent');
const {
  ERROR_CODES,
  ERROR_MESSAGES,
  INTENT_CONTEXT_MAP,
} = require('./assistant.constants');

const FRONTEND_BASE_URL = (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');

const toFrontendUrl = (path) => `${FRONTEND_BASE_URL}${path}`;

const SKILL_ROUTES = {
  reading: '/reading',
  writing: '/writing',
  speaking: '/speaking',
};

const getSkillRoute = (skill) => SKILL_ROUTES[String(skill || '').toLowerCase()] || '/reading';

const WEBSITE_ROUTES = [
  { label: 'Reading', href: toFrontendUrl('/reading') },
  { label: 'Writing', href: toFrontendUrl('/writing') },
  { label: 'Speaking', href: toFrontendUrl('/speaking') },
  { label: 'Library', href: toFrontendUrl('/library') },
];

const STUDY_TIPS = [
  'Reading: skim questions first, scan keywords, check paraphrases, and avoid reading every word too slowly.',
  'Listening: preview questions, predict word types, and pay attention to signposting and distractors.',
  'Writing/Speaking: this assistant only gives study tips in this phase. It does not grade or generate band scores.',
  'After each attempt, review mistakes and record common keywords or paraphrases.',
];

const createBaseContext = ({ intent, sessionMemory = [] }) => {
  const map = INTENT_CONTEXT_MAP[intent] || INTENT_CONTEXT_MAP.UNKNOWN;
  return {
    mode: intent,
    databaseResults: [],
    sessionMemory,
    allowedActions: map.allowedActions,
    forbiddenActions: map.forbiddenActions,
    suggestedLinks: [],
    contextMap: map,
  };
};

const detectSkill = (message) => {
  const text = normalizeText(message);
  return ['reading', 'listening', 'writing', 'speaking'].find((skill) => text.includes(skill)) || null;
};

const detectDifficulty = (message) => {
  const text = normalizeText(message);
  if (/\b(beginner|basic|easy|de|co ban)\b/.test(text)) return 'beginner';
  if (/\b(intermediate|medium|trung binh)\b/.test(text)) return 'intermediate';
  if (/\b(advanced|hard|kho|nang cao)\b/.test(text)) return 'advanced';
  return null;
};

const detectResourceType = (message) => {
  const text = normalizeText(message);
  if (/\b(pdf|ebook|document|tai lieu)\b/.test(text)) return 'pdf';
  if (/\b(audio|listening)\b/.test(text)) return 'audio';
  if (/\b(video|clip)\b/.test(text)) return 'video';
  return null;
};

const extractQuestionOrder = (message) => {
  const match = normalizeText(message).match(/\b(?:cau|question|q)\s*(\d{1,3})\b/);
  return match ? Number(match[1]) : null;
};

const normalizeUuid = (value) => {
  const text = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null;
};

const toTestLinks = (tests) =>
  tests.map((item) => ({
    label: item.title || 'IELTS test',
    href: toFrontendUrl(getSkillRoute(item.skill)),
  }));

const toLessonLinks = (resources) =>
  resources.map((item) => ({
    label: item.title || 'IELTS resource',
    href: toFrontendUrl('/library'),
  }));

const queryPublishedTests = async (message) => {
  const result = await pool.query(
    `SELECT id, title, description, skill, difficulty, duration_minutes
     FROM mock_tests
     WHERE is_published = TRUE
       AND skill::text IN ('reading', 'writing', 'speaking')
       AND ($1::text IS NULL OR skill::text = $1)
       AND ($2::text IS NULL OR difficulty::text = $2)
     ORDER BY created_at DESC
     LIMIT 5`,
    [detectSkill(message), detectDifficulty(message)]
  );
  return result.rows.map((row) => ({
    ...row,
    type: 'test',
    link: toFrontendUrl(getSkillRoute(row.skill)),
  }));
};

const queryPublishedResources = async (message) => {
  const result = await pool.query(
    `SELECT id, title, description, resource_type, file_size_bytes
     FROM library_resources
     WHERE is_published = TRUE
       AND ($1::text IS NULL OR resource_type::text = $1)
     ORDER BY created_at DESC
     LIMIT 5`,
    [detectResourceType(message)]
  );
  return result.rows.map((row) => ({
    type: 'lesson',
    id: row.id,
    title: row.title,
    description: row.description,
    resourceType: row.resource_type,
    fileSizeBytes: row.file_size_bytes,
    link: toFrontendUrl('/library'),
  }));
};

const queryOwnedAttempt = async ({ attemptId, userId }) => {
  const result = await pool.query(
    `SELECT id, user_id, test_id, submitted_at, band_score
     FROM test_attempts
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [attemptId, userId]
  );
  return result.rows[0] || null;
};

const queryAttemptQuestion = async ({ attemptId, questionId, message }) => {
  const result = await pool.query(
    `SELECT q.id, q.question_order, q.question_text, q.options,
            q.correct_answer, q.explanation, qa.given_answer, qa.is_correct
     FROM question_answers qa
     INNER JOIN questions q ON q.id = qa.question_id
     WHERE qa.attempt_id = $1
       AND ($2::uuid IS NULL OR q.id = $2::uuid)
       AND ($3::int IS NULL OR q.question_order = $3)
     ORDER BY q.question_order ASC
     LIMIT 1`,
    [attemptId, normalizeUuid(questionId), extractQuestionOrder(message)]
  );
  return result.rows[0] || null;
};

const buildReviewResult = (row) => ({
  type: 'review_context',
  questionId: row.id,
  questionOrder: row.question_order,
  questionText: row.question_text,
  options: row.options || null,
  selectedAnswer: row.given_answer || null,
  isCorrect: row.is_correct,
  correctAnswer: row.correct_answer || null,
  officialExplanation: row.explanation || null,
});

const getSessionMemory = async ({ user, sessionId }) => {
  return sessionId ? repository.getRecentMessages(user.id, sessionId, 8) : [];
};

const shouldLoadSessionMemory = (intent) => [
  ASSISTANT_INTENTS.FIND_TEST,
  ASSISTANT_INTENTS.FIND_LESSON,
  ASSISTANT_INTENTS.POST_TEST_REVIEW,
].includes(intent);

const buildStaticContext = (injection, intent) => {
  if (intent === ASSISTANT_INTENTS.GREETING) return injection;
  if (intent === ASSISTANT_INTENTS.NAVIGATION) {
    return { ...injection, databaseResults: WEBSITE_ROUTES, suggestedLinks: WEBSITE_ROUTES };
  }
  return {
    ...injection,
    databaseResults: STUDY_TIPS.map((tip) => ({ type: 'study_tip', content: tip })),
  };
};

const buildFindTestContext = async ({ injection, message }) => {
  const tests = await queryPublishedTests(message);
  return { ...injection, databaseResults: tests, suggestedLinks: toTestLinks(tests) };
};

const buildFindLessonContext = async ({ injection, message }) => {
  const resources = await queryPublishedResources(message);
  return { ...injection, databaseResults: resources, suggestedLinks: toLessonLinks(resources) };
};

const buildReviewContext = async ({ injection, message, context, user }) => {
  const attempt = await queryOwnedAttempt({ attemptId: context.attemptId, userId: user.id });
  if (!attempt) return { ...injection, errorCode: ERROR_CODES.ATTEMPT_NOT_FOUND };
  if (!attempt.submitted_at) return { ...injection, errorCode: ERROR_CODES.ATTEMPT_NOT_SUBMITTED };

  const row = await queryAttemptQuestion({
    attemptId: attempt.id,
    questionId: context.questionId,
    message,
  });
  if (!row) return { ...injection, errorCode: ERROR_CODES.QUESTION_NOT_FOUND };
  if (!row.explanation) return { ...injection, errorCode: ERROR_CODES.MISSING_EXPLANATION };
  return { ...injection, databaseResults: [buildReviewResult(row)] };
};

const buildRefusalContext = (injection) => ({
  ...injection,
  directAnswer: ERROR_MESSAGES[ERROR_CODES.OUT_OF_SCOPE],
});

const buildUnknownContext = (injection) => ({
  ...injection,
  directAnswer: 'Mình chỉ hỗ trợ nội dung IELTS trên website. Bạn có thể hỏi về test, lesson, study tips, navigation hoặc review đáp án sau khi nộp bài.',
});

const buildContextInjection = async ({ intent, message, context, user, sessionId }) => {
  const sessionMemory = shouldLoadSessionMemory(intent)
    ? await getSessionMemory({ user, sessionId })
    : [];
  const injection = createBaseContext({ intent, sessionMemory });

  if ([ASSISTANT_INTENTS.GREETING, ASSISTANT_INTENTS.NAVIGATION, ASSISTANT_INTENTS.GENERAL_STUDY_TIPS].includes(intent)) {
    return buildStaticContext(injection, intent);
  }
  if (intent === ASSISTANT_INTENTS.FIND_TEST) return buildFindTestContext({ injection, message });
  if (intent === ASSISTANT_INTENTS.FIND_LESSON) return buildFindLessonContext({ injection, message });
  if (intent === ASSISTANT_INTENTS.POST_TEST_REVIEW) return buildReviewContext({ injection, message, context, user });
  if (intent === ASSISTANT_INTENTS.OUT_OF_SCOPE) return buildRefusalContext(injection);
  if (intent === ASSISTANT_INTENTS.UNKNOWN) return buildUnknownContext(injection);
  return buildUnknownContext(injection);
};

module.exports = {
  buildContextInjection,
  queryPublishedTests,
  queryPublishedResources,
  queryOwnedAttempt,
  queryAttemptQuestion,
};
