/**
 * ==========================================
 * UTILS: XÂY DỰNG LIÊN KẾT (Link Builder)
 * ==========================================
 * Nhiệm vụ: Chuẩn hóa và tạo ra các đường link (URL) dẫn về Frontend.
 * Đảm bảo AI trả về link chính xác tới trang thi, thư viện, tài khoản...
 */
const FRONTEND_BASE_URL = (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');

const SKILL_ROUTES = {
  reading: '/reading',
  listening: '/listening',
  writing: '/writing',
  speaking: '/speaking',
};

const STATIC_ROUTES = {
  listening: '/listening',
  reading: '/reading',
  writing: '/writing',
  speaking: '/speaking',
  library: '/library',
  profile: '/profile',
  practiceHistory: '/practice-history',
  tests: '/tests',
};

// Nối path tĩnh với URL của Frontend
const toFrontendUrl = (path) => `${FRONTEND_BASE_URL}${path}`;

// Đóng gói 1 đối tượng Link hoàn chỉnh để Frontend hiển thị thành nút bấm
const buildLink = ({ label, path, type }) => {
  const href = toFrontendUrl(path);
  return {
    label,
    href,
    url: href,
    type,
  };
};

// Lấy route cơ bản của từng kỹ năng (ví dụ: /reading)
const getSkillRoute = (skill) => SKILL_ROUTES[String(skill || '').toLowerCase()] || '/tests';

// Xây dựng link chi tiết tới một bài thi cụ thể (ví dụ: /tests/123/reading)
const buildTestRoute = ({ id, skill }) => {
  if (!id) return getSkillRoute(skill);
  const normalizedSkill = String(skill || '').toLowerCase();
  if (SKILL_ROUTES[normalizedSkill]) return `/tests/${id}/${normalizedSkill}`;
  return `/tests/${id}`;
};

// Xây dựng link chi tiết tới một tài liệu trong thư viện
const buildLibraryRoute = ({ id } = {}) => (id ? `/library?resourceId=${encodeURIComponent(id)}` : '/library');

// Phễu tổng (Router): Tự động chọn hàm build link phù hợp dựa vào loại dữ liệu (test/library/route)
const buildAssistantLink = ({ type, id, skill, label }) => {
  if (type === 'test') {
    return buildLink({ label: label || 'IELTS test', path: buildTestRoute({ id, skill }), type: 'test' });
  }
  if (type === 'library_resource') {
    return buildLink({ label: label || 'IELTS resource', path: buildLibraryRoute({ id }), type: 'library_resource' });
  }
  const route = STATIC_ROUTES[type] || '/';
  return buildLink({ label: label || type || 'IELTSZone', path: route, type: 'route' });
};

module.exports = {
  STATIC_ROUTES,
  toFrontendUrl,
  buildLink,
  getSkillRoute,
  buildTestRoute,
  buildLibraryRoute,
  buildAssistantLink,
};
