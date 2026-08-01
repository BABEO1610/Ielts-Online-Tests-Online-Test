/**
 * ==========================================
 * TẦNG 2: ĐIỀU HƯỚNG & BẢO VỆ (Controller & Guardrails)
 * ==========================================
 * Nhiệm vụ: Rào chắn an ninh (Guardrails). Kiểm tra xem câu hỏi có chứa từ khóa cấm, 
 * có cố tình tấn công prompt injection hay hỏi lộ dữ liệu hệ thống không.
 */

const { ERROR_CODES, ERROR_MESSAGES } = require('./assistant.constants');
// chuẩn hóa văn bản đầu vào. chuyển toàn bộ tin nhắn thành chữ thường, loại bỏ dấu tiếng vijet 
const normalize = (text) =>
  String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/Ä‘/g, 'd');
// kiểm tra chuỗi văn bản value có có chứa bất kì mẫu từ khóa( regax pattern) nào trong danh saschg hay không trả về true hoặc false.
const containsAny = (value, patterns) => patterns.some((pattern) => pattern.test(value));
// các câu hỏi ngoài phạm vi 
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
  /\b(politics|chinh tri)\b/,
  /\b(news|tin tuc)\b.*\b(today|hom nay|latest|moi nhat)\b/,
  /\bthoi tiet\b/,
  /\bgia vang\b/,
  /\bgia do la\b/,
  /\bgia bitcoin\b/,
  /\b(tu van mua|nen mua|mua)\b.*\b(dien thoai|iphone|android|laptop|may tinh|san pham|product)\b/,
  /\b(dien thoai|iphone|android|laptop|may tinh)\b.*\b(nao|mua|nen chon|tu van)\b/,
  /\b(hack|cheat|bypass|crack)\b/,
  /\b(malware|virus|token stealer|lay token)\b/,
  /\b(fake certificate|certificate gia|chung chi gia)\b/,
  /\b(tao account admin|create admin account)\b/,
  /\b(lam ho|lam thay|giai ho|thi ho)\b.*\b(bai|bai thi|test|de thi)\b/,
  /\b(medical advice|legal advice|financial advice|investment advice)\b/,
  /\b(suc khoe|y te|benh|thuoc|bac si|doctor|medicine|health advice)\b/,
];
// nhận diện yêu cầu chấm bài writting/ speaking hoặc đoán điểm bandscore
const WRITING_SPEAKING_GRADING_PATTERNS = [
  /\b(cham|grade|score|evaluate|danh gia)\b.*\b(writing|speaking|essay|bai noi|bai viet)\b/,
  /\b(writing|speaking|essay|bai noi|bai viet)\b.*\b(cham|grade|score|evaluate|danh gia)\b/,
  /\bband\b.*\b(may|score|diem|prediction|predict|du doan)\b/,
  /\b(du doan|predict|generate|cho|tinh)\b.*\bband\b/,
  /\bielts band\b/,
];
// nhận diện ai bịa đề thi mới tạo đáp án giả hoặc đoán đề ngày mai
const FAKE_CONTENT_PATTERNS = [
  /\b(fake|bia|make up|invent)\b.*\b(test|lesson|answer|explanation|dap an|giai thich|de)\b/,
  /\b(tao|generate|create)\b.*\b(de thi|bai test|mock test|ielts test|answer key|dap an|explanation|giai thich)\b/,
  /\bbia\b.*\b(de|bai|dap an|giai thich)\b/,
  /\b(de|bai test|mock test|ielts test)\b.*\b(gia|fake)\b.*\b(dap an|answer key)\b/,
  /\b(viet ho|viet giup|soan ho|tao giup)\b.*\b(de|de thi|bai test|mock test|ielts test)\b.*\b(dap an|answer key)\b/,
  /\b(answer key|dap an)\b.*\b(cambridge|de chua lam|chua nop|chua lam)\b/,
  /\b(du doan|predict)\b.*\b(de ielts|de thi|real test|ngay mai)\b/,
];
// bảo vệ an ninh hệ thống, chặn các câu hỏi cố tình soi promt nội bộ , xin api key, hỏi cấu hình admin để soi dữ liệu các nhân người khác
const PRIVATE_DATA_PATTERNS = [
  /\b(system prompt|internal prompt|developer prompt|hidden prompt)\b/,
  /\b(api key|gemini api key|secret key|access token|refresh token|env|environment variable|config noi bo|cau hinh noi bo)\b/,
  /\b(model nao|provider nao|dang dung model|requested model|effective model)\b/,
  /\b(admin|private)\b.*\b(link|route|url|duong dan)\b/,
  /\b(link|route|url|duong dan)\b.*\b(admin|private)\b/,
  /\b(db|database|bang|table|mock_tests|library_resources)\b.*\b(raw|dump|xem du lieu|du lieu)\b/,
  /\b(admin-only|admin only|private data|du lieu rieng tu|du lieu nguoi khac)\b/,
  /\b(unpublished|chua publish|chua duoc cong khai)\b/,
  /\b(user khac|student khac|hoc vien khac)\b/,
  /\b(lich su chat|du lieu|email|attempt|bai lam)\b.*\b(user khac|student khac|hoc vien khac|ban khac|nguoi khac)\b/,
];
// nhận diện hành vi đòi đáp án/ gợi ý đáp án trong lúc làm bài thi
const REVIEW_DURING_TEST_PATTERNS = [
  /\b(dap an|answer|hint|goi y|giai thich|explanation)\b.*\b(dang lam|chua nop|in progress|during test)\b/,
  /\b(cho em|show me|tell me)\b.*\b(dap an|answer|hint)\b/,
];
// hàm trung tâm tiếp nhận tin nhắn, context trang web
const evaluateGuardrails = ({ message, context }) => {
  const normalized = normalize(message);
  // tắt ai trong lúc làm bài thi 
  if (context?.pageType === 'active-test') {
    return {
      blocked: true,
      code: ERROR_CODES.ASSISTANT_DISABLED_DURING_TEST,
      message: ERROR_MESSAGES[ERROR_CODES.ASSISTANT_DISABLED_DURING_TEST],
    };
  }
  // chặn yêu cầu chấm writting , speaking
  if (containsAny(normalized, WRITING_SPEAKING_GRADING_PATTERNS)) {
    return {
      blocked: true,
      code: ERROR_CODES.OUT_OF_SCOPE,
      message: 'Mình chưa chấm Writing/Speaking hoặc tạo band score trong phase này.',
    };
  }
  // chặn yêu cầu bịa đề, đáp án giả
  if (containsAny(normalized, FAKE_CONTENT_PATTERNS)) {
    return {
      blocked: true,
      code: ERROR_CODES.OUT_OF_SCOPE,
      message: 'Mình không tạo hoặc bịa test, lesson, đáp án hay giải thích mới.',
    };
  }
  // chặn thông tin bảo mật dữ liệu riêng 
  if (containsAny(normalized, PRIVATE_DATA_PATTERNS)) {
    return {
      blocked: true,
      code: ERROR_CODES.FORBIDDEN,
      message: 'Mình không thể tiết lộ dữ liệu nội bộ, dữ liệu chưa công khai hoặc dữ liệu của người dùng khác.',
    };
  }
  // chặn câu hỏi ngoài lề 
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
