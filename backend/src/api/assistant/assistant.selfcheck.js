const { ASSISTANT_INTENTS } = require('./assistant.intent');
const { ERROR_MESSAGES, ERROR_CODES } = require('./assistant.constants');

const MISSING_DATA_MESSAGE = 'Mình chưa tìm thấy dữ liệu phù hợp trong hệ thống IELTS hiện tại.';

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const containsUnsafeClaim = (answer) => {
  const text = normalizeText(answer);
  return /\bband\s*[0-9]/.test(text) ||
    /\b(cham|grade|score|danh gia)\b.*\b(writing|speaking|essay|bai noi|bai viet)\b/.test(text) ||
    /\b(system prompt|internal prompt|developer prompt|hidden prompt)\b/.test(text);
};

const hasExternalLinks = (links) =>
  links.some((link) => {
    const href = String(link.href || '');
    return /^https?:\/\//i.test(href) && !href.includes('localhost') && !href.includes('ielts');
  });

const selfCheckResponse = ({ response, contextInjection }) => {
  const databaseResults = contextInjection.databaseResults || [];
  const mode = contextInjection.mode;

  if (
    (mode === ASSISTANT_INTENTS.FIND_TEST || mode === ASSISTANT_INTENTS.FIND_LESSON) &&
    databaseResults.length === 0
  ) {
    return {
      ...response,
      answer: MISSING_DATA_MESSAGE,
      suggestedLinks: [],
      usedDatabase: false,
      needsMoreContext: true,
    };
  }

  if (mode === ASSISTANT_INTENTS.POST_TEST_REVIEW && databaseResults.length === 0) {
    return {
      ...response,
      answer: ERROR_MESSAGES[ERROR_CODES.MISSING_EXPLANATION],
      suggestedLinks: [],
      usedDatabase: false,
      needsMoreContext: true,
    };
  }

  if (containsUnsafeClaim(response.answer) || hasExternalLinks(response.suggestedLinks || [])) {
    return {
      ...response,
      answer: ERROR_MESSAGES[ERROR_CODES.OUT_OF_SCOPE],
      suggestedLinks: [],
      safety: {
        ...(response.safety || {}),
        outOfScope: true,
      },
    };
  }

  return response;
};

module.exports = {
  MISSING_DATA_MESSAGE,
  selfCheckResponse,
};
