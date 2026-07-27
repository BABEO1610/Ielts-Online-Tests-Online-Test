/**
 * ==========================================
 * TẦNG 5: LƯU TRỮ & PHẢN HỒI (Repository & SSE)
 * ==========================================
 * Nhiệm vụ: Truy xuất cơ sở dữ liệu PostgreSQL (lấy lịch sử chat, lưu đánh giá), 
 * tách biệt hoàn toàn việc chọc vào DB khỏi logic nghiệp vụ.
 */

const { pool } = require('../../db/pool');
const {
  ERROR_CODES,
  SUBMITTED_ATTEMPT_STATUSES,
} = require('./assistant.constants');

const columnCache = new Map();
const FRONTEND_BASE_URL = (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
const SKILL_ROUTES = {
  reading: '/reading',
  writing: '/writing',
  speaking: '/speaking',
};

const quoteIdent = (identifier) => `"${String(identifier).replace(/"/g, '""')}"`;
const toFrontendUrl = (path) => `${FRONTEND_BASE_URL}${path}`;
const getSkillRoute = (skill) => SKILL_ROUTES[String(skill || '').toLowerCase()] || '/reading';

const getTableColumns = async (tableName) => {
  if (columnCache.has(tableName)) {
    return columnCache.get(tableName);
  }

  try {
    const result = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      [tableName]
    );
    const columns = new Set(result.rows.map((row) => row.column_name));
    columnCache.set(tableName, columns);
    return columns;
  } catch (error) {
    console.warn(`[AssistantRepository] Cannot inspect table ${tableName}:`, error.message);
    const columns = new Set();
    columnCache.set(tableName, columns);
    return columns;
  }
};

const hasTable = async (tableName) => {
  const columns = await getTableColumns(tableName);
  return columns.size > 0;
};

const pickColumn = (columns, candidates) => candidates.find((candidate) => columns.has(candidate)) || null;

const safeJsonParse = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalize = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

const extractTerms = (message) => {
  const stopWords = new Set([
    'ielts',
    'test',
    'lesson',
    'reading',
    'listening',
    'writing',
    'speaking',
    'topic',
    'skill',
    'level',
    'bai',
    'hoc',
    'tim',
    'de',
    'co',
    'khong',
    'giup',
    'em',
    'minh',
  ]);

  return normalize(message)
    .split(/[^a-z0-9]+/g)
    .filter((term) => term.length >= 3 && !stopWords.has(term))
    .slice(0, 5);
};

const detectSkill = (message) => {
  const text = normalize(message);
  const skills = ['reading', 'listening', 'writing', 'speaking'];
  return skills.find((skill) => text.includes(skill)) || null;
};

const detectDifficulty = (message) => {
  const text = normalize(message);
  if (/\b(beginner|basic|easy|de|co ban)\b/.test(text)) return 'beginner';
  if (/\b(intermediate|medium|trung binh)\b/.test(text)) return 'intermediate';
  if (/\b(advanced|hard|kho|nang cao)\b/.test(text)) return 'advanced';
  return null;
};

const extractQuestionOrder = (message) => {
  const text = normalize(message);
  const match = text.match(/\b(?:cau|question|q)\s*(\d{1,3})\b/) || text.match(/\b(\d{1,3})\b/);
  return match ? Number(match[1]) : null;
};

const isSubmittedAttempt = (attempt, columns) => {
  const statusColumn = pickColumn(columns, ['status', 'attempt_status', 'state']);
  if (statusColumn && attempt[statusColumn]) {
    return SUBMITTED_ATTEMPT_STATUSES.has(String(attempt[statusColumn]).toLowerCase());
  }

  const submittedAtColumn = pickColumn(columns, ['submitted_at', 'completed_at', 'finished_at']);
  return Boolean(submittedAtColumn && attempt[submittedAtColumn]);
};

const buildSearchCondition = ({ columns, fields, terms, values }) => {
  const searchableFields = fields.filter((field) => columns.has(field));
  if (searchableFields.length === 0 || terms.length === 0) {
    return null;
  }

  const perTermConditions = terms.map((term) => {
    const param = `$${values.length + 1}`;
    values.push(`%${term}%`);
    return `(${searchableFields.map((field) => `${quoteIdent(field)} ILIKE ${param}`).join(' OR ')})`;
  });

  return `(${perTermConditions.join(' AND ')})`;
};

const createOrGetSession = async (userId, requestedSessionId = null) => {
  const tableName = 'chatbot_sessions';
  const [columns, messageColumns] = await Promise.all([
    getTableColumns(tableName),
    getTableColumns('chatbot_messages'),
  ]);
  if (!columns.has('id')) return null;

  const userColumn = pickColumn(columns, ['user_id', 'student_id', 'created_by']);
  if (!userColumn) return null;

  try {
    const endedColumn = pickColumn(columns, ['ended_at', 'closed_at']);
    const activeClause = endedColumn ? `AND ${quoteIdent(endedColumn)} IS NULL` : '';
    if (requestedSessionId) {
      const requested = await pool.query(
        `SELECT id FROM ${quoteIdent(tableName)}
         WHERE id = $1 AND ${quoteIdent(userColumn)} = $2 ${activeClause}
         LIMIT 1`,
        [requestedSessionId, userId]
      );
      if (requested.rows[0]?.id) return requested.rows[0].id;
    }

    const orderColumn = pickColumn(columns, ['updated_at', 'started_at', 'created_at']);
    const messageSessionColumn = pickColumn(messageColumns, ['session_id', 'chatbot_session_id', 'conversation_id']);
    const messageCreatedColumn = pickColumn(messageColumns, ['created_at', 'sent_at', 'timestamp']);
    const activityOrder = messageSessionColumn && messageCreatedColumn
      ? `(SELECT MAX(activity.${quoteIdent(messageCreatedColumn)})
          FROM ${quoteIdent('chatbot_messages')} activity
          WHERE activity.${quoteIdent(messageSessionColumn)} = session_row.id)`
      : null;
    const orderParts = [
      activityOrder ? `${activityOrder} DESC NULLS LAST` : null,
      orderColumn ? `session_row.${quoteIdent(orderColumn)} DESC` : null,
      'session_row.id DESC',
    ].filter(Boolean);
    const qualifiedActiveClause = endedColumn
      ? `AND session_row.${quoteIdent(endedColumn)} IS NULL`
      : '';
    const existing = await pool.query(
      `SELECT session_row.id FROM ${quoteIdent(tableName)} session_row
       WHERE session_row.${quoteIdent(userColumn)} = $1
       ${qualifiedActiveClause}
       ORDER BY ${orderParts.join(', ')}
       LIMIT 1`,
      [userId]
    );

    if (existing.rows[0]?.id) {
      return existing.rows[0].id;
    }

    const insertColumns = [userColumn];
    const values = [userId];
    const titleColumn = pickColumn(columns, ['title', 'session_title', 'name']);
    if (titleColumn) {
      insertColumns.push(titleColumn);
      values.push('IELTS Assistant');
    }

    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    const result = await pool.query(
      `INSERT INTO ${quoteIdent(tableName)} (${insertColumns.map(quoteIdent).join(', ')})
       VALUES (${placeholders})
       RETURNING id`,
      values
    );

    return result.rows[0]?.id || null;
  } catch (error) {
    console.warn('[AssistantRepository] Chat session storage skipped:', error.message);
    return null;
  }
};

const saveMessage = async ({ sessionId, userId, role, message }) => {
  if (!sessionId || !userId || !message) return null;

  const tableName = 'chatbot_messages';
  const [columns, sessionColumns] = await Promise.all([
    getTableColumns(tableName),
    getTableColumns('chatbot_sessions'),
  ]);
  if (columns.size === 0 || !sessionColumns.has('id')) return null;

  const sessionColumn = pickColumn(columns, ['session_id', 'chatbot_session_id', 'conversation_id']);
  const contentColumn = pickColumn(columns, ['message', 'content', 'message_text', 'text', 'body']);
  const sessionUserColumn = pickColumn(sessionColumns, ['user_id', 'student_id', 'created_by']);
  if (!sessionColumn || !contentColumn || !sessionUserColumn) return null;

  const insertColumns = [sessionColumn, contentColumn];
  const selectValues = ['s.id', '$3'];
  const values = [sessionId, userId, message];

  const roleColumn = pickColumn(columns, ['role', 'sender', 'message_role']);
  if (roleColumn) {
    insertColumns.push(roleColumn);
    selectValues.push(`$${values.length + 1}`);
    values.push(role);
  }

  const userColumn = pickColumn(columns, ['user_id', 'student_id']);
  if (userColumn) {
    insertColumns.push(userColumn);
    selectValues.push('$2');
  }

  try {
    const endedColumn = pickColumn(sessionColumns, ['ended_at', 'closed_at']);
    const activeClause = endedColumn ? `AND s.${quoteIdent(endedColumn)} IS NULL` : '';
    const result = await pool.query(
      `INSERT INTO ${quoteIdent(tableName)} (${insertColumns.map(quoteIdent).join(', ')})
       SELECT ${selectValues.join(', ')}
       FROM ${quoteIdent('chatbot_sessions')} s
       WHERE s.id = $1 AND s.${quoteIdent(sessionUserColumn)} = $2 ${activeClause}
       RETURNING id`,
      values
    );
    return result.rows[0] || null;
  } catch (error) {
    console.warn('[AssistantRepository] Chat message storage skipped:', error.message);
    return null;
  }
};

const saveUserMessage = (sessionId, message, userId) =>
  saveMessage({ sessionId, userId, role: 'user', message });

const saveAssistantMessage = (sessionId, answer, userId) =>
  saveMessage({ sessionId, userId, role: 'assistant', message: answer });

const getRecentMessages = async (userId, sessionId, limit = 8) => {
  if (!sessionId) return [];

  const sessionColumns = await getTableColumns('chatbot_sessions');
  const messageColumns = await getTableColumns('chatbot_messages');
  if (!sessionColumns.has('id') || messageColumns.size === 0) return [];

  const userColumn = pickColumn(sessionColumns, ['user_id', 'student_id', 'created_by']);
  const sessionColumn = pickColumn(messageColumns, ['session_id', 'chatbot_session_id', 'conversation_id']);
  const contentColumn = pickColumn(messageColumns, ['message', 'content', 'message_text', 'text', 'body']);
  if (!userColumn || !sessionColumn || !contentColumn) return [];

  const roleColumn = pickColumn(messageColumns, ['role', 'sender', 'message_role']);
  const createdColumn = pickColumn(messageColumns, ['created_at', 'sent_at', 'timestamp']);
  const selectRole = roleColumn ? `m.${quoteIdent(roleColumn)} AS role` : `'assistant' AS role`;
  const selectCreated = createdColumn ? `m.${quoteIdent(createdColumn)} AS created_at` : 'NULL AS created_at';
  const orderClause = createdColumn
    ? `ORDER BY m.${quoteIdent(createdColumn)} DESC, m.id DESC`
    : 'ORDER BY m.id DESC';

  try {
    const result = await pool.query(
      `SELECT m.id, ${selectRole}, m.${quoteIdent(contentColumn)} AS content, ${selectCreated}
       FROM ${quoteIdent('chatbot_messages')} m
       INNER JOIN ${quoteIdent('chatbot_sessions')} s ON s.id = m.${quoteIdent(sessionColumn)}
       WHERE s.${quoteIdent(userColumn)} = $1 AND m.${quoteIdent(sessionColumn)} = $2
       ${orderClause}
       LIMIT $3`,
      [userId, sessionId, limit]
    );

    return result.rows
      .reverse()
      .map((row) => ({
        role: row.role || 'assistant',
        content: row.content || '',
        createdAt: row.created_at || null,
      }))
      .filter((row) => row.content);
  } catch (error) {
    console.warn('[AssistantRepository] Recent chat memory read skipped:', error.message);
    return [];
  }
};

const getHistory = async (userId, requestedSessionId = null) => {
  const sessionColumns = await getTableColumns('chatbot_sessions');
  const messageColumns = await getTableColumns('chatbot_messages');
  if (!sessionColumns.has('id') || messageColumns.size === 0) return [];

  const userColumn = pickColumn(sessionColumns, ['user_id', 'student_id', 'created_by']);
  const sessionColumn = pickColumn(messageColumns, ['session_id', 'chatbot_session_id', 'conversation_id']);
  const contentColumn = pickColumn(messageColumns, ['message', 'content', 'message_text', 'text', 'body']);
  if (!userColumn || !sessionColumn || !contentColumn) return [];

  const roleColumn = pickColumn(messageColumns, ['role', 'sender', 'message_role']);
  const createdColumn = pickColumn(messageColumns, ['created_at', 'sent_at', 'timestamp']);
  const endedColumn = pickColumn(sessionColumns, ['ended_at', 'closed_at']);
  const sessionOrderColumn = pickColumn(sessionColumns, ['updated_at', 'started_at', 'created_at']);
  const selectRole = roleColumn ? `m.${quoteIdent(roleColumn)} AS role` : `'assistant' AS role`;
  const selectCreated = createdColumn ? `m.${quoteIdent(createdColumn)} AS created_at` : 'NULL AS created_at';
  const innerOrderClause = createdColumn
    ? `ORDER BY m.${quoteIdent(createdColumn)} DESC, m.id DESC`
    : 'ORDER BY m.id DESC';
  const outerOrderClause = createdColumn
    ? 'ORDER BY recent.created_at ASC, recent.id ASC'
    : 'ORDER BY recent.id ASC';
  const targetActiveClause = endedColumn ? `AND target.${quoteIdent(endedColumn)} IS NULL` : '';
  const targetActivityJoin = createdColumn
    ? `LEFT JOIN ${quoteIdent('chatbot_messages')} activity
         ON activity.${quoteIdent(sessionColumn)} = target.id`
    : '';
  const targetGroupBy = sessionOrderColumn
    ? `GROUP BY target.id, target.${quoteIdent(sessionOrderColumn)}`
    : 'GROUP BY target.id';
  const targetOrderParts = [
    createdColumn ? `MAX(activity.${quoteIdent(createdColumn)}) DESC NULLS LAST` : null,
    sessionOrderColumn ? `target.${quoteIdent(sessionOrderColumn)} DESC` : null,
    'target.id DESC',
  ].filter(Boolean);

  try {
    const result = await pool.query(
      `WITH target_session AS (
         SELECT target.id
         FROM ${quoteIdent('chatbot_sessions')} target
         ${targetActivityJoin}
         WHERE target.${quoteIdent(userColumn)} = $1
           AND ($2::text IS NULL OR target.id::text = $2::text)
           ${targetActiveClause}
         ${targetGroupBy}
         ORDER BY ${targetOrderParts.join(', ')}
         LIMIT 1
       )
       SELECT *
       FROM (
         SELECT m.id,
                m.${quoteIdent(sessionColumn)} AS conversation_id,
                ${selectRole},
                m.${quoteIdent(contentColumn)} AS content,
                ${selectCreated}
         FROM ${quoteIdent('chatbot_messages')} m
         INNER JOIN target_session selected ON selected.id = m.${quoteIdent(sessionColumn)}
         ${innerOrderClause}
         LIMIT 100
       ) recent
       ${outerOrderClause}`,
      [userId, requestedSessionId || null]
    );
    return result.rows;
  } catch (error) {
    console.warn('[AssistantRepository] Chat history read skipped:', error.message);
    return [];
  }
};

const getSessionPreference = async (userId, sessionId) => {
  if (!userId || !sessionId) return { supported: false, preferredAddress: null };
  const tableName = 'chatbot_sessions';
  const columns = await getTableColumns(tableName);
  const userColumn = pickColumn(columns, ['user_id', 'student_id', 'created_by']);
  const preferenceColumn = pickColumn(columns, ['preferred_address', 'preferred_name']);
  if (!columns.has('id') || !userColumn || !preferenceColumn) {
    return { supported: false, preferredAddress: null };
  }

  try {
    const endedColumn = pickColumn(columns, ['ended_at', 'closed_at']);
    const activeClause = endedColumn ? `AND ${quoteIdent(endedColumn)} IS NULL` : '';
    const result = await pool.query(
      `SELECT ${quoteIdent(preferenceColumn)} AS preferred_address
       FROM ${quoteIdent(tableName)}
       WHERE id = $1 AND ${quoteIdent(userColumn)} = $2 ${activeClause}
       LIMIT 1`,
      [sessionId, userId]
    );
    return {
      supported: true,
      preferredAddress: result.rows[0]?.preferred_address || null,
    };
  } catch (error) {
    console.warn('[AssistantRepository] Session preference read skipped:', error.message);
    return { supported: false, preferredAddress: null };
  }
};

const setSessionPreference = async ({ userId, sessionId, preferredAddress }) => {
  if (!userId || !sessionId) return false;
  const tableName = 'chatbot_sessions';
  const columns = await getTableColumns(tableName);
  const userColumn = pickColumn(columns, ['user_id', 'student_id', 'created_by']);
  const preferenceColumn = pickColumn(columns, ['preferred_address', 'preferred_name']);
  if (!columns.has('id') || !userColumn || !preferenceColumn) return false;

  try {
    const endedColumn = pickColumn(columns, ['ended_at', 'closed_at']);
    const activeClause = endedColumn ? `AND ${quoteIdent(endedColumn)} IS NULL` : '';
    const result = await pool.query(
      `UPDATE ${quoteIdent(tableName)}
       SET ${quoteIdent(preferenceColumn)} = $3
       WHERE id = $1 AND ${quoteIdent(userColumn)} = $2 ${activeClause}
       RETURNING id`,
      [sessionId, userId, preferredAddress || null]
    );
    return Boolean(result.rows[0]?.id);
  } catch (error) {
    console.warn('[AssistantRepository] Session preference update skipped:', error.message);
    return false;
  }
};

const clearColumnCacheForTests = () => columnCache.clear();

const rateAssistantMessage = async ({ userId, messageId, rating, reason }) => {
  const sessionColumns = await getTableColumns('chatbot_sessions');
  const messageColumns = await getTableColumns('chatbot_messages');
  if (!sessionColumns.has('id') || messageColumns.size === 0) {
    return { saved: false, reason: 'schema_unavailable' };
  }

  const sessionUserColumn = pickColumn(sessionColumns, ['user_id', 'student_id', 'created_by']);
  const messageSessionColumn = pickColumn(messageColumns, ['session_id', 'chatbot_session_id', 'conversation_id']);
  const roleColumn = pickColumn(messageColumns, ['role', 'sender', 'message_role']);
  if (!sessionUserColumn || !messageSessionColumn) {
    return { saved: false, reason: 'ownership_columns_unavailable' };
  }

  const ratingColumn = pickColumn(messageColumns, ['rating', 'feedback_rating', 'user_rating']);
  const reasonColumn = pickColumn(messageColumns, ['rating_reason', 'feedback_reason', 'feedback_comment']);
  const updatedColumn = pickColumn(messageColumns, ['updated_at']);
  if (!ratingColumn) {
    return { saved: false, reason: 'rating_column_missing' };
  }

  const roleCondition = roleColumn ? `AND LOWER(COALESCE(m.${quoteIdent(roleColumn)}::text, '')) = 'assistant'` : '';
  const updateColumns = [`${quoteIdent(ratingColumn)} = $3`];
  const values = [messageId, userId, rating];

  if (reasonColumn) {
    values.push(reason || null);
    updateColumns.push(`${quoteIdent(reasonColumn)} = $${values.length}`);
  }
  if (updatedColumn) {
    updateColumns.push(`${quoteIdent(updatedColumn)} = NOW()`);
  }

  try {
    const result = await pool.query(
      `UPDATE ${quoteIdent('chatbot_messages')} m
       SET ${updateColumns.join(', ')}
       FROM ${quoteIdent('chatbot_sessions')} s
       WHERE m.id = $1
         AND s.id = m.${quoteIdent(messageSessionColumn)}
         AND s.${quoteIdent(sessionUserColumn)} = $2
         ${roleCondition}
       RETURNING m.id`,
      values
    );

    if (!result.rows[0]) {
      return { saved: false, reason: 'message_not_found_or_forbidden' };
    }

    return { saved: true, messageId: result.rows[0].id };
  } catch (error) {
    console.warn('[AssistantRepository] Rating storage skipped:', error.message);
    return { saved: false, reason: 'storage_error' };
  }
};

const findMockTests = async (message) => {
  const tableName = 'mock_tests';
  const columns = await getTableColumns(tableName);
  if (columns.size === 0) return [];

  const terms = extractTerms(message);
  const skill = detectSkill(message);
  const difficulty = detectDifficulty(message);
  const conditions = [];
  const values = [];

  if (columns.has('review_status')) {
    conditions.push("(review_status = 'approved' OR review_status IS NULL OR review_status = 'pending')");
  }
  if (skill && columns.has('skill')) {
    values.push(skill);
    conditions.push(`skill = $${values.length}`);
  }
  if (difficulty && columns.has('difficulty')) {
    values.push(difficulty);
    conditions.push(`difficulty = $${values.length}`);
  }

  const searchCondition = buildSearchCondition({
    columns,
    fields: ['title', 'description', 'difficulty', 'skill'],
    terms,
    values,
  });
  if (searchCondition) {
    conditions.push(searchCondition);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const selectColumns = ['id', 'title', 'description', 'skill', 'difficulty', 'duration_minutes']
    .filter((column) => columns.has(column))
    .map(quoteIdent)
    .join(', ');

  try {
    const result = await pool.query(
      `SELECT ${selectColumns || 'id'}
       FROM ${quoteIdent(tableName)}
       ${whereClause}
       ORDER BY ${columns.has('created_at') ? 'created_at' : 'id'} DESC
       LIMIT 5`,
      values
    );
    return result.rows.map((row) => ({
      type: 'test',
      id: row.id,
      title: row.title,
      description: row.description,
      skill: row.skill,
      difficulty: row.difficulty,
      durationMinutes: row.duration_minutes,
      link: toFrontendUrl(getSkillRoute(row.skill)),
    }));
  } catch (error) {
    console.warn('[AssistantRepository] Test search skipped:', error.message);
    return [];
  }
};

const findLibraryResources = async (message) => {
  const tableName = 'library_resources';
  const columns = await getTableColumns(tableName);
  if (columns.size === 0) return [];

  const terms = extractTerms(message);
  const skill = detectSkill(message);
  const conditions = [];
  const values = [];

  if (columns.has('is_published')) {
    conditions.push('is_published = TRUE');
  }
  if (columns.has('review_status')) {
    conditions.push("review_status = 'approved'");
  }
  if (skill && columns.has('category')) {
    values.push(`%${skill}%`);
    conditions.push(`category ILIKE $${values.length}`);
  }

  const searchCondition = buildSearchCondition({
    columns,
    fields: ['title', 'description', 'category', 'resource_type'],
    terms,
    values,
  });
  if (searchCondition) {
    conditions.push(searchCondition);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const selectColumns = ['id', 'title', 'description', 'category', 'resource_type']
    .filter((column) => columns.has(column))
    .map(quoteIdent)
    .join(', ');

  try {
    const result = await pool.query(
      `SELECT ${selectColumns || 'id'}
       FROM ${quoteIdent(tableName)}
       ${whereClause}
       ORDER BY ${columns.has('updated_at') ? 'updated_at' : 'id'} DESC
       LIMIT 5`,
      values
    );
    return result.rows.map((row) => ({
      type: 'lesson',
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      resourceType: row.resource_type,
      link: toFrontendUrl('/library'),
    }));
  } catch (error) {
    console.warn('[AssistantRepository] Library search skipped:', error.message);
    return [];
  }
};

const findQuestionSnippets = async (message) => {
  const questionColumns = await getTableColumns('questions');
  const testColumns = await getTableColumns('mock_tests');
  if (questionColumns.size === 0 || testColumns.size === 0) return [];

  const terms = extractTerms(message);
  const values = [];
  const conditions = [];

  const searchCondition = buildSearchCondition({
    columns: questionColumns,
    fields: ['question_text', 'explanation', 'correct_answer'],
    terms,
    values,
  });
  if (searchCondition) {
    conditions.push(searchCondition.replace(/"question_text"/g, 'q."question_text"').replace(/"explanation"/g, 'q."explanation"').replace(/"correct_answer"/g, 'q."correct_answer"'));
  }
  if (testColumns.has('is_published')) {
    conditions.push('mt.is_published = TRUE');
  }
  if (testColumns.has('review_status')) {
    conditions.push("mt.review_status = 'approved'");
  }
  if (conditions.length === 0) return [];

  try {
    const result = await pool.query(
      `SELECT q.id, q.question_order, q.question_text, q.explanation, mt.id AS test_id, mt.title AS test_title
       FROM questions q
       INNER JOIN mock_tests mt ON mt.id = q.test_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY q.question_order ASC
       LIMIT 5`,
      values
    );

    return result.rows.map((row) => ({
      type: 'question',
      id: row.id,
      title: `Question ${row.question_order} - ${row.test_title || 'IELTS test'}`,
      description: row.question_text,
      explanation: row.explanation,
      link: toFrontendUrl('/reading'),
    }));
  } catch (error) {
    console.warn('[AssistantRepository] Question search skipped:', error.message);
    return [];
  }
};

const findGeneralContent = async (message) => {
  const [tests, resources, questions] = await Promise.all([
    findMockTests(message),
    findLibraryResources(message),
    findQuestionSnippets(message),
  ]);

  return {
    tests,
    resources,
    questions,
    suggestedLinks: [...tests, ...resources, ...questions]
      .filter((item) => item.link)
      .slice(0, 5)
      .map((item) => ({
        label: item.title || item.type,
        href: item.link,
      })),
  };
};

const getSelectedAnswer = (attempt, question) => {
  const answerPayload =
    safeJsonParse(attempt.selected_answers) ||
    safeJsonParse(attempt.answers) ||
    safeJsonParse(attempt.responses) ||
    safeJsonParse(attempt.answer_data);

  if (!answerPayload || !question) return null;

  const keys = [
    question.id,
    String(question.id),
    question.question_order,
    String(question.question_order),
    `q${question.question_order}`,
    `question_${question.question_order}`,
  ];

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(answerPayload, key)) {
      return answerPayload[key];
    }
  }

  return null;
};

const getSupplementalQuestionAnswer = async (questionId) => {
  if (!questionId || !(await hasTable('question_answers'))) return null;

  const columns = await getTableColumns('question_answers');
  const questionColumn = pickColumn(columns, ['question_id', 'question_uuid']);
  if (!questionColumn) return null;

  const answerColumn = pickColumn(columns, ['correct_answer', 'answer', 'answer_text', 'content']);
  const explanationColumn = pickColumn(columns, ['explanation', 'explanation_content', 'rationale']);
  const evidenceColumn = pickColumn(columns, ['evidence', 'keywords', 'explanation_evidence']);

  const selectedColumns = ['id', questionColumn, answerColumn, explanationColumn, evidenceColumn]
    .filter(Boolean)
    .filter((column, index, array) => array.indexOf(column) === index)
    .map(quoteIdent)
    .join(', ');

  try {
    const result = await pool.query(
      `SELECT ${selectedColumns}
       FROM question_answers
       WHERE ${quoteIdent(questionColumn)} = $1
       LIMIT 1`,
      [questionId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.warn('[AssistantRepository] question_answers lookup skipped:', error.message);
    return null;
  }
};

const findQuestionForReview = async ({ testId, questionId, message }) => {
  const questionColumns = await getTableColumns('questions');
  if (questionColumns.size === 0) return null;

  const values = [testId];
  const conditions = ['test_id = $1'];

  if (questionId) {
    values.push(questionId);
    conditions.push(`id = $${values.length}`);
  } else {
    const order = extractQuestionOrder(message);
    if (!order) return null;
    values.push(order);
    conditions.push(`question_order = $${values.length}`);
  }

  try {
    const result = await pool.query(
      `SELECT *
       FROM questions
       WHERE ${conditions.join(' AND ')}
       LIMIT 1`,
      values
    );
    const question = result.rows[0] || null;
    if (!question) return null;

    const supplemental = await getSupplementalQuestionAnswer(question.id);
    if (supplemental) {
      const supplementalAnswer =
        supplemental.correct_answer ||
        supplemental.answer ||
        supplemental.answer_text ||
        supplemental.content;
      const supplementalExplanation =
        supplemental.explanation ||
        supplemental.explanation_content ||
        supplemental.rationale;

      return {
        ...question,
        correct_answer: question.correct_answer || supplementalAnswer,
        explanation: question.explanation || supplementalExplanation,
        evidence: supplemental.evidence || supplemental.keywords || supplemental.explanation_evidence || null,
      };
    }

    return question;
  } catch (error) {
    console.warn('[AssistantRepository] Review question lookup skipped:', error.message);
    return null;
  }
};

const findPassageForQuestion = async (question) => {
  if (!question) return null;

  try {
    if (question.block_id && (await hasTable('question_blocks'))) {
      const result = await pool.query(
        `SELECT tp.*
         FROM question_blocks qb
         INNER JOIN test_passages tp ON tp.id = qb.passage_id
         WHERE qb.id = $1
         LIMIT 1`,
        [question.block_id]
      );
      if (result.rows[0]) return result.rows[0];
    }

    const result = await pool.query(
      `SELECT *
       FROM test_passages
       WHERE test_id = $1
       ORDER BY passage_number ASC
       LIMIT 1`,
      [question.test_id]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.warn('[AssistantRepository] Passage lookup skipped:', error.message);
    return null;
  }
};

const getAttemptContext = async ({ userId, attemptId, questionId, message }) => {
  const tableName = 'test_attempts';
  const attemptColumns = await getTableColumns(tableName);
  if (attemptColumns.size === 0) {
    return { errorCode: ERROR_CODES.ATTEMPT_NOT_FOUND };
  }

  try {
    const attemptResult = await pool.query(
      `SELECT *
       FROM ${quoteIdent(tableName)}
       WHERE id = $1
       LIMIT 1`,
      [attemptId]
    );
    const attempt = attemptResult.rows[0];
    if (!attempt) {
      return { errorCode: ERROR_CODES.ATTEMPT_NOT_FOUND };
    }

    const ownerColumn = pickColumn(attemptColumns, ['user_id', 'student_id', 'created_by']);
    if (ownerColumn && String(attempt[ownerColumn]) !== String(userId)) {
      return { errorCode: ERROR_CODES.FORBIDDEN };
    }

    if (!isSubmittedAttempt(attempt, attemptColumns)) {
      return { errorCode: ERROR_CODES.ATTEMPT_NOT_SUBMITTED };
    }

    const testIdColumn = pickColumn(attemptColumns, ['test_id', 'mock_test_id']);
    const testId = testIdColumn ? attempt[testIdColumn] : null;
    if (!testId) {
      return { errorCode: ERROR_CODES.MISSING_CONTEXT };
    }

    const question = await findQuestionForReview({ testId, questionId, message });
    if (!question) {
      return { errorCode: questionId ? ERROR_CODES.QUESTION_NOT_FOUND : ERROR_CODES.MISSING_CONTEXT };
    }

    const passage = await findPassageForQuestion(question);
    const selectedAnswer = getSelectedAnswer(attempt, question);
    const correctAnswer = question.correct_answer || question.correct_answers || null;
    const explanation = question.explanation || question.evidence || null;

    return {
      attempt,
      question,
      selectedAnswer,
      correctAnswer,
      explanation,
      passage,
    };
  } catch (error) {
    console.warn('[AssistantRepository] Attempt context lookup failed:', error.message);
    return { errorCode: ERROR_CODES.INTERNAL_ERROR };
  }
};

module.exports = {
  createOrGetSession,
  saveUserMessage,
  saveAssistantMessage,
  getRecentMessages,
  getSessionPreference,
  setSessionPreference,
  getHistory,
  findGeneralContent,
  getAttemptContext,
  rateAssistantMessage,
  clearColumnCacheForTests,
};
