/**
 * ==========================================
 * UTILS: BỘ PHÂN TÍCH TỪ KHÓA (Lookup Parser)
 * ==========================================
 * Nhiệm vụ: "Bóc tách" câu hỏi tiếng Việt của người dùng để rút trích ra các tham số tìm kiếm
 * như: số lượng (cho mình 3 đề), kỹ năng (reading), thứ tự (mới nhất), hoặc tên đề.
 */
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
  'lam', 'xem', 'phu', 'hop', 'voi', 'nhe', 'nha', 'please', 'giup', 'duoc',
  'nen', 'nay', 'do', 'phan', 'find', 'search', 'show', 'give', 'recommend',
  'suggest', 'me', 'my', 'for', 'about', 'suitable',
  've', 'chu', 'tai', 'lieu', 'lien', 'quan', 'den',
  ...SKILLS,
]);

// Tìm xem người dùng có nhắc đến kỹ năng nào không
const extractSkill = (text) => SKILLS.find((skill) => text.includes(skill)) || null;

// Chuyển đổi chữ số ("ba", "năm") hoặc số (3, 5) thành số lượng bài tập muốn lấy
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

// Xác định người dùng muốn tìm đề cũ nhất hay mới nhất
const extractSort = (text) => {
  if (/\b(cu nhat|lau nhat|oldest)\b/.test(text)) return 'oldest';
  if (/\b(moi nhat|gan nhat|latest|recent|newest)\b/.test(text)) return 'latest';
  return null;
};

// Tìm xem người dùng có chỉ định số cụ thể của đề thi không (ví dụ: đề số 12)
const extractTitleNumber = (text) => {
  const match = text.match(/\b(?:de|bai|mock test|test)\s*(?:[a-z]+\s*)?(?:so)?\s*(\d{1,3})\b/);
  return match ? Number(match[1]) : null;
};

// Kiểm tra xem người dùng có lệnh mở bài làm ngay lập tức không ("mở cho mình", "vào làm")
const extractOpenAction = (text) => /\b(mo|vao|lam|start|open|take)\b/.test(text) ? 'open' : null;

// Lọc bỏ các từ vô nghĩa (stopwords) để lấy ra từ khóa tìm kiếm cốt lõi
const extractSearchTerms = (text) => (
  text
    .split(/[^a-z0-9]+/g)
    .filter((term) => term.length >= 2 && !CONTROL_TERMS.has(term))
    .slice(0, ASSISTANT_CONTEXT_RESULT_LIMIT)
);

// Hàm chính: Gom tất cả các hàm rút trích trên lại để phân tách 1 tin nhắn
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
