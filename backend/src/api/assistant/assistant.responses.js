const { ERROR_CODES, ERROR_MESSAGES } = require('./assistant.constants');

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

const detectImmediateTone = (message) => {
  const text = normalizeImmediateText(message);
  if (/\b(cam on|thanks|thank you|thank|tks|thx)\b/.test(text)) return 'thanks';
  if (/\b(bye|goodbye|tam biet|hen gap lai)\b/.test(text)) return 'farewell';
  return 'hello';
};

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

const buildSafeGradingResponse = () => {
  return 'Hệ thống hiện tại lưu trữ bài nộp của bạn để Tutor hoặc AI tự động chấm dứt điểm, nhưng vì mình là trợ lý chat nhanh nên mình không thể chấm điểm (band score) trực tiếp ở đây. Bạn hãy nộp bài qua chức năng Test để nhận kết quả nhé!';
};

const buildOutOfScopeResponse = () => {
  return ERROR_MESSAGES[ERROR_CODES.OUT_OF_SCOPE] || 'Xin lỗi, mình chỉ có thể trả lời các vấn đề liên quan đến IELTS hoặc cách sử dụng website này. Mình không thể hỗ trợ bạn các vấn đề khác.';
};

module.exports = {
  buildGreetingResponse,
  buildClarificationResponse,
  buildSafeGradingResponse,
  buildOutOfScopeResponse,
};
