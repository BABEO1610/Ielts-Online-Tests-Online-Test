/**
 * ==========================================
 * UTILS: PHẢN HỒI CỨNG (Hardcoded Responses)
 * ==========================================
 * Nhiệm vụ: Chứa các câu trả lời tĩnh (không cần dùng AI) để tiết kiệm chi phí API.
 * Ví dụ: Chào hỏi, từ chối trả lời, hướng dẫn điều hướng trang web.
 */
const { ERROR_CODES, ERROR_MESSAGES } = require('./assistant.constants');

// Xóa dấu tiếng Việt và chuẩn hóa các từ lóng (tks -> thanks) để dễ nhận diện
const normalizeImmediateText = (value) => {
  const text = String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bbajn\b/g, 'ban')
    .replace(/\bbn\b/g, 'ban')
    .replace(/\bcan on\b/g, 'cam on')
    .replace(/\bcamon\b/g, 'cam on')
    .replace(/\bthank+s+\b/g, 'thanks')
    .replace(/\bhell+o\b/g, 'hello')
    .replace(/\bchao+\b/g, 'chao')
    .replace(/\s+/g, ' ')
    .trim();
  return text === 'cam on b' ? 'cam on ban' : text;
};

// Nhận diện sắc thái lời chào (là câu cảm ơn, câu chào, hay tạm biệt)
const detectImmediateTone = (message) => {
  const text = normalizeImmediateText(message);
  if (/\b(cam on|thanks|thank you|thank|tks|thx)\b/.test(text)) return 'thanks';
  if (/\b(bye|goodbye|tam biet|hen gap lai)\b/.test(text)) return 'farewell';
  return 'hello';
};

// Trả về câu chào phù hợp dựa theo tên người dùng và sắc thái
const buildGreetingResponse = ({ displayName = 'bạn', isGuest = false, message = '' } = {}) => {
  if (isGuest) {
    return 'Chào bạn! Bạn cần đăng nhập để sử dụng IELTS Assistant.';
  }
  const tone = detectImmediateTone(message);
  if (tone === 'thanks') {
    return `Không có gì ${displayName}! Bạn cứ hỏi mình khi cần luyện IELTS, tiếng Anh hoặc dùng IELTSZone nhé.`;
  }
  if (tone === 'farewell') {
    return `Tạm biệt ${displayName}! Khi cần luyện IELTS hoặc tiếng Anh, bạn cứ quay lại nhé.`;
  }
  return `Chào ${displayName}! Mình là IELTS Assistant. Bạn muốn tìm đề thi, tài liệu, mẹo học IELTS, học tiếng Anh hay xem lại kết quả bài làm?`;
};

// Trả về câu hỏi làm rõ (khi người dùng hỏi quá mơ hồ, ví dụ: "cho mình bài luyện")
const buildClarificationResponse = (message = '') => {
  const text = normalizeImmediateText(message);
  if (/\b(reading|listening|writing|speaking)\b/.test(text)) {
    const skill = text.match(/\b(reading|listening|writing|speaking)\b/)?.[1] || 'IELTS';
    return `Bạn muốn tìm đề ${skill} để luyện, hay muốn mình hướng dẫn cách học/làm ${skill}?`;
  }
  if (/\b(cho toi|cho minh|cho em|give me|show me)\b.*\b(bai|de|test|practice)\b.*\b(luyen|practice)\b.*\b(cach|phuong phap|method|strategy|technique)\s+(nay|do|this|that)\b/.test(text)) {
    return 'Bạn muốn luyện kỹ năng hoặc dạng câu hỏi nào? Bạn nói rõ Reading/Listening/Writing/Speaking hoặc tên dạng bài nhé.';
  }
  if (/\b(phuong phap|method|strategy|technique|cach)\s+(do|nay|this|that)\b/.test(text)) {
    return 'Bạn muốn áp dụng phương pháp nào? Bạn nhắc lại tên kỹ thuật hoặc dạng bài, mình sẽ hướng dẫn tiếp.';
  }
  return 'Được, bạn gửi câu hoặc nội dung cần làm rõ nhé.';
};

// Phản hồi từ chối khéo việc chấm bài Speaking/Writing trực tiếp
const buildSafeGradingResponse = () => {
  return 'Mình không chấm band Writing/Speaking trực tiếp trong khung chat này. Bạn hãy dùng flow nộp/chấm bài chính thức của hệ thống; ở đây mình chỉ có thể giải thích tiêu chí chung hoặc gợi ý cách luyện.';
};

// Phản hồi từ chối khéo các câu hỏi nằm ngoài phạm vi (như chính trị, thời tiết...)
const buildOutOfScopeResponse = () => {
  return ERROR_MESSAGES[ERROR_CODES.OUT_OF_SCOPE] || 'Xin lỗi, mình chỉ có thể trả lời các vấn đề liên quan đến IELTS hoặc cách sử dụng website này. Mình không thể hỗ trợ bạn các vấn đề khác.';
};

// Phản hồi hướng dẫn người dùng tìm kiếm đường link chức năng (Navigation)
const buildNavigationResponse = (message = '') => {
  const text = normalizeImmediateText(message);

  if (/\b(admin|staff|private)\b/.test(text)) {
    return 'Mình chỉ hướng dẫn các khu vực dành cho học viên. Mình không cung cấp hoặc bịa link admin/private.';
  }

  if (/\b(lich su|history|practice history|ket qua|result|review)\b/.test(text)) {
    return 'Bạn có thể vào Practice History để xem bài đã làm, kết quả và mở phần review khi bài đã được nộp.';
  }

  if (/\b(thu vien|library|tai lieu|pdf|audio|resource)\b/.test(text)) {
    return 'Bạn vào Library để tìm tài liệu học, PDF, audio hoặc resource IELTS đang có trên hệ thống.';
  }

  if (/\b(profile|ho so|tai khoan|doi mat khau|password)\b/.test(text)) {
    return 'Bạn vào Profile để xem thông tin tài khoản và các thiết lập cá nhân mà hệ thống hỗ trợ.';
  }

  if (/\b(test|bai thi|de thi|lam bai|start|reading|listening|writing|speaking)\b/.test(text)) {
    return 'Bạn vào Tests hoặc chọn kỹ năng Reading, Listening, Writing, Speaking để xem danh sách bài luyện và bắt đầu làm bài.';
  }

  return 'IELTSZone có các khu vực chính cho học viên: Tests để luyện bài, Library để xem tài liệu, Practice History/Review để xem kết quả đã nộp, và Profile để quản lý tài khoản.';
};

module.exports = {
  buildGreetingResponse,
  buildClarificationResponse,
  buildSafeGradingResponse,
  buildOutOfScopeResponse,
  buildNavigationResponse,
};
