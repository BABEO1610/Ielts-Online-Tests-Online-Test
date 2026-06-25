const ERROR_CODES = {
  LOGIN_REQUIRED: 'LOGIN_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  ASSISTANT_DISABLED_DURING_TEST: 'ASSISTANT_DISABLED_DURING_TEST',
  ATTEMPT_NOT_FOUND: 'ATTEMPT_NOT_FOUND',
  ATTEMPT_NOT_SUBMITTED: 'ATTEMPT_NOT_SUBMITTED',
  QUESTION_NOT_FOUND: 'QUESTION_NOT_FOUND',
  MISSING_CONTEXT: 'MISSING_CONTEXT',
  MISSING_EXPLANATION: 'MISSING_EXPLANATION',
  OUT_OF_SCOPE: 'OUT_OF_SCOPE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  AI_NOT_CONFIGURED: 'AI_NOT_CONFIGURED',
  AI_QUOTA_EXCEEDED: 'AI_QUOTA_EXCEEDED',
};

const ERROR_MESSAGES = {
  [ERROR_CODES.LOGIN_REQUIRED]: 'Bạn cần đăng nhập để sử dụng trợ lý IELTS.',
  [ERROR_CODES.FORBIDDEN]: 'Bạn không có quyền sử dụng tài nguyên trợ lý này.',
  [ERROR_CODES.VALIDATION_ERROR]: 'Dữ liệu gửi lên không hợp lệ.',
  [ERROR_CODES.ASSISTANT_DISABLED_DURING_TEST]: 'Trợ lý IELTS không khả dụng trong lúc làm bài.',
  [ERROR_CODES.ATTEMPT_NOT_FOUND]: 'Không tìm thấy bài làm cần xem lại.',
  [ERROR_CODES.ATTEMPT_NOT_SUBMITTED]: 'Bạn chỉ có thể hỏi trợ lý sau khi nộp bài.',
  [ERROR_CODES.QUESTION_NOT_FOUND]: 'Không tìm thấy câu hỏi cần giải thích.',
  [ERROR_CODES.MISSING_CONTEXT]: 'Hệ thống chưa có đủ ngữ cảnh để trả lời câu hỏi này.',
  [ERROR_CODES.MISSING_EXPLANATION]: 'Hiện tại hệ thống chưa có đủ dữ liệu để giải thích câu này.',
  [ERROR_CODES.OUT_OF_SCOPE]: 'Mình chỉ hỗ trợ nội dung IELTS trên website.',
  [ERROR_CODES.INTERNAL_ERROR]: 'Trợ lý IELTS đang gặp lỗi. Vui lòng thử lại sau.',
  [ERROR_CODES.AI_NOT_CONFIGURED]: 'AI service chưa được cấu hình. Vui lòng điền GEMINI_API_KEY hoặc OPENAI_API_KEY trong file .env ở root project.',
  [ERROR_CODES.AI_QUOTA_EXCEEDED]: 'Gemini API đã hết quota hoặc chưa được cấp quota. Vui lòng kiểm tra billing/quota trong Google AI Studio.',
};

const HTTP_STATUS_BY_CODE = {
  [ERROR_CODES.LOGIN_REQUIRED]: 401,
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.VALIDATION_ERROR]: 400,
  [ERROR_CODES.ASSISTANT_DISABLED_DURING_TEST]: 403,
  [ERROR_CODES.ATTEMPT_NOT_FOUND]: 404,
  [ERROR_CODES.ATTEMPT_NOT_SUBMITTED]: 403,
  [ERROR_CODES.QUESTION_NOT_FOUND]: 404,
  [ERROR_CODES.MISSING_CONTEXT]: 422,
  [ERROR_CODES.MISSING_EXPLANATION]: 422,
  [ERROR_CODES.OUT_OF_SCOPE]: 400,
  [ERROR_CODES.AI_NOT_CONFIGURED]: 503,
  [ERROR_CODES.AI_QUOTA_EXCEEDED]: 429,
  [ERROR_CODES.INTERNAL_ERROR]: 500,
};

const PAGE_TYPES = new Set([
  'home',
  'test',
  'test-list',
  'library',
  'lesson',
  'profile',
  'result',
  'review',
  'active-test',
  'unknown',
]);

const SUBMITTED_ATTEMPT_STATUSES = new Set([
  'submitted',
  'completed',
  'complete',
  'graded',
  'finished',
  'done',
]);

const ASSISTANT_ROLE = {
  USER: 'user',
  ASSISTANT: 'assistant',
};

const INTENT_CONTEXT_MAP = {
  GREETING: {
    tables: [],
    filters: [],
    requires: [],
    allowedActions: ['greet_student', 'suggest_supported_questions'],
    forbiddenActions: ['query_database', 'invent_tests', 'invent_lessons', 'generate_band_score'],
  },
  NAVIGATION: {
    tables: [],
    filters: [],
    requires: [],
    allowedActions: ['recommend_static_routes', 'explain_site_navigation'],
    forbiddenActions: ['invent_routes', 'query_private_data', 'generate_band_score'],
  },
  GENERAL_STUDY_TIPS: {
    tables: [],
    filters: [],
    requires: [],
    allowedActions: ['give_general_ielts_study_tips', 'ask_clarifying_question'],
    forbiddenActions: ['grade_writing', 'grade_speaking', 'generate_band_score', 'invent_website_data'],
  },
  IELTS_KNOWLEDGE: {
    tables: [],
    filters: [],
    requires: [],
    allowedActions: [
      'explain_ielts_concepts',
      'explain_grammar_vocabulary',
      'give_skill_strategy',
      'paraphrase_user_text',
      'ask_clarifying_question',
    ],
    forbiddenActions: [
      'grade_writing',
      'grade_speaking',
      'predict_band_score',
      'invent_tests',
      'invent_answer_keys',
      'invent_website_data',
    ],
  },
  FIND_TEST: {
    tables: ['mock_tests'],
    filters: ['is_published = TRUE', 'title', 'description', 'skill', 'difficulty'],
    requires: [],
    allowedActions: ['recommend_existing_tests', 'say_missing_data'],
    forbiddenActions: ['invent_tests', 'invent_links', 'generate_band_score'],
  },
  FIND_LESSON: {
    tables: ['library_resources'],
    filters: ['is_published = TRUE', 'title', 'description', 'resource_type', 'category'],
    requires: [],
    allowedActions: ['recommend_existing_lessons', 'say_missing_data'],
    forbiddenActions: ['invent_lessons', 'invent_links', 'generate_band_score'],
  },
  POST_TEST_REVIEW: {
    tables: ['test_attempts', 'questions', 'question_answers'],
    filters: ['attempt.user_id = current_user', 'submitted_at IS NOT NULL'],
    requires: ['attempt_owner_check', 'submitted_check'],
    allowedActions: ['explain_from_official_data', 'say_missing_explanation'],
    forbiddenActions: ['answer_before_submit', 'invent_explanation', 'generate_band_score'],
  },
  OUT_OF_SCOPE: {
    tables: [],
    filters: [],
    requires: [],
    allowedActions: ['refuse_politely'],
    forbiddenActions: ['query_database', 'answer_out_of_scope', 'generate_band_score'],
  },
  UNKNOWN: {
    tables: [],
    filters: [],
    requires: [],
    allowedActions: ['ask_clarifying_question', 'give_safe_scope_summary'],
    forbiddenActions: ['invent_data', 'invent_links', 'generate_band_score'],
  },
};

const createAssistantError = (code, message = ERROR_MESSAGES[code]) => {
  const error = new Error(message || ERROR_MESSAGES.INTERNAL_ERROR);
  error.code = code;
  error.statusCode = HTTP_STATUS_BY_CODE[code] || 500;
  return error;
};

module.exports = {
  ERROR_CODES,
  ERROR_MESSAGES,
  HTTP_STATUS_BY_CODE,
  PAGE_TYPES,
  SUBMITTED_ATTEMPT_STATUSES,
  ASSISTANT_ROLE,
  INTENT_CONTEXT_MAP,
  createAssistantError,
};
