const { ERROR_CODES, ERROR_MESSAGES } = require('./assistant.constants');

const normalize = (text) =>
  String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Ä‘/g, 'd');

const containsAny = (value, patterns) => patterns.some((pattern) => pattern.test(value));

const OUT_OF_SCOPE_PATTERNS = [
  /\bbitcoin\b/,
  /\bcrypto\b/,
  /\bblockchain\b/,
  /\bstock\b/,
  /\bforex\b/,
  /\bweather\b/,
  /\bforecast\b/,
  /\bgame\b/,
  /\bgaming\b/,
  /\bcasino\b/,
  /\bca cuoc\b/,
  /\bthoi tiet\b/,
  /\bgia vang\b/,
  /\bgia do la\b/,
  /\bgia bitcoin\b/,
];

const WRITING_SPEAKING_GRADING_PATTERNS = [
  /\b(cham|grade|score|evaluate|danh gia)\b.*\b(writing|speaking|essay|bai noi|bai viet)\b/,
  /\b(writing|speaking|essay|bai noi|bai viet)\b.*\b(cham|grade|score|evaluate|danh gia)\b/,
  /\bband\b.*\b(may|score|diem|prediction|predict|du doan)\b/,
  /\b(du doan|predict|generate|cho|tinh)\b.*\bband\b/,
  /\bielts band\b/,
];

const FAKE_CONTENT_PATTERNS = [
  /\b(fake|bia|make up|invent)\b.*\b(test|lesson|answer|explanation|dap an|giai thich|de)\b/,
  /\b(tao|generate|create)\b.*\b(de thi|bai test|mock test|ielts test|answer key|dap an|explanation|giai thich)\b/,
  /\bbia\b.*\b(de|bai|dap an|giai thich)\b/,
];

const PRIVATE_DATA_PATTERNS = [
  /\b(system prompt|internal prompt|developer prompt|hidden prompt)\b/,
  /\b(admin-only|admin only|private data|du lieu rieng tu|du lieu nguoi khac)\b/,
  /\b(unpublished|chua publish|chua duoc cong khai)\b/,
  /\b(user khac|student khac|hoc vien khac)\b/,
];

const REVIEW_DURING_TEST_PATTERNS = [
  /\b(dap an|answer|hint|goi y|giai thich|explanation)\b.*\b(dang lam|chua nop|in progress|during test)\b/,
  /\b(cho em|show me|tell me)\b.*\b(dap an|answer|hint)\b/,
];

const evaluateGuardrails = ({ message, context }) => {
  const normalized = normalize(message);

  if (context?.pageType === 'active-test') {
    return {
      blocked: true,
      code: ERROR_CODES.ASSISTANT_DISABLED_DURING_TEST,
      message: ERROR_MESSAGES[ERROR_CODES.ASSISTANT_DISABLED_DURING_TEST],
    };
  }

  if (containsAny(normalized, WRITING_SPEAKING_GRADING_PATTERNS)) {
    return {
      blocked: true,
      code: ERROR_CODES.OUT_OF_SCOPE,
      message: 'Mình chưa chấm Writing/Speaking hoặc tạo band score trong phase này.',
    };
  }

  if (containsAny(normalized, FAKE_CONTENT_PATTERNS)) {
    return {
      blocked: true,
      code: ERROR_CODES.OUT_OF_SCOPE,
      message: 'Mình không tạo hoặc bịa test, lesson, đáp án hay giải thích mới.',
    };
  }

  if (containsAny(normalized, PRIVATE_DATA_PATTERNS)) {
    return {
      blocked: true,
      code: ERROR_CODES.FORBIDDEN,
      message: 'Mình không thể tiết lộ dữ liệu nội bộ, dữ liệu chưa công khai hoặc dữ liệu của người dùng khác.',
    };
  }

  if (containsAny(normalized, OUT_OF_SCOPE_PATTERNS)) {
    return {
      blocked: true,
      code: ERROR_CODES.OUT_OF_SCOPE,
      message: ERROR_MESSAGES[ERROR_CODES.OUT_OF_SCOPE],
    };
  }

  if (context?.pageType !== 'review' && context?.pageType !== 'result' && containsAny(normalized, REVIEW_DURING_TEST_PATTERNS)) {
    return {
      blocked: true,
      code: ERROR_CODES.MISSING_CONTEXT,
      message: 'Mình chỉ giải thích đáp án khi bạn đã nộp bài và đang ở trang kết quả hoặc review.',
    };
  }

  return {
    blocked: false,
    code: null,
    message: null,
  };
};

module.exports = {
  evaluateGuardrails,
};
