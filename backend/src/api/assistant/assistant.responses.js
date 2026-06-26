const { ERROR_CODES, ERROR_MESSAGES } = require('./assistant.constants');

const buildGreetingResponse = () => {
  return 'Chào bạn, mình là IELTS Assistant. Mình có thể giúp bạn tìm đề, tài liệu, giải thích kiến thức IELTS, paraphrase câu, hoặc review đáp án sau khi nộp bài. Bạn muốn bắt đầu với phần nào?';
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
