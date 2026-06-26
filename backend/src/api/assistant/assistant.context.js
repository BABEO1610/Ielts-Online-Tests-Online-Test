const { pool } = require('../../db/pool');
const repository = require('./assistant.repository');
const { ASSISTANT_INTENTS, normalizeText } = require('./assistant.intent');
const {
  ERROR_CODES,
  ERROR_MESSAGES,
  INTENT_CONTEXT_MAP,
} = require('./assistant.constants');

const FRONTEND_BASE_URL = (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
const columnCache = new Map();

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

const SEARCH_STOP_WORDS = new Set([
  'ielts', 'test', 'mock', 'reading', 'listening', 'writing', 'speaking',
  'topic', 'skill', 'level', 'lesson', 'library', 'resource', 'thu', 'vien',
  'bai', 'hoc', 'thi', 'tim', 'de', 'co', 'khong', 'nao', 'nhung', 'trong',
  'he', 'thong', 'danh', 'sach', 'ban', 'bạn', 'có', 'không', 'nào', 'hệ thống', 'đề'
]);

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
  const rawText = String(message || '').toLowerCase();
  if (/\b(beginner|basic|easy|de dang|co ban)\b/.test(text) || /(^|\s)dễ(\s|$)/.test(rawText) || /(^|\s)level dễ(\s|$)/.test(rawText)) return 'beginner';
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

const getTableColumns = async (tableName) => {
  if (columnCache.has(tableName)) return columnCache.get(tableName);
  const result = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  const columns = new Set(result.rows.map((row) => row.column_name));
  columnCache.set(tableName, columns);
  return columns;
};

const extractSearchTerms = (message) => (
  normalizeText(message)
    .split(/[^a-z0-9]+/g)
    .filter((term) => term.length >= 2 && !SEARCH_STOP_WORDS.has(term))
    .slice(0, 5)
);

const extractVisibleItemTerms = (context = {}) => (
  (context.visibleItems || [])
    .flatMap((item) => [item.title, item.type])
    .flatMap((value) => normalizeText(value).split(/[^a-z0-9]+/g))
    .filter((term) => term.length >= 2 && !SEARCH_STOP_WORDS.has(term))
    .slice(0, 5)
);

const getSearchTerms = ({ message, context }) => {
  const normalizedMessage = normalizeText(message);
  const visibleTerms = extractVisibleItemTerms(context)
    .filter((term) => normalizedMessage.includes(term));
  const terms = [...extractSearchTerms(message), ...visibleTerms];
  return [...new Set(terms)].slice(0, 6);
};

const buildKeywordCondition = ({ fields, terms, values }) => {
  if (!terms.length) return null;
  return terms.map((term) => {
    values.push(`%${term}%`);
    const param = `$${values.length}`;
    return `(${fields.map((field) => `${field}::text ILIKE ${param}`).join(' OR ')})`;
  }).join(' AND ');
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
    href: item.route || toFrontendUrl(getSkillRoute(item.skill)),
  }));

const toLessonLinks = (resources) =>
  resources.map((item) => ({
    label: item.title || 'IELTS resource',
    href: item.route || toFrontendUrl('/library'),
  }));

const mapTestRows = (rows) => rows.map((row) => ({
  type: 'test',
  id: row.id,
  title: row.title,
  skill: row.skill,
  difficulty: row.difficulty,
  description: row.description,
  durationMinutes: row.duration_minutes,
  route: toFrontendUrl(getSkillRoute(row.skill)),
}));

const ASSISTANT_TABLE_MAP = {
  mock_tests: 'mock_tests',
  library_resources: 'library_resources',
  test_attempts: 'test_attempts',
  questions: 'questions',
  question_answers: 'question_answers'
};

const getPublishCondition = async (tableName) => {
  const columns = await getTableColumns(tableName);
  if (columns.has('is_published')) return 'is_published = TRUE';
  if (columns.has('status')) return "status = 'published'";
  if (columns.has('is_active')) return 'is_active = TRUE';
  if (columns.has('published')) return 'published = TRUE';
  return '1=1';
};

const runPublishedTestQuery = async ({ skill, difficulty }) => {
  const tableName = ASSISTANT_TABLE_MAP.mock_tests;
  const publishFilter = await getPublishCondition(tableName);
  const conditions = [publishFilter];
  const values = [];

  if (skill) {
    values.push(skill);
    conditions.push(`skill::text = $${values.length}`);
  }
  if (difficulty) {
    values.push(difficulty);
    conditions.push(`difficulty::text = $${values.length}`);
  }

  const selectedColumns = 'id, title, description, skill, difficulty, duration_minutes';
  const result = await pool.query(
    `SELECT ${selectedColumns}
     FROM ${tableName}
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT 50`,
    values
  );
  return { 
    rows: mapTestRows(result.rows), 
    publishFilter, 
    selectedColumns
  };
};

const queryPublishedTests = async (message, context = {}) => {
  const skill = detectSkill(message);
  const difficulty = detectDifficulty(message);
  const searchTerms = getSearchTerms({ message, context });
  
  const result = await runPublishedTestQuery({ skill, difficulty });

  if (searchTerms.length > 0) {
    const termStr = searchTerms.join(' ').toLowerCase();
    
    const exactRows = result.rows.filter(r => normalizeText(r.title) === termStr);
    if (exactRows.length > 0) return { ...result, rows: exactRows.slice(0, 5), searchTerms, exactTitleMatch: true, fuzzyTitleMatch: false, fallbackReason: null, skillFilter: skill };

    const fuzzyRows = result.rows.filter(r => normalizeText(r.title).includes(termStr) || normalizeText(r.description || '').includes(termStr));
    if (fuzzyRows.length > 0) return { ...result, rows: fuzzyRows.slice(0, 5), searchTerms, exactTitleMatch: false, fuzzyTitleMatch: true, fallbackReason: null, skillFilter: skill };

    return { ...result, rows: result.rows.slice(0, 5), searchTerms, exactTitleMatch: false, fuzzyTitleMatch: false, fallbackReason: 'no_exact_or_fuzzy_match', skillFilter: skill };
  }

  return { ...result, rows: result.rows.slice(0, 5), searchTerms, exactTitleMatch: false, fuzzyTitleMatch: false, fallbackReason: null, skillFilter: skill };
};

const mapResourceRows = (rows) => rows.map((row) => ({
  type: 'library_resource',
  id: row.id,
  title: row.title,
  resourceType: row.resource_type,
  category: row.category || null,
  description: row.description,
  route: toFrontendUrl('/library'),
}));

const runPublishedResourceQuery = async ({ resourceType }) => {
  const tableName = ASSISTANT_TABLE_MAP.library_resources;
  const columns = await getTableColumns(tableName);
  const publishFilter = await getPublishCondition(tableName);
  const conditions = [publishFilter];
  const values = [];

  if (resourceType) {
    values.push(resourceType);
    conditions.push(`resource_type::text = $${values.length}`);
  }

  const fields = ['title', 'description', 'resource_type'];
  if (columns.has('category')) fields.push('category');

  const categorySelect = columns.has('category') ? 'category' : 'NULL AS category';
  const selectedColumns = `id, title, description, ${categorySelect}, resource_type, file_size_bytes`;
  const result = await pool.query(
    `SELECT ${selectedColumns}
     FROM ${tableName}
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT 50`,
    values
  );
  return { 
    rows: mapResourceRows(result.rows), 
    publishFilter, 
    selectedColumns
  };
};

const queryPublishedResources = async (message, context = {}) => {
  const resourceType = detectResourceType(message);
  const searchTerms = getSearchTerms({ message, context });
  
  const result = await runPublishedResourceQuery({ resourceType });

  if (searchTerms.length > 0) {
    const termStr = searchTerms.join(' ').toLowerCase();
    
    const exactRows = result.rows.filter(r => normalizeText(r.title) === termStr);
    if (exactRows.length > 0) return { ...result, rows: exactRows.slice(0, 5), searchTerms, exactTitleMatch: true, fuzzyTitleMatch: false, fallbackReason: null, resourceTypeFilter: resourceType };

    const fuzzyRows = result.rows.filter(r => normalizeText(r.title).includes(termStr) || normalizeText(r.description || '').includes(termStr) || normalizeText(r.category || '').includes(termStr));
    if (fuzzyRows.length > 0) return { ...result, rows: fuzzyRows.slice(0, 5), searchTerms, exactTitleMatch: false, fuzzyTitleMatch: true, fallbackReason: null, resourceTypeFilter: resourceType };

    return { ...result, rows: result.rows.slice(0, 5), searchTerms, exactTitleMatch: false, fuzzyTitleMatch: false, fallbackReason: 'no_exact_or_fuzzy_match', resourceTypeFilter: resourceType };
  }
  
  return { ...result, rows: result.rows.slice(0, 5), searchTerms, exactTitleMatch: false, fuzzyTitleMatch: false, fallbackReason: null, resourceTypeFilter: resourceType };
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

const queryAttemptQuestions = async ({ attemptId, questionId, message }) => {
  const result = await pool.query(
    `SELECT q.id, q.question_order, q.question_text, q.options,
            q.correct_answer, q.explanation, qa.given_answer, qa.is_correct
     FROM question_answers qa
     INNER JOIN questions q ON q.id = qa.question_id
     WHERE qa.attempt_id = $1
       AND ($2::uuid IS NULL OR q.id = $2::uuid)
       AND ($3::int IS NULL OR q.question_order = $3)
     ORDER BY q.question_order ASC
     LIMIT 40`,
    [attemptId, normalizeUuid(questionId), extractQuestionOrder(message)]
  );
  return result.rows;
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

const buildFindTestContext = async ({ injection, message, context }) => {
  try {
    const data = await queryPublishedTests(message, context);
    return {
      ...injection,
      databaseResults: data.rows,
      suggestedLinks: toTestLinks(data.rows),
      debug: { 
        queryTable: ASSISTANT_TABLE_MAP.mock_tests, 
        selectedColumns: data.selectedColumns,
        publishFilter: data.publishFilter,
        searchTerms: data.searchTerms,
        skillFilter: data.skillFilter,
        exactTitleMatch: data.exactTitleMatch || false,
        fuzzyTitleMatch: data.fuzzyTitleMatch || false,
        fallbackReason: data.fallbackReason,
        resultTitles: data.rows.map(r => r.title),
        rowCount: data.rows.length 
      },
    };
  } catch (dbError) {
    return {
      ...injection,
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      debug: {
        queryTable: ASSISTANT_TABLE_MAP.mock_tests,
        dbError: { message: dbError.message, code: dbError.code }
      }
    };
  }
};

const buildFindLessonContext = async ({ injection, message, context }) => {
  try {
    const data = await queryPublishedResources(message, context);
    return {
      ...injection,
      databaseResults: data.rows,
      suggestedLinks: toLessonLinks(data.rows),
      debug: { 
        queryTable: ASSISTANT_TABLE_MAP.library_resources, 
        selectedColumns: data.selectedColumns,
        publishFilter: data.publishFilter,
        searchTerms: data.searchTerms,
        resourceTypeFilter: data.resourceTypeFilter,
        exactTitleMatch: data.exactTitleMatch || false,
        fuzzyTitleMatch: data.fuzzyTitleMatch || false,
        fallbackReason: data.fallbackReason,
        resultTitles: data.rows.map(r => r.title),
        rowCount: data.rows.length 
      },
    };
  } catch (dbError) {
    return {
      ...injection,
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      debug: {
        queryTable: ASSISTANT_TABLE_MAP.library_resources,
        dbError: { message: dbError.message, code: dbError.code }
      }
    };
  }
};

const buildReviewContext = async ({ injection, message, context, user }) => {
  try {
    const attempt = await queryOwnedAttempt({ attemptId: context.attemptId, userId: user.id });
    if (!attempt) return { ...injection, errorCode: ERROR_CODES.ATTEMPT_NOT_FOUND };
    if (!attempt.submitted_at) return { ...injection, errorCode: ERROR_CODES.ATTEMPT_NOT_SUBMITTED };

    const rows = await queryAttemptQuestions({
      attemptId: attempt.id,
      questionId: context.questionId,
      message,
    });
    if (!rows.length) return { ...injection, errorCode: ERROR_CODES.QUESTION_NOT_FOUND };
    if (rows.some((row) => !row.explanation)) {
      return { ...injection, errorCode: ERROR_CODES.MISSING_EXPLANATION };
    }
    const results = rows.map(buildReviewResult);
    return {
      ...injection,
      databaseResults: results,
      debug: { 
        queryTable: `${ASSISTANT_TABLE_MAP.test_attempts}/${ASSISTANT_TABLE_MAP.questions}/${ASSISTANT_TABLE_MAP.question_answers}`, 
        searchTerms: [], 
        rowCount: results.length 
      },
    };
  } catch (dbError) {
    return {
      ...injection,
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      debug: {
        queryTable: `${ASSISTANT_TABLE_MAP.test_attempts}/${ASSISTANT_TABLE_MAP.questions}/${ASSISTANT_TABLE_MAP.question_answers}`,
        dbError: { message: dbError.message, code: dbError.code }
      }
    };
  }
};

const buildUnknownContext = (injection) => ({
  ...injection,
  directAnswer: 'Mình chỉ hỗ trợ nội dung IELTS trên website. Bạn có thể hỏi về test, lesson, study tips, navigation hoặc review đáp án sau khi nộp bài.',
});

const buildContextInjection = async ({ intent, message, context, user, sessionId }) => {
  const sessionMemory = shouldLoadSessionMemory(intent)
    ? await getSessionMemory({ user, sessionId })
    : [];
  const injection = createBaseContext({ intent, sessionMemory });

  if ([ASSISTANT_INTENTS.NAVIGATION, ASSISTANT_INTENTS.WEBSITE_HELP].includes(intent)) {
    return { ...injection, databaseResults: WEBSITE_ROUTES, suggestedLinks: WEBSITE_ROUTES };
  }
  if (intent === ASSISTANT_INTENTS.GENERAL_STUDY_TIPS) {
    return {
      ...injection,
      databaseResults: STUDY_TIPS.map((tip) => ({ type: 'study_tip', content: tip })),
    };
  }
  if (intent === ASSISTANT_INTENTS.IELTS_KNOWLEDGE) return injection;
  if (intent === ASSISTANT_INTENTS.FIND_TEST) return buildFindTestContext({ injection, message, context });
  if (intent === ASSISTANT_INTENTS.FIND_LESSON) return buildFindLessonContext({ injection, message, context });
  if (intent === ASSISTANT_INTENTS.POST_TEST_REVIEW) return buildReviewContext({ injection, message, context, user });
  return buildUnknownContext(injection);
};

module.exports = {
  buildContextInjection,
  queryPublishedTests,
  queryPublishedResources,
  queryOwnedAttempt,
  queryAttemptQuestions,
};
