const { ASSISTANT_INTENTS } = require('./assistant.intent');
const { ERROR_MESSAGES, ERROR_CODES } = require('./assistant.constants');

const MISSING_DATA_MESSAGE = 'Mình chưa tìm thấy dữ liệu phù hợp trong hệ thống IELTS hiện tại.';

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Ä‘/g, 'd');

const containsBandPrediction = (answer) => {
  const text = normalizeText(answer);
  return [
    /\b(your|bai cua ban|cau tra loi cua ban|essay cua ban|speaking cua ban)\b.*\bband\s*[0-9]/,
    /\b(bai|essay|speaking|answer|response|cau tra loi)\b.*\bcua ban\b.*\bband\s*[0-9]/,
    /\bcua ban\b.*\bband\s*[0-9]/,
    /\bband\s*[0-9](\.[05])?\b.*\b(cho bai nay|for your|cua ban|essay nay|response nay|answer nay)\b/,
    /\b(cham|grade|score|danh gia|du doan|predict)\b.*\bband\s*[0-9]/,
    /\b(duoc|dat|khoang)\s*band\s*[0-9](\.[05])?\b.*\b(bai|essay|speaking|answer|response|cau tra loi)\b/,
  ].some((pattern) => pattern.test(text));
};

const containsWritingSpeakingGrading = (answer) => {
  const text = normalizeText(answer);
  return [
    /\b(cham|grade|score|danh gia)\b.*\b(writing|speaking|essay|bai noi|bai viet)\b/,
    /\b(writing|speaking|essay|bai noi|bai viet)\b.*\b(cham|grade|score|danh gia)\b/,
  ].some((pattern) => pattern.test(text));
};

const containsFakeOfficialContent = (answer) => {
  const text = normalizeText(answer);
  return [
    /\b(de thi|mock test|ielts test)\b.*\b(chinh thuc|official)\b.*\b(dap an|answer key)\b/,
    /\b(day la|here is)\b.*\b(de thi|mock test|ielts test)\b.*\b(dap an|answer key)\b/,
  ].some((pattern) => pattern.test(text));
};

const containsPromptLeak = (answer) =>
  /\b(system prompt|internal prompt|developer prompt|hidden prompt)\b/.test(normalizeText(answer));

const hasExternalLinks = (links) =>
  links.some((link) => {
    const href = String(link.href || '');
    return /^https?:\/\//i.test(href) && !href.includes('localhost') && !href.includes('ielts');
  });

const isUnsafeResponse = (response) =>
  containsBandPrediction(response.answer) ||
  containsWritingSpeakingGrading(response.answer) ||
  containsFakeOfficialContent(response.answer) ||
  containsPromptLeak(response.answer) ||
  hasExternalLinks(response.suggestedLinks || []);

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

  if (isUnsafeResponse(response)) {
    return {
      ...response,
      answer: ERROR_MESSAGES[ERROR_CODES.OUT_OF_SCOPE],
      suggestedLinks: [],
      safety: {
        ...(response.safety || {}),
        outOfScope: true,
        containsBandScore: containsBandPrediction(response.answer),
        containsWritingSpeakingGrading: containsWritingSpeakingGrading(response.answer),
      },
    };
  }

  return response;
};

module.exports = {
  MISSING_DATA_MESSAGE,
  selfCheckResponse,
  normalizeText,
  containsBandPrediction,
  containsWritingSpeakingGrading,
};
