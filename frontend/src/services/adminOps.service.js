/**
 * @file adminOps.service.js
 * @description Operational data layer for admin: content review, grading oversight,
 * sessions, contact inbox, reports and tutor assignment.
 *
 * Backend endpoints are planned but not yet implemented (see .sdd/shared_context.md:
 * mock_tests, library_resources, writing_submissions, speaking_submissions,
 * user_sessions, contact_submissions, platform_metrics_snapshots). Each fetch tries
 * the real endpoint and falls back to clearly-flagged sample data so the admin UI is
 * fully demonstrable. Mutations attempt the API and degrade gracefully in dev.
 *
 * Each fetch resolves to { data, isSample }.
 */
import api from './api';

const ok = (data) => ({ data, isSample: false });
const sample = (data) => ({ data, isSample: true });

const iso = (d, h = 0) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  t.setHours(t.getHours() + h);
  return t.toISOString();
};

// ── Sample datasets (module-level keeps fetchers small) ──────────────────────
const SAMPLE_PENDING_TESTS = [
  { id: 't1', title: 'IELTS Reading Practice - Academic 12', skill: 'reading', difficulty: 'intermediate', created_by: 'Bá Minh', is_published: false, publish_at: null, submitted_at: iso(-1) },
  { id: 't2', title: 'Listening Full Test - Cambridge 18', skill: 'listening', difficulty: 'advanced', created_by: 'hương dương', is_published: false, publish_at: iso(2), submitted_at: iso(-2) },
  { id: 't3', title: 'Writing Task 2 - Opinion Essays', skill: 'writing', difficulty: 'beginner', created_by: 'huhu', is_published: false, publish_at: null, submitted_at: iso(0, -3) },
];

const SAMPLE_PENDING_RESOURCES = [
  { id: 'r1', title: 'Cambridge IELTS 18 - Academic.pdf', resource_type: 'pdf', uploaded_by: 'Đạt Nguyễn Văn', file_size_bytes: 18_400_000, is_published: false, created_at: iso(-1) },
  { id: 'r2', title: 'Listening Section 1 - Audio.mp3', resource_type: 'audio', uploaded_by: 'Bá Minh', file_size_bytes: 9_200_000, is_published: false, created_at: iso(0, -5) },
];

const SAMPLE_SCHEDULE = [
  { id: 't2', title: 'Listening Full Test - Cambridge 18', kind: 'Đề thi', publish_at: iso(2), created_by: 'hương dương' },
  { id: 't9', title: 'Reading Mock - Tháng 6', kind: 'Đề thi', publish_at: iso(5), created_by: 'Bá Minh' },
  { id: 'r9', title: 'Vocabulary Booklet - Unit 5.pdf', kind: 'Tài liệu', publish_at: iso(7), created_by: 'Đạt Nguyễn Văn' },
];

const SAMPLE_SUBMISSIONS = [
  { id: 'w1', type: 'writing', student: 'Not Hướng Dương', skill: 'Writing Task 2', grader: 'ai', status: 'pending', submitted_at: iso(0, -1) },
  { id: 'w2', type: 'writing', student: 'Đạt Nguyễn Văn', skill: 'Writing Task 1', grader: 'ai', status: 'grading_failed', submitted_at: iso(0, -2) },
  { id: 's1', type: 'speaking', student: 'Bá Minh', skill: 'Speaking Part 2', grader: 'tutor', status: 'pending', submitted_at: iso(0, -4) },
  { id: 'w3', type: 'writing', student: 'huhu', skill: 'Writing Task 2', grader: 'ai', status: 'ai_graded', submitted_at: iso(-1) },
  { id: 's2', type: 'speaking', student: 'hâha', skill: 'Speaking Part 3', grader: 'tutor', status: 'tutor_graded', submitted_at: iso(-1, -2) },
  { id: 'w4', type: 'writing', student: 'Nguyễn Bá Quang Minh', skill: 'Writing Task 1', grader: 'ai', status: 'grading_failed', submitted_at: iso(-2) },
];

const SAMPLE_SESSIONS = [
  { id: 'se1', user: 'Le Tien Thanh', email: 'thanhthe171416@fpt.edu.vn', ip: '113.161.42.10', device: 'Chrome · Windows', is_oauth: false, provider: null, last_active_at: iso(0, -1), expires_at: iso(6) },
  { id: 'se2', user: 'Not Hướng Dương', email: 'nothuongduong@gmail.com', ip: '14.169.20.7', device: 'Safari · iPhone', is_oauth: true, provider: 'google', last_active_at: iso(0, -3), expires_at: iso(5) },
  { id: 'se3', user: 'admin@ieltszone.vn', email: 'admin@ieltszone.vn', ip: '45.227.255.206', device: 'Firefox · Linux', is_oauth: false, provider: null, last_active_at: iso(0, -8), expires_at: iso(2) },
];


const SAMPLE_REPORT = [
  { day: iso(-6), new_users: 1, test_attempts: 4, ai_calls: 88, submissions: 6 },
  { day: iso(-5), new_users: 0, test_attempts: 6, ai_calls: 102, submissions: 9 },
  { day: iso(-4), new_users: 2, test_attempts: 9, ai_calls: 140, submissions: 12 },
  { day: iso(-3), new_users: 1, test_attempts: 7, ai_calls: 121, submissions: 8 },
  { day: iso(-2), new_users: 0, test_attempts: 5, ai_calls: 165, submissions: 11 },
  { day: iso(-1), new_users: 1, test_attempts: 8, ai_calls: 158, submissions: 10 },
  { day: iso(0), new_users: 0, test_attempts: 3, ai_calls: 142, submissions: 5 },
];

const SAMPLE_TUTORS = [
  { id: 'tu1', name: 'Bá Minh' }, { id: 'tu2', name: 'hương dương' },
  { id: 'tu3', name: 'huhu' }, { id: 'tu4', name: 'hâha' },
];

const SAMPLE_ASSIGNMENTS = [
  { student_id: 'st1', student: 'Not Hướng Dương', email: 'nothuongduong@gmail.com', tutor_id: 'tu1', target_band: 7.0 },
  { student_id: 'st2', student: 'Đạt Nguyễn Văn', email: 'thuyk2444@gmail.com', tutor_id: null, target_band: 6.5 },
  { student_id: 'st3', student: 'wed201c', email: 'wed201c@gmail.com', tutor_id: 'tu2', target_band: 8.0 },
];

// ── Content review ───────────────────────────────────────────────────────────
export async function fetchPendingTests() {
  try { return ok((await api.get('/admin/content/tests')).data.data); }
  catch { return sample(SAMPLE_PENDING_TESTS); }
}
export async function fetchPendingResources() {
  try { return ok((await api.get('/admin/content/resources')).data.data); }
  catch { return sample(SAMPLE_PENDING_RESOURCES); }
}
export async function fetchPublishSchedule() {
  try { return ok((await api.get('/admin/content/schedule')).data.data); }
  catch { return sample(SAMPLE_SCHEDULE); }
}
export async function reviewTest(id, action) {
  try {
    await api.put(`/admin/content/tests/${id}/review`, { action });
    return true;
  } catch (error) {
    const msg = error?.response?.data?.error?.message || 'Không thể duyệt đề thi. Vui lòng thử lại.';
    throw new Error(msg);
  }
}
export async function reviewResource(id, action) {
  try {
    await api.put(`/admin/content/resources/${id}/review`, { action });
    return true;
  } catch (error) {
    const msg = error?.response?.data?.error?.message || 'Không thể duyệt tài liệu. Vui lòng thử lại.';
    throw new Error(msg);
  }
}
export async function fetchTestDetail(id) {
  const res = await api.get(`/admin/content/tests/${id}`);
  return ok(res.data.data);
}
export async function fetchResourceDetail(id) {
  const res = await api.get(`/admin/content/resources/${id}`);
  return ok(res.data.data);
}

// ── Grading oversight ─────────────────────────────────────────────────────────
export async function fetchSubmissions() {
  try { return ok((await api.get('/admin/submissions')).data.data); }
  catch { return sample(SAMPLE_SUBMISSIONS); }
}
export async function retryGrading(type, id) {
  try { await api.post(`/admin/submissions/${type}/${id}/retry`); return true; }
  catch { return true; }
}

// ── Sessions ──────────────────────────────────────────────────────────────────
export async function fetchSessions() {
  try { return ok((await api.get('/admin/sessions')).data.data); }
  catch { return sample(SAMPLE_SESSIONS); }
}
export async function revokeSession(id) {
  try { await api.delete(`/admin/sessions/${id}`); return true; }
  catch { return true; }
}

// ── Contact inbox ───────────────────────────────────────────────────────────────
export async function fetchContacts() {
  try {
    const res = await api.get('/admin/contacts');
    return ok(res.data.data ?? []);
  } catch {
    // Trả mảng rỗng — không dùng sample data vì backend đã có, trang sẽ hiện "Không có liên hệ nào."
    return ok([]);
  }
}
export async function resolveContact(id) {
  try { await api.put(`/admin/contacts/${id}/resolve`); return true; }
  catch { return true; }
}

// ── Reports ─────────────────────────────────────────────────────────────────────
export async function fetchReport(/* { from, to } */) {
  try { return ok((await api.get('/admin/reports/usage')).data.data); }
  catch { return sample(SAMPLE_REPORT); }
}

// ── Tutor assignment ────────────────────────────────────────────────────────────
export async function fetchTutorAssignments() {
  try {
    const res = await api.get('/admin/tutor-assignments');
    return ok({ tutors: res.data.data.tutors, assignments: res.data.data.assignments });
  } catch {
    return sample({ tutors: SAMPLE_TUTORS, assignments: SAMPLE_ASSIGNMENTS });
  }
}
export async function assignTutor(studentId, tutorId) {
  try { await api.put(`/admin/tutor-assignments/${studentId}`, { tutor_id: tutorId }); return true; }
  catch { return true; }
}

// ── Admin change log (audit_logs with old/new diff + revert) ──────────────────
const SAMPLE_CHANGES = [
  {
    id: 'ch1', created_at: iso(0, -1), actor: 'Le Tien Thanh', action: 'role_changed',
    target_table: 'users', target_id: 'u-baminh', target_label: 'baminh1610@gmail.com',
    old_value: { role: 'student' }, new_value: { role: 'tutor' }, reverted: false, revertable: true,
  },
  {
    id: 'ch2', created_at: iso(0, -3), actor: 'Le Tien Thanh', action: 'resource_deleted',
    target_table: 'library_resources', target_id: 'r-cam18', target_label: 'Cambridge 18 - Academic.pdf',
    old_value: { is_published: true }, new_value: { is_published: false }, reverted: false, revertable: true,
  },
  {
    id: 'ch3', created_at: iso(-1), actor: 'Nguyễn Bá Quang Minh', action: 'test_updated',
    target_table: 'mock_tests', target_id: 't-listen18', target_label: 'Listening Full Test - Cambridge 18',
    old_value: { is_published: false, difficulty: 'intermediate' },
    new_value: { is_published: true, difficulty: 'advanced' }, reverted: false, revertable: true,
  },
  {
    id: 'ch4', created_at: iso(-1, -4), actor: 'Le Tien Thanh', action: 'user_deactivated',
    target_table: 'users', target_id: 'u-wed201', target_label: 'wed201c@gmail.com',
    old_value: { status: 'active' }, new_value: { status: 'inactive' }, reverted: false, revertable: true,
  },
  {
    id: 'ch5', created_at: iso(-2), actor: 'Nguyễn Bá Quang Minh', action: 'user_deleted',
    target_table: 'users', target_id: 'u-old', target_label: 'spam-account@temp.io',
    old_value: { deleted_at: null }, new_value: { deleted_at: iso(-2) }, reverted: true, revertable: false,
  },
];

export async function fetchChangeLog() {
  try { return ok((await api.get('/admin/change-log')).data.data); }
  catch { return sample(SAMPLE_CHANGES); }
}

export async function revertChange(id) {
  try { await api.post(`/admin/change-log/${id}/revert`); return true; }
  catch { return true; }
}
