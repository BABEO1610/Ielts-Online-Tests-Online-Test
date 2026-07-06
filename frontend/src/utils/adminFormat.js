/**
 * @file adminFormat.js
 * @description Formatting helpers shared across admin views (numbers, dates, labels).
 */

/** Group thousands with a dot separator (vi-VN). */
export const formatNumber = (n) =>
  typeof n === 'number' ? n.toLocaleString('vi-VN') : (n ?? '—');

/** Locale date-time string, safe against null. */
export const formatDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';

/** Short date only. */
export const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('vi-VN') : '—';

/** Human-readable file size from bytes. */
export const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

/** Map audit log_action enum values to Vietnamese labels. */
const ACTION_LABELS = {
  user_created: 'Tạo người dùng',
  user_updated: 'Cập nhật người dùng',
  role_changed: 'Đổi vai trò',
  user_deactivated: 'Vô hiệu hoá tài khoản',
  user_deleted: 'Xoá người dùng',
  test_created: 'Tạo đề thi',
  test_updated: 'Sửa đề thi',
  test_deleted: 'Xoá đề thi',
  test_reviewed: 'Duyệt đề thi',
  answer_key_updated: 'Cập nhật đáp án',
  resource_uploaded: 'Tải tài liệu lên',
  resource_deleted: 'Xoá tài liệu',
  resource_reviewed: 'Duyệt tài liệu',
  login: 'Đăng nhập',
  logout: 'Đăng xuất',
  login_failed: 'Đăng nhập thất bại',
  password_changed: 'Đổi mật khẩu',
  password_changed_by_admin: 'Đổi mật khẩu (Admin)',
  password_reset_requested: 'Yêu cầu đặt lại mật khẩu',
  oauth_linked: 'Liên kết OAuth',
  oauth_unlinked: 'Huỷ liên kết OAuth',
  change_reverted: 'Hoàn tác thay đổi',
  account_locked: 'Khoá tài khoản',
  permission_denied: 'Từ chối truy cập',
  submission_graded: 'Công bố điểm',
  submission_drafted: 'Lưu nháp',
  private_note_added: 'Ghi chú riêng',
  submission_revoked: 'Thu hồi kết quả',
  submission_regraded: 'Sửa kết quả chấm',
  tutor_assigned: 'Phân công giảng viên',
};

export const actionLabel = (action) => ACTION_LABELS[action] || action;

/**
 * Map tên cột DB (audit log old_value/new_value keys) sang nhãn tiếng Việt.
 * Dùng trong diffValues() để hiển thị modal chi tiết có nghĩa.
 */
const FIELD_LABELS = {
  tutor_id:        'ID giảng viên',
  tutor_name:      'Giảng viên phụ trách',
  tutor_email:     'Email giảng viên',
  student_name:    'Học sinh',
  student_email:   'Email học sinh',
  submission_type: 'Loại bài',
  role:            'Vai trò',
  status:          'Trạng thái',
  email:           'Email',
  full_name:       'Họ tên',
  title:           'Tiêu đề',
  file_name:       'Tên tệp',
  reason:          'Lý do',
  reverted_log_id: 'ID log gốc',
};

/** Bootstrap/pill modifier for a user role. */
export const rolePill = (role) =>
  ({ admin: 'pill--admin', tutor: 'pill--tutor', student: 'pill--student' }[role] || 'pill--neutral');

/** Pill modifier for an account status. */
export const statusPill = (status) =>
  ({ active: 'pill--success', pending: 'pill--warning', inactive: 'pill--neutral', banned: 'pill--danger' }[status] || 'pill--neutral');

/**
 * Diff two flat objects (old_value vs new_value from audit_logs).
 * Sử dụng FIELD_LABELS để đổi tên cột DB thành nhãn tiếng Việt.
 * @returns Array<{ field, before, after, changed }>
 */
export const diffValues = (oldVal = {}, newVal = {}) => {
  const o = oldVal || {};
  const n = newVal || {};
  const keys = Array.from(new Set([...Object.keys(o), ...Object.keys(n)]));
  return keys.map((field) => {
    const before = o[field];
    const after  = n[field];
    return {
      field:   FIELD_LABELS[field] || field,
      rawField: field,
      before,
      after,
      changed: JSON.stringify(before) !== JSON.stringify(after),
    };
  });
};

/** Render a JSONB cell value for display. */
export const displayValue = (v) => {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
};
