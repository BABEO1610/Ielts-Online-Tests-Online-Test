/**
 * @file adminStats.service.js
 * @description Data layer for the Admin dashboard (overview, activity logs, AI usage).
 *
 * The backend currently only exposes /admin/users. Endpoints for platform metrics,
 * audit logs and AI usage are planned (see .sdd/shared_context.md: audit_logs,
 * platform_metrics_snapshots, chatbot_messages, ai_explain_requests). Until they
 * ship, each fetch attempts the real endpoint and falls back to clearly-flagged
 * sample data so the UI is fully demonstrable in development.
 *
 * Each function resolves to { data, isSample } so the UI can show a "demo data" note.
 */
import api from './api';

const ok = (data) => ({ data, isSample: false });
const sample = (data) => ({ data, isSample: true });

/** Overview metrics: totals + role/status breakdown. */
export async function fetchOverview() {
  try {
    const res = await api.get('/admin/metrics/overview');
    return ok(res.data.data);
  } catch {
    return sample({
      totals: {
        users: 13,
        activeUsers: 10,
        pendingUsers: 1,
        bannedUsers: 0,
        activeTests: 8,
        aiCallsToday: 142,
        aiTokensToday: 86400,
        newRegistrations7d: 5,
      },
      roleBreakdown: [
        { name: 'Student', value: 6 },
        { name: 'Tutor', value: 5 },
        { name: 'Admin', value: 2 },
      ],
      registrationsTrend: [
        { day: 'T2', users: 1 }, { day: 'T3', users: 0 }, { day: 'T4', users: 2 },
        { day: 'T5', users: 1 }, { day: 'T6', users: 0 }, { day: 'T7', users: 1 },
        { day: 'CN', users: 0 },
      ],
    });
  }
}

/** Activity logs (audit_logs). Returns normal + suspicious actions. */
export async function fetchActivityLogs(params = {}) {
  try {
    const qs = new URLSearchParams(params).toString();
    const res = await api.get(`/admin/audit-logs?${qs}`);
    return ok({ rows: res.data.data, total: res.data.meta?.total ?? res.data.data.length });
  } catch {
    const rows = [
      { id: 's1', created_at: daysAgo(0, 9), actor: 'Le Tien Thanh', action: 'role_changed', target: 'baminh1610@gmail.com', ip: '113.161.42.10', severity: 'normal' },
      { id: 's2', created_at: daysAgo(0, 7), actor: 'Nguyễn Bá Quang Minh', action: 'user_deactivated', target: 'wed201c@gmail.com', ip: '113.161.42.10', severity: 'normal' },
      { id: 's3', created_at: daysAgo(0, 4), actor: '—', action: 'login_failed', target: 'admin@ieltszone.vn', ip: '45.227.255.206', severity: 'suspicious', reason: '6 lần đăng nhập sai liên tiếp' },
      { id: 's4', created_at: daysAgo(1, 2), actor: 'huhu', action: 'login', target: 'huhu', ip: '171.250.10.4', severity: 'normal' },
      { id: 's5', created_at: daysAgo(1, 1), actor: '—', action: 'login_failed', target: 'tutor1@ieltszone.vn', ip: '193.32.162.91', severity: 'suspicious', reason: 'IP lạ — khác quốc gia thường dùng' },
      { id: 's6', created_at: daysAgo(2, 5), actor: 'Bá Minh', action: 'password_changed', target: 'baminh161006@gmail.com', ip: '113.161.42.10', severity: 'normal' },
      { id: 's7', created_at: daysAgo(2, 3), actor: 'Đạt Nguyễn Văn', action: 'resource_uploaded', target: 'Cambridge 18 - Test 2.pdf', ip: '14.169.20.7', severity: 'normal' },
      { id: 's8', created_at: daysAgo(3, 8), actor: '—', action: 'login_failed', target: 'admin@ieltszone.vn', ip: '102.89.45.12', severity: 'suspicious', reason: 'Tài khoản bị khóa tạm thời 15 phút' },
    ];
    const onlySuspicious = params.severity === 'suspicious';
    const filtered = onlySuspicious ? rows.filter(r => r.severity === 'suspicious') : rows;
    return sample({ rows: filtered, total: filtered.length });
  }
}

/** AI usage statistics (chatbot_messages, ai_explain_requests, ai_feedback_reports). */
export async function fetchAiUsage() {
  try {
    const res = await api.get('/admin/metrics/ai-usage');
    return ok(res.data.data);
  } catch {
    return sample({
      totals: { calls30d: 3120, tokens30d: 1894000, activeUsers30d: 42, avgTokensPerCall: 607 },
      byFeature: [
        { feature: 'Chấm Writing (AI)', calls: 1240, tokens: 982000, share: 52 },
        { feature: 'Chấm Speaking (AI)', calls: 620, tokens: 540000, share: 28 },
        { feature: 'Chatbot luyện thi', calls: 980, tokens: 286000, share: 15 },
        { feature: 'Explain with AI', calls: 280, tokens: 86000, share: 5 },
      ],
      trend: [
        { day: '01', calls: 88 }, { day: '05', calls: 102 }, { day: '10', calls: 140 },
        { day: '15', calls: 121 }, { day: '20', calls: 165 }, { day: '25', calls: 158 },
        { day: '30', calls: 142 },
      ],
      topUsers: [
        { name: 'Đạt Nguyễn Văn', email: 'thuyk2444@gmail.com', calls: 210, tokens: 142000 },
        { name: 'Not Hướng Dương', email: 'nothuongduong@gmail.com', calls: 168, tokens: 119500 },
        { name: 'Bá Minh', email: 'baminh161006@gmail.com', calls: 134, tokens: 88200 },
      ],
    });
  }
}

function daysAgo(d, hoursAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - d);
  date.setHours(date.getHours() - hoursAgo);
  return date.toISOString();
}
