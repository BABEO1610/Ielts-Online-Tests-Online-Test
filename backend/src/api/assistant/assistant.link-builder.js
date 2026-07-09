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

const buildLink = ({ label, path, type }) => {
  const href = toFrontendUrl(path);
  return {
    label,
    href,
    url: href,
    type,
  };
};

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
