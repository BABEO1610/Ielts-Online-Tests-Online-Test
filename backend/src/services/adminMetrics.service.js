const { pool } = require('../db/pool');
const AppError = require('../utils/AppError');

const TZ = 'Asia/Ho_Chi_Minh';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FEATURE_LABELS = {
  writing_grading: 'Chấm Writing (AI)',
  speaking_grading: 'Chấm Speaking (AI)',
  tutor_ai_reference: 'AI hỗ trợ Tutor',
  chatbot: 'Chatbot luyện thi',
  explain_with_ai: 'Explain with AI',
  unknown: 'Khác',
};

const assertDate = (value, name) => {
  if (!DATE_RE.test(String(value || ''))) {
    throw new AppError(`${name} must be YYYY-MM-DD`, 400, 'INVALID_DATE_RANGE');
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`${name} is invalid`, 400, 'INVALID_DATE_RANGE');
  }
  return String(value);
};

const defaultDateRange = (days = 30) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const now = new Date();
  const fromDate = new Date(now);
  fromDate.setUTCDate(fromDate.getUTCDate() - (days - 1));
  return { from: formatter.format(fromDate), to: formatter.format(now) };
};

const validateDateRange = ({ from, to }, defaultDays = 30) => {
  const defaults = defaultDateRange(defaultDays);
  const start = assertDate(from || defaults.from, 'from');
  const end = assertDate(to || defaults.to, 'to');
  if (start > end) throw new AppError('from must be before or equal to to', 400, 'INVALID_DATE_RANGE');
  const days = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000;
  if (days > 366) throw new AppError('Date range must be 366 days or less', 400, 'INVALID_DATE_RANGE');
  return { from: start, to: end };
};

const rangeSql = (column) =>
  `(${column} AT TIME ZONE '${TZ}')::date BETWEEN $1::date AND $2::date`;

const getOverview = async () => {
  const [usersRes, roleRes, testsRes, aiTodayRes, registrationsRes, activitiesRes] = await Promise.all([
    pool.query(`
      SELECT COUNT(*)::int AS total_users,
             COUNT(*) FILTER (WHERE status = 'active')::int AS active_users
      FROM users
    `),
    pool.query(`
      SELECT role::text AS role, COUNT(*)::int AS count
      FROM users
      GROUP BY role::text
    `),
    pool.query(`
      SELECT COUNT(*)::int AS open_tests
      FROM mock_tests
      WHERE is_published = TRUE
        AND (publish_at IS NULL OR publish_at <= NOW())
        AND (review_status IS NULL OR review_status = 'approved')
    `),
    pool.query(`
      SELECT COUNT(*)::int AS calls, COALESCE(SUM(total_tokens), 0)::int AS tokens
      FROM ai_usage_logs
      WHERE (created_at AT TIME ZONE '${TZ}')::date = (NOW() AT TIME ZONE '${TZ}')::date
    `),
    pool.query(`
      WITH days AS (
        SELECT generate_series(
          (NOW() AT TIME ZONE '${TZ}')::date - interval '6 days',
          (NOW() AT TIME ZONE '${TZ}')::date,
          interval '1 day'
        )::date AS day
      )
      SELECT days.day::text AS date, COUNT(users.id)::int AS users
      FROM days
      LEFT JOIN users ON (users.created_at AT TIME ZONE '${TZ}')::date = days.day
      GROUP BY days.day
      ORDER BY days.day
    `),
    pool.query(`
      SELECT audit_logs.id, audit_logs.created_at,
             COALESCE(actor.full_name, actor.email, 'System') AS actor,
             audit_logs.action::text AS action,
             COALESCE(target_user.email, audit_logs.target_id::text, audit_logs.target_table) AS target,
             CASE WHEN audit_logs.action::text IN ('login_failed', 'permission_denied')
               THEN 'suspicious' ELSE 'normal' END AS severity
      FROM audit_logs
      LEFT JOIN users actor ON actor.id = audit_logs.actor_id
      LEFT JOIN users target_user ON target_user.id = audit_logs.target_id
      ORDER BY audit_logs.created_at DESC
      LIMIT 5
    `),
  ]);

  const roleDistribution = { student: 0, tutor: 0, admin: 0 };
  roleRes.rows.forEach((row) => {
    if (Object.prototype.hasOwnProperty.call(roleDistribution, row.role)) {
      roleDistribution[row.role] = row.count;
    }
  });

  return {
    totalUsers: usersRes.rows[0]?.total_users || 0,
    activeUsers: usersRes.rows[0]?.active_users || 0,
    openTests: testsRes.rows[0]?.open_tests || 0,
    aiCallsToday: aiTodayRes.rows[0]?.calls || 0,
    aiTokensToday: aiTodayRes.rows[0]?.tokens || 0,
    roleDistribution,
    newRegistrationsByDay: registrationsRes.rows,
    recentActivities: activitiesRes.rows,
  };
};

const getReports = async (params = {}) => {
  const range = validateDateRange(params, 30);
  const dailyRes = await pool.query(`
    WITH days AS (
      SELECT generate_series($1::date, $2::date, interval '1 day')::date AS day
    ),
    new_users AS (
      SELECT (created_at AT TIME ZONE '${TZ}')::date AS day, COUNT(*)::int AS count
      FROM users WHERE ${rangeSql('created_at')} GROUP BY 1
    ),
    attempts AS (
      SELECT (submitted_at AT TIME ZONE '${TZ}')::date AS day, COUNT(*)::int AS count
      FROM test_attempts WHERE submitted_at IS NOT NULL AND ${rangeSql('submitted_at')} GROUP BY 1
    ),
    ai_calls AS (
      SELECT (created_at AT TIME ZONE '${TZ}')::date AS day,
             COUNT(*)::int AS calls,
             COALESCE(SUM(total_tokens), 0)::int AS tokens,
             COUNT(*) FILTER (WHERE success)::int AS success_calls,
             COUNT(*) FILTER (WHERE NOT success)::int AS failed_calls
      FROM ai_usage_logs WHERE ${rangeSql('created_at')} GROUP BY 1
    ),
    writing_submissions_by_day AS (
      SELECT (MIN(submitted_at) AT TIME ZONE '${TZ}')::date AS day, 1::int AS count
      FROM writing_submissions
      WHERE submitted_at IS NOT NULL AND ${rangeSql('submitted_at')}
      GROUP BY COALESCE(writing_group_id, id)
    ),
    speaking_submissions_by_day AS (
      SELECT (MIN(submitted_at) AT TIME ZONE '${TZ}')::date AS day, 1::int AS count
      FROM speaking_submissions
      WHERE submitted_at IS NOT NULL AND ${rangeSql('submitted_at')}
      GROUP BY COALESCE(speaking_group_id, id)
    ),
    submissions AS (
      SELECT day, SUM(count)::int AS count
      FROM (
        SELECT * FROM writing_submissions_by_day
        UNION ALL
        SELECT * FROM speaking_submissions_by_day
      ) s GROUP BY day
    )
    SELECT days.day::text AS date,
           COALESCE(new_users.count, 0)::int AS "newUsers",
           COALESCE(attempts.count, 0)::int AS attempts,
           COALESCE(ai_calls.calls, 0)::int AS "aiCalls",
           COALESCE(ai_calls.tokens, 0)::int AS "aiTokens",
           COALESCE(submissions.count, 0)::int AS submissions,
           COALESCE(ai_calls.success_calls, 0)::int AS "successAiCalls",
           COALESCE(ai_calls.failed_calls, 0)::int AS "failedAiCalls"
    FROM days
    LEFT JOIN new_users ON new_users.day = days.day
    LEFT JOIN attempts ON attempts.day = days.day
    LEFT JOIN ai_calls ON ai_calls.day = days.day
    LEFT JOIN submissions ON submissions.day = days.day
    ORDER BY days.day
  `, [range.from, range.to]);

  const summary = dailyRes.rows.reduce((acc, row) => ({
    newUsers: acc.newUsers + row.newUsers,
    attempts: acc.attempts + row.attempts,
    aiCalls: acc.aiCalls + row.aiCalls,
    aiTokens: acc.aiTokens + row.aiTokens,
    submissions: acc.submissions + row.submissions,
    successAiCalls: acc.successAiCalls + row.successAiCalls,
    failedAiCalls: acc.failedAiCalls + row.failedAiCalls,
  }), { newUsers: 0, attempts: 0, aiCalls: 0, aiTokens: 0, submissions: 0, successAiCalls: 0, failedAiCalls: 0 });

  return { range, summary, daily: dailyRes.rows };
};

const getAiUsage = async (params = {}) => {
  const range = validateDateRange(params, 30);
  const [summaryRes, byDayRes, byFeatureRes, topUsersRes] = await Promise.all([
    pool.query(`
      SELECT COUNT(*)::int AS "totalCalls",
             COALESCE(SUM(total_tokens), 0)::int AS "totalTokens",
             COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::int AS "aiUsers",
             COUNT(*) FILTER (WHERE success)::int AS "successCalls",
             COUNT(*) FILTER (WHERE NOT success)::int AS "failedCalls"
      FROM ai_usage_logs WHERE ${rangeSql('created_at')}
    `, [range.from, range.to]),
    pool.query(`
      WITH days AS (SELECT generate_series($1::date, $2::date, interval '1 day')::date AS day)
      SELECT days.day::text AS date, COUNT(logs.id)::int AS calls,
             COALESCE(SUM(logs.total_tokens), 0)::int AS tokens
      FROM days
      LEFT JOIN ai_usage_logs logs ON (logs.created_at AT TIME ZONE '${TZ}')::date = days.day
      GROUP BY days.day ORDER BY days.day
    `, [range.from, range.to]),
    pool.query(`
      SELECT feature, COUNT(*)::int AS calls, COALESCE(SUM(total_tokens), 0)::int AS tokens
      FROM ai_usage_logs WHERE ${rangeSql('created_at')}
      GROUP BY feature ORDER BY calls DESC
    `, [range.from, range.to]),
    pool.query(`
      SELECT logs.user_id AS "userId", COALESCE(users.full_name, users.email) AS name,
             users.email, COUNT(*)::int AS calls, COALESCE(SUM(logs.total_tokens), 0)::int AS tokens
      FROM ai_usage_logs logs
      JOIN users ON users.id = logs.user_id
      WHERE logs.user_id IS NOT NULL AND ${rangeSql('logs.created_at')}
      GROUP BY logs.user_id, users.full_name, users.email
      ORDER BY calls DESC, tokens DESC
      LIMIT 10
    `, [range.from, range.to]),
  ]);

  const summary = summaryRes.rows[0] || {};
  summary.totalCalls = summary.totalCalls || 0;
  summary.totalTokens = summary.totalTokens || 0;
  summary.aiUsers = summary.aiUsers || 0;
  summary.successCalls = summary.successCalls || 0;
  summary.failedCalls = summary.failedCalls || 0;
  summary.avgTokensPerCall = summary.totalCalls > 0 ? Math.round(summary.totalTokens / summary.totalCalls) : 0;

  return {
    range,
    summary,
    byDay: byDayRes.rows,
    byFeature: byFeatureRes.rows.map((row) => ({
      feature: row.feature,
      label: FEATURE_LABELS[row.feature] || FEATURE_LABELS.unknown,
      calls: row.calls,
      tokens: row.tokens,
      percentage: summary.totalCalls > 0 ? Math.round((row.calls / summary.totalCalls) * 10000) / 100 : 0,
    })),
    topUsers: topUsersRes.rows.map((row) => ({
      ...row,
      avgTokensPerCall: row.calls > 0 ? Math.round(row.tokens / row.calls) : 0,
    })),
  };
};

module.exports = {
  validateDateRange,
  getOverview,
  getReports,
  getAiUsage,
};
