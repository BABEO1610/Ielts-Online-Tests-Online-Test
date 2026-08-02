import React from 'react';

const VARIANT_MAP = {
  primary:      'badge rounded-pill bg-primary text-white',
  secondary:    'badge rounded-pill bg-secondary text-white',
  success:      'badge rounded-pill bg-success text-white',
  danger:       'badge rounded-pill bg-danger text-white',
  warning:      'badge rounded-pill bg-warning text-dark',
  info:         'badge rounded-pill bg-info text-dark',
  neutral:      'badge rounded-pill bg-light text-dark',
  // legacy status values (dùng ở grading pages)
  pending:      'badge rounded-pill bg-secondary',
  ai_graded:    'badge rounded-pill bg-dark text-white',
  tutor_graded: 'badge rounded-pill bg-dark text-white',
  failed:       'badge rounded-pill bg-danger',
};

/**
 * Badge — hiển thị nhãn màu.
 *
 * Cách dùng mới (modal admin):
 *   <Badge variant="info">reading</Badge>
 *
 * Cách dùng cũ (grading pages):
 *   <Badge status="pending" />
 */
const Badge = ({ variant, status, children }) => {
  const key = variant || status || 'neutral';
  const cls = VARIANT_MAP[key] ?? 'badge rounded-pill bg-light text-dark';

  // children ưu tiên hơn; nếu không có thì dùng status làm text
  return <span className={cls}>{children ?? status}</span>;
};

export default Badge;
