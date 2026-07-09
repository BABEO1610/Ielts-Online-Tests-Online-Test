const { pool } = require('../../db/pool');
const repository = require('./assistant.repository');
const { ASSISTANT_INTENTS, normalizeText } = require('./assistant.intent');
const { buildNavigationResponse } = require('./assistant.responses');
const { retrieveKnowledge } = require('./assistant.knowledge-retriever');
const { parseLookupMessage } = require('./assistant.lookup-parser');
const {
  STATIC_ROUTES,
  toFrontendUrl,
  buildTestRoute,
  buildLibraryRoute,
  buildAssistantLink,
} = require('./assistant.link-builder');
const {
  ERROR_CODES,
  ERROR_MESSAGES,
  INTENT_CONTEXT_MAP,
  ASSISTANT_CONTEXT_RESULT_LIMIT,
  ASSISTANT_DB_LOOKUP_LIMIT,
} = require('./assistant.constants');

const columnCache = new Map();

const WEBSITE_ROUTES = [
  buildAssistantLink({ type: 'listening', label: 'Listening' }),
  buildAssistantLink({ type: 'reading', label: 'Reading' }),
  buildAssistantLink({ type: 'writing', label: 'Writing' }),
  buildAssistantLink({ type: 'speaking', label: 'Speaking' }),
  buildAssistantLink({ type: 'library', label: 'Library' }),
  buildAssistantLink({ type: 'practiceHistory', label: 'Practice History' }),
  buildAssistantLink({ type: 'profile', label: 'Profile' }),
];

const STUDY_TIPS = [
  'Reading: skim questions first, scan keywords, check paraphrases, and avoid reading every word too slowly.',
  'Listening: preview questions, predict word types, and pay attention to signposting and distractors.',
  'Writing/Speaking: this assistant only gives study tips in this phase. It does not grade or generate band scores.',
  'After each attempt, review mistakes and record common keywords or paraphrases.',
];

const buildNavigationLinks = (message) => {
  const text = normalizeText(message);
  const links = [];
  if (text.includes('listening')) links.push(buildAssistantLink({ type: 'listening', label: 'Listening' }));
  if (text.includes('reading')) links.push(buildAssistantLink({ type: 'reading', label: 'Reading' }));
  if (text.includes('writing')) links.push(buildAssistantLink({ type: 'writing', label: 'Writing' }));
  if (text.includes('speaking')) links.push(buildAssistantLink({ type: 'speaking', label: 'Speaking' }));
  if (/\b(thu vien|library)\b/.test(text)) links.push(buildAssistantLink({ type: 'library', label: 'Library' }));
  if (/\b(profile|ho so|tai khoan)\b/.test(text)) links.push(buildAssistantLink({ type: 'profile', label: 'Profile' }));
  if (/\b(lich su|history|practice history)\b/.test(text)) {
    links.push(buildAssistantLink({ type: 'practiceHistory', label: 'Practice History' }));
  }
  return links.length ? links : WEBSITE_ROUTES;
};

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
    knowledgeResults: [],
    knowledgeDebug: null,
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
  if (/\b(pdf|ebook|document)\b/.test(text)) return 'pdf';
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

const clearColumnCacheForTests = () => columnCache.clear();

const extractSearchTerms = (message) => (
  normalizeText(message)
    .split(/[^a-z0-9]+/g)
    .filter((term) => term.length >= 2 && !SEARCH_STOP_WORDS.has(term))
    .slice(0, ASSISTANT_CONTEXT_RESULT_LIMIT)
);

const extractVisibleItemTerms = (context = {}) => (
  (context.visibleItems || [])
    .flatMap((item) => [item.title, item.type])
    .flatMap((value) => normalizeText(value).split(/[^a-z0-9]+/g))
    .filter((term) => term.length >= 2 && !SEARCH_STOP_WORDS.has(term))
    .slice(0, ASSISTANT_CONTEXT_RESULT_LIMIT)
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
    href: item.route || toFrontendUrl(buildTestRoute({ id: item.id, skill: item.skill })),
    url: item.route || toFrontendUrl(buildTestRoute({ id: item.id, skill: item.skill })),
    type: 'test',
  }));

const toLessonLinks = (resources) =>
  resources.map((item) => ({
    label: item.title || 'IELTS resource',
    href: item.route || toFrontendUrl('/library'),
    url: item.route || toFrontendUrl('/library'),
    type: 'library_resource',
  }));

const mapTestRows = (rows) => rows.map((row) => ({
  type: 'test',
  id: row.id,
  title: row.title,
  skill: row.skill,
  difficulty: row.difficulty,
  description: row.description,
  durationMinutes: row.duration_minutes,
  route: toFrontendUrl(buildTestRoute({ id: row.id, skill: row.skill })),
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
  const conditions = [];
  if (columns.has('is_published')) conditions.push('is_published = TRUE');
  else if (columns.has('status')) conditions.push("status = 'published'");
  else if (columns.has('is_active')) conditions.push('is_active = TRUE');
  else if (columns.has('published')) conditions.push('published = TRUE');
  if (columns.has('review_status')) conditions.push("review_status = 'approved'");
  return conditions.length ? conditions.join(' AND ') : '1=1';
};

const limitContextRows = (rows) => rows.slice(0, ASSISTANT_CONTEXT_RESULT_LIMIT);
const SESSION_MEMORY_LIMIT = 8;
const SESSION_MEMORY_CONTENT_LIMIT = 700;

const truncateMemoryContent = (value) => {
  const text = String(value || '').trim();
  if (text.length <= SESSION_MEMORY_CONTENT_LIMIT) return text;
  return `${text.slice(0, SESSION_MEMORY_CONTENT_LIMIT).trim()}...`;
};

const normalizeSessionMemory = (rows = []) =>
  rows
    .map((row) => ({
      role: row.role === 'user' ? 'user' : 'assistant',
      content: truncateMemoryContent(row.content),
    }))
    .filter((row) => row.content)
    .slice(-SESSION_MEMORY_LIMIT);

const runPublishedTestQuery = async ({ skill, difficulty, titleNumber, sortOrder = 'DESC', limit = ASSISTANT_DB_LOOKUP_LIMIT }) => {
  const tableName = ASSISTANT_TABLE_MAP.mock_tests;
  const publishFilter = await getPublishCondition(tableName);
  const conditions = [publishFilter];
  const values = [];
  const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';
  const effectiveLimit = Math.max(1, Math.min(Number(limit) || ASSISTANT_DB_LOOKUP_LIMIT, ASSISTANT_DB_LOOKUP_LIMIT));

  if (skill) {
    values.push(skill);
    conditions.push(`skill::text = $${values.length}`);
  }
  if (difficulty) {
    values.push(difficulty);
    conditions.push(`difficulty::text = $${values.length}`);
  }
  if (titleNumber) {
    values.push(`%mock test ${titleNumber}%`);
    const mockParam = `$${values.length}`;
    values.push(`%test ${titleNumber}%`);
    const testParam = `$${values.length}`;
    values.push(`% ${titleNumber}:%`);
    const colonParam = `$${values.length}`;
    conditions.push(`(title::text ILIKE ${mockParam} OR title::text ILIKE ${testParam} OR title::text ILIKE ${colonParam})`);
  }

  const selectedColumns = 'id, title, description, skill, difficulty, duration_minutes';
  const result = await pool.query(
    `SELECT ${selectedColumns}
     FROM ${tableName}
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at ${order}
     LIMIT ${effectiveLimit}`,
    values
  );
  return { 
    rows: mapTestRows(result.rows), 
    dbRowCount: result.rows.length,
    publishFilter, 
    selectedColumns,
    effectiveLimit,
    sortField: 'created_at',
    sortOrder: order,
  };
};

const queryPublishedTests = async (message, context = {}) => {
  const slots = parseLookupMessage(message);
  const skill = slots.skill || detectSkill(message) || context.previousSkill || null;
  const difficulty = detectDifficulty(message);
  const searchTerms = slots.searchTerms.length
    ? slots.searchTerms
    : slots.isStructuredLookup ? [] : getSearchTerms({ message, context });
  const requestedQuantity = slots.quantity || (slots.action && slots.sort ? 1 : null);
  const effectiveLimit = requestedQuantity || slots.titleNumber
    ? Math.min(requestedQuantity || ASSISTANT_CONTEXT_RESULT_LIMIT, ASSISTANT_CONTEXT_RESULT_LIMIT)
    : ASSISTANT_DB_LOOKUP_LIMIT;
  
  const result = await runPublishedTestQuery({
    skill,
    difficulty,
    titleNumber: slots.titleNumber,
    sortOrder: slots.sortOrder,
    limit: effectiveLimit,
  });
  const fallbackResult = async (fallbackReason) => {
    const suggestions = await runPublishedTestQuery({});
    return {
      ...suggestions,
      rows: limitContextRows(suggestions.rows),
      searchTerms,
      exactTitleMatch: false,
      fuzzyTitleMatch: false,
      fallbackReason,
      lookupMissing: true,
      skillFilter: skill,
      difficultyFilter: difficulty,
      requestedQuantity,
      effectiveLimit: suggestions.effectiveLimit,
      sortOrder: suggestions.sortOrder,
      sortField: suggestions.sortField,
      titleNumber: slots.titleNumber,
      testNumber: slots.testNumber,
      action: slots.action,
    };
  };

  if (result.rows.length === 0 && (skill || difficulty)) {
    return fallbackResult('no_published_match_for_filter');
  }

  if (slots.isStructuredLookup) {
    return {
      ...result,
      rows: limitContextRows(result.rows),
      searchTerms,
      exactTitleMatch: false,
      fuzzyTitleMatch: false,
      fallbackReason: null,
      lookupMissing: false,
      skillFilter: skill,
      difficultyFilter: difficulty,
      requestedQuantity,
      effectiveLimit: result.effectiveLimit,
      sortOrder: result.sortOrder,
      sortField: result.sortField,
      titleNumber: slots.titleNumber,
      testNumber: slots.testNumber,
      action: slots.action,
    };
  }

  if (searchTerms.length > 0) {
    const termStr = searchTerms.join(' ').toLowerCase();
    
    const exactRows = result.rows.filter(r => normalizeText(r.title) === termStr);
    if (exactRows.length > 0) return { ...result, rows: limitContextRows(exactRows), searchTerms, exactTitleMatch: true, fuzzyTitleMatch: false, fallbackReason: null, lookupMissing: false, skillFilter: skill, difficultyFilter: difficulty, requestedQuantity, effectiveLimit: result.effectiveLimit, sortOrder: result.sortOrder, sortField: result.sortField, titleNumber: slots.titleNumber, testNumber: slots.testNumber, action: slots.action };

    const fuzzyRows = result.rows.filter(r => normalizeText(r.title).includes(termStr) || normalizeText(r.description || '').includes(termStr));
    if (fuzzyRows.length > 0) return { ...result, rows: limitContextRows(fuzzyRows), searchTerms, exactTitleMatch: false, fuzzyTitleMatch: true, fallbackReason: null, lookupMissing: false, skillFilter: skill, difficultyFilter: difficulty, requestedQuantity, effectiveLimit: result.effectiveLimit, sortOrder: result.sortOrder, sortField: result.sortField, titleNumber: slots.titleNumber, testNumber: slots.testNumber, action: slots.action };

    return { ...result, rows: limitContextRows(result.rows), searchTerms, exactTitleMatch: false, fuzzyTitleMatch: false, fallbackReason: 'no_exact_or_fuzzy_match', lookupMissing: false, skillFilter: skill, difficultyFilter: difficulty, requestedQuantity, effectiveLimit: result.effectiveLimit, sortOrder: result.sortOrder, sortField: result.sortField, titleNumber: slots.titleNumber, testNumber: slots.testNumber, action: slots.action };
  }

  return { ...result, rows: limitContextRows(result.rows), searchTerms, exactTitleMatch: false, fuzzyTitleMatch: false, fallbackReason: null, lookupMissing: false, skillFilter: skill, difficultyFilter: difficulty, requestedQuantity, effectiveLimit: result.effectiveLimit, sortOrder: result.sortOrder, sortField: result.sortField, titleNumber: slots.titleNumber, testNumber: slots.testNumber, action: slots.action };
};

const mapResourceRows = (rows) => rows.map((row) => ({
  type: 'library_resource',
  id: row.id,
  title: row.title,
  resourceType: row.resource_type,
  category: row.category || null,
  description: row.description,
  route: toFrontendUrl(buildLibraryRoute({ id: row.id })),
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
     LIMIT ${ASSISTANT_DB_LOOKUP_LIMIT}`,
    values
  );
  return { 
    rows: mapResourceRows(result.rows), 
    dbRowCount: result.rows.length,
    publishFilter, 
    selectedColumns
  };
};

const queryPublishedResources = async (message, context = {}) => {
  const resourceType = detectResourceType(message);
  const skillTerm = detectSkill(message);
  const searchTerms = [...new Set([...getSearchTerms({ message, context }), skillTerm].filter(Boolean))];
  
  const result = await runPublishedResourceQuery({ resourceType });
  const fallbackResult = async (fallbackReason) => {
    const suggestions = await runPublishedResourceQuery({});
    return {
      ...suggestions,
      rows: limitContextRows(suggestions.rows),
      searchTerms,
      exactTitleMatch: false,
      fuzzyTitleMatch: false,
      fallbackReason,
      lookupMissing: true,
      resourceTypeFilter: resourceType,
    };
  };

  if (result.rows.length === 0 && resourceType) {
    return fallbackResult('no_published_match_for_filter');
  }

  if (searchTerms.length > 0) {
    const termStr = searchTerms.join(' ').toLowerCase();
    
    const exactRows = result.rows.filter(r => normalizeText(r.title) === termStr);
    if (exactRows.length > 0) return { ...result, rows: limitContextRows(exactRows), searchTerms, exactTitleMatch: true, fuzzyTitleMatch: false, fallbackReason: null, lookupMissing: false, resourceTypeFilter: resourceType };

    const fuzzyRows = result.rows.filter(r => normalizeText(r.title).includes(termStr) || normalizeText(r.description || '').includes(termStr) || normalizeText(r.category || '').includes(termStr));
    if (fuzzyRows.length > 0) return { ...result, rows: limitContextRows(fuzzyRows), searchTerms, exactTitleMatch: false, fuzzyTitleMatch: true, fallbackReason: null, lookupMissing: false, resourceTypeFilter: resourceType };

    return { ...result, rows: limitContextRows(result.rows), searchTerms, exactTitleMatch: false, fuzzyTitleMatch: false, fallbackReason: 'no_exact_or_fuzzy_match', lookupMissing: true, resourceTypeFilter: resourceType };
  }
  
  return { ...result, rows: limitContextRows(result.rows), searchTerms, exactTitleMatch: false, fuzzyTitleMatch: false, fallbackReason: null, lookupMissing: false, resourceTypeFilter: resourceType };
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
  if (!user?.id || !sessionId) return [];
  const rows = await repository.getRecentMessages(user.id, sessionId, SESSION_MEMORY_LIMIT);
  return normalizeSessionMemory(rows);
};

const shouldLoadSessionMemory = (intent) => [
  ASSISTANT_INTENTS.IELTS_KNOWLEDGE,
  ASSISTANT_INTENTS.GENERAL_STUDY_TIPS,
  ASSISTANT_INTENTS.FIND_TEST,
  ASSISTANT_INTENTS.FIND_LESSON,
  ASSISTANT_INTENTS.POST_TEST_REVIEW,
].includes(intent);

const buildStaticContext = (injection, intent, message = '') => {
  if (intent === ASSISTANT_INTENTS.GREETING) return injection;
  if (intent === ASSISTANT_INTENTS.NAVIGATION) {
    const links = buildNavigationLinks(message);
    return {
      ...injection,
      directAnswer: buildNavigationResponse(message),
      finalResponseMode: 'immediate',
      databaseResults: links,
      suggestedLinks: links,
    };
  }
  return {
    ...injection,
    databaseResults: STUDY_TIPS.map((tip) => ({ type: 'study_tip', content: tip })),
  };
};

const buildFindTestContext = async ({ injection, message, context }) => {
  try {
    const data = await queryPublishedTests(message, context);
    const suggestedLinks = data.rows.length
      ? toTestLinks(data.rows)
      : [buildAssistantLink({ type: 'tests', label: 'Xem danh sach bai test' })];
    return {
      ...injection,
      databaseResults: data.rows,
      suggestedLinks,
      debug: { 
        queryTable: ASSISTANT_TABLE_MAP.mock_tests, 
        selectedColumns: data.selectedColumns,
        publishFilter: data.publishFilter,
        searchTerms: data.searchTerms,
        skillFilter: data.skillFilter,
        difficultyFilter: data.difficultyFilter,
        requestedQuantity: data.requestedQuantity,
        effectiveLimit: data.effectiveLimit,
        sortOrder: data.sortOrder,
        sortField: data.sortField,
        titleNumber: data.titleNumber,
        testNumber: data.testNumber,
        action: data.action,
        exactTitleMatch: data.exactTitleMatch || false,
        fuzzyTitleMatch: data.fuzzyTitleMatch || false,
        fallbackReason: data.fallbackReason,
        lookupMissing: Boolean(data.lookupMissing),
        resultTitles: data.rows.map(r => r.title),
        dbRowCount: data.dbRowCount,
        contextRowCount: data.rows.length,
        displayedRowCount: data.rows.length,
        contextLimit: ASSISTANT_CONTEXT_RESULT_LIMIT,
        contextLimitApplied: (data.dbRowCount || 0) > data.rows.length,
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
    const suggestedLinks = data.rows.length
      ? toLessonLinks(data.rows)
      : [buildAssistantLink({ type: 'library', label: 'Mo thu vien' })];
    return {
      ...injection,
      databaseResults: data.rows,
      suggestedLinks,
      debug: { 
        queryTable: ASSISTANT_TABLE_MAP.library_resources, 
        selectedColumns: data.selectedColumns,
        publishFilter: data.publishFilter,
        searchTerms: data.searchTerms,
        resourceTypeFilter: data.resourceTypeFilter,
        exactTitleMatch: data.exactTitleMatch || false,
        fuzzyTitleMatch: data.fuzzyTitleMatch || false,
        fallbackReason: data.fallbackReason,
        lookupMissing: Boolean(data.lookupMissing),
        resultTitles: data.rows.map(r => r.title),
        dbRowCount: data.dbRowCount,
        contextRowCount: data.rows.length,
        displayedRowCount: data.rows.length,
        contextLimit: ASSISTANT_CONTEXT_RESULT_LIMIT,
        contextLimitApplied: (data.dbRowCount || 0) > data.rows.length,
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
    if (!context.attemptId) {
      return {
        ...injection,
        directAnswer: 'Mình chưa biết bạn muốn review bài nào. Bạn hãy mở kết quả bài làm hoặc chọn một attempt trong lịch sử luyện tập.',
        finalResponseMode: 'clarification',
        debug: {
          queryTable: `${ASSISTANT_TABLE_MAP.test_attempts}/${ASSISTANT_TABLE_MAP.questions}/${ASSISTANT_TABLE_MAP.question_answers}`,
          attemptId: null,
          reviewMode: 'clarification',
          reviewFallbackReason: 'missing_attempt_id',
          rowCount: 0,
        },
      };
    }
    const attempt = await queryOwnedAttempt({ attemptId: context.attemptId, userId: user.id });
    if (!attempt) {
      return {
        ...injection,
        errorCode: ERROR_CODES.ATTEMPT_NOT_FOUND,
        debug: { attemptId: context.attemptId, reviewMode: 'attempt_lookup', reviewFallbackReason: 'attempt_not_found' },
      };
    }
    if (!attempt.submitted_at) {
      return {
        ...injection,
        errorCode: ERROR_CODES.ATTEMPT_NOT_SUBMITTED,
        debug: { attemptId: context.attemptId, reviewMode: 'attempt_lookup', reviewFallbackReason: 'attempt_not_submitted' },
      };
    }

    const rows = await queryAttemptQuestions({
      attemptId: attempt.id,
      questionId: context.questionId,
      message,
    });
    if (!rows.length) {
      return {
        ...injection,
        errorCode: ERROR_CODES.QUESTION_NOT_FOUND,
        debug: { attemptId: context.attemptId, reviewMode: 'question_lookup', reviewFallbackReason: 'question_not_found' },
      };
    }
    if (rows.some((row) => !row.explanation)) {
      return {
        ...injection,
        errorCode: ERROR_CODES.MISSING_EXPLANATION,
        debug: { attemptId: context.attemptId, reviewMode: 'question_lookup', reviewFallbackReason: 'missing_explanation' },
      };
    }
    const results = rows.map(buildReviewResult);
    return {
      ...injection,
      databaseResults: results,
      debug: { 
        queryTable: `${ASSISTANT_TABLE_MAP.test_attempts}/${ASSISTANT_TABLE_MAP.questions}/${ASSISTANT_TABLE_MAP.question_answers}`, 
        searchTerms: [], 
        attemptId: context.attemptId,
        reviewMode: 'question_explanation',
        reviewFallbackReason: null,
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
  directAnswer: 'Mình hỗ trợ IELTS, học tiếng Anh và cách sử dụng IELTSZone. Bạn có thể hỏi về test, lesson, study tips, navigation hoặc review đáp án sau khi nộp bài.',
});

const buildKnowledgeContext = ({ injection, message, intent }) => {
  try {
    const { knowledgeResults, knowledgeDebug } = retrieveKnowledge({ message });
    return {
      ...injection,
      knowledgeResults,
      knowledgeDebug,
      debug: {
        detectedIntent: intent,
        ...knowledgeDebug,
      },
    };
  } catch (error) {
    return {
      ...injection,
      knowledgeResults: [],
      knowledgeDebug: {
        strategy: 'static_keyword_metadata',
        detectedSkill: null,
        detectedQuestionType: null,
        detectedTopic: null,
        selectedKnowledgeChunkIds: [],
        retrievalScores: [],
        usedKnowledgeBase: false,
        noMatch: true,
        totalInjectedKnowledgeChars: 0,
        error: error.message,
      },
      debug: {
        detectedIntent: intent,
        usedKnowledgeBase: false,
        noMatch: true,
        knowledgeError: error.message,
      },
    };
  }
};

const buildContextInjection = async ({ intent, message, context, user, sessionId }) => {
  const sessionMemory = shouldLoadSessionMemory(intent)
    ? await getSessionMemory({ user, sessionId })
    : [];
  const injection = createBaseContext({ intent, sessionMemory });

  if ([ASSISTANT_INTENTS.NAVIGATION, ASSISTANT_INTENTS.WEBSITE_HELP].includes(intent)) {
    return buildStaticContext(injection, ASSISTANT_INTENTS.NAVIGATION, message);
  }
  if (intent === ASSISTANT_INTENTS.GENERAL_STUDY_TIPS) {
    return {
      ...injection,
      databaseResults: STUDY_TIPS.map((tip) => ({ type: 'study_tip', content: tip })),
    };
  }
  if (intent === ASSISTANT_INTENTS.IELTS_KNOWLEDGE) {
    return buildKnowledgeContext({ injection, message, intent });
  }
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
  clearColumnCacheForTests,
};
