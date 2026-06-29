const { ERROR_CODES, ERROR_MESSAGES } = require('./assistant.constants');

const buildGreetingResponse = ({ displayName = 'bạn', isGuest = false } = {}) => {
  if (isGuest) {
    return 'Chào bạn! Bạn cần đăng nhập để sử dụng IELTS Assistant.';
  }
  return `Chào ${displayName}! Mình là IELTS Assistant. Bạn muốn tìm đề thi, tài liệu, mẹo học IELTS hay xem lại kết quả bài làm?`;
};

const buildClarificationResponse = () => {
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
