const { normalizeText } = require('./assistant.intent');
const { ASSISTANT_CONTEXT_RESULT_LIMIT } = require('./assistant.constants');

const SKILLS = ['reading', 'listening', 'writing', 'speaking'];

const QUANTITY_WORDS = {
  mot: 1,
  vai: 3,
  ba: 3,
  bon: 4,
  nam: 5,
};

const CONTROL_TERMS = new Set([
  'tim', 'cho', 'toi', 'minh', 'ban', 'de', 'bai', 'thi', 'test', 'mock',
  'ielts', 'cu', 'nhat', 'moi', 'gan', 'day', 'so', 'mot', 'vai', 'cai',
  'nao', 'khong', 'co', 'trong', 'he', 'thong', 'bat', 'ky', 'mo', 'vao',
  'lam', 'xem',
  ...SKILLS,
]);

const extractSkill = (text) => SKILLS.find((skill) => text.includes(skill)) || null;

const extractQuantity = (text) => {
  const digitMatch = text.match(/\b(\d{1,2})\s*(?:de|bai|test|mock)?\b/);
  if (digitMatch && !/\b(?:so|test|mock test)\s*\d{1,2}\b/.test(text)) {
    return Number(digitMatch[1]);
  }

  const word = Object.keys(QUANTITY_WORDS).find((key) =>
    new RegExp(`\\b${key}\\s*(?:de|bai|test|mock)?\\b`).test(text)
  );
  return word ? QUANTITY_WORDS[word] : null;
};

const extractSort = (text) => {
  if (/\b(cu nhat|lau nhat|oldest)\b/.test(text)) return 'oldest';
  if (/\b(moi nhat|gan nhat|latest|recent|newest)\b/.test(text)) return 'latest';
  return null;
};

const extractTitleNumber = (text) => {
  const match = text.match(/\b(?:de|bai|mock test|test)\s*(?:[a-z]+\s*)?(?:so)?\s*(\d{1,3})\b/);
  return match ? Number(match[1]) : null;
};

const extractOpenAction = (text) => /\b(mo|vao|lam|start|open|take)\b/.test(text) ? 'open' : null;

const extractSearchTerms = (text) => (
  text
    .split(/[^a-z0-9]+/g)
    .filter((term) => term.length >= 2 && !CONTROL_TERMS.has(term))
    .slice(0, ASSISTANT_CONTEXT_RESULT_LIMIT)
);

const parseLookupMessage = (message) => {
  const text = normalizeText(message);
  const quantity = extractQuantity(text);
  const sort = extractSort(text);
  const titleNumber = extractTitleNumber(text);

  return {
    skill: extractSkill(text),
    quantity,
    sort,
    sortField: 'created_at',
    sortOrder: sort === 'oldest' ? 'ASC' : 'DESC',
    titleNumber,
    testNumber: titleNumber,
    action: extractOpenAction(text),
    searchTerms: extractSearchTerms(text),
    isStructuredLookup: Boolean(quantity || sort || titleNumber),
  };
};

module.exports = {
  parseLookupMessage,
};
