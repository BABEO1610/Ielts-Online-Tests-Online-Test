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

const toFrontendUrl = (path) => `${FRONTEND_BASE_URL}${path}`;

const getSkillRoute = (skill) => SKILL_ROUTES[String(skill || '').toLowerCase()] || '/tests';

const buildTestRoute = ({ id, skill }) => {
  if (!id) return getSkillRoute(skill);
  const normalizedSkill = String(skill || '').toLowerCase();
  if (SKILL_ROUTES[normalizedSkill]) return `/tests/${id}/${normalizedSkill}`;
  return `/tests/${id}`;
};

const buildLibraryRoute = ({ id } = {}) => (id ? `/library?resourceId=${encodeURIComponent(id)}` : '/library');

const buildAssistantLink = ({ type, id, skill, label }) => {
  if (type === 'test') {
    return { label: label || 'IELTS test', href: toFrontendUrl(buildTestRoute({ id, skill })) };
  }
  if (type === 'library_resource') {
    return { label: label || 'IELTS resource', href: toFrontendUrl(buildLibraryRoute({ id })) };
  }
  const route = STATIC_ROUTES[type] || '/';
  return { label: label || type || 'IELTSZone', href: toFrontendUrl(route) };
};

module.exports = {
  STATIC_ROUTES,
  toFrontendUrl,
  getSkillRoute,
  buildTestRoute,
  buildLibraryRoute,
  buildAssistantLink,
};
