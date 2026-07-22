/**
 * @file backend/src/ai/aiGrading.constants.js
 * Error codes and constants for AI Writing Grading feature.
 *
 * NOTE: SPEC ERR-02 (auto-switch grader to tutor on AI fail) is
 * SUPERSEDED by business rule 2026-07-02:
 *   - AI fail keeps grader='ai', status='pending'
 *   - Saves error_message to ai_grading_reports with report.status='failed'
 *   - Does NOT push into v_tutor_grading_queue
 *
 * Provider: Grading reuses the project's existing Gemini provider config.
 */

const AI_GRADE_ERRORS = {
  AIGRADE_001: {
    code: 'AIGRADE_001',
    message: 'Bài viết quá ngắn để chấm AI',
    status: 422,
  },
  AIGRADE_002: {
    code: 'AIGRADE_002',
    message: 'AI đã chấm bài này rồi, không thể chấm lại',
    status: 409,
  },
  AIGRADE_003: {
    code: 'AIGRADE_003',
    message: 'Nhà cung cấp AI phản hồi quá thời gian',
    status: 504,
  },
  AIGRADE_004: {
    code: 'AIGRADE_004',
    message: 'AI response không hợp lệ',
    status: 502,
  },
  AIGRADE_005: {
    code: 'AIGRADE_005',
    message: 'Bài nộp không tồn tại',
    status: 404,
  },
  AIGRADE_006: {
    code: 'AIGRADE_006',
    message: 'Không có quyền truy cập bài nộp này',
    status: 403,
  },
  AIGRADE_007: {
    code: 'AIGRADE_007',
    message: 'Bài chưa được nộp hoặc đang trong bài thi',
    status: 400,
  },
  AIGRADE_008: {
    code: 'AIGRADE_008',
    message: 'Nhà cung cấp AI đã vượt hạn mức',
    status: 429,
  },
  AIGRADE_009: {
    code: 'AIGRADE_009',
    message: 'Loại bài viết không được hỗ trợ',
    status: 400,
  },
  AIGRADE_010: {
    code: 'AIGRADE_010',
    message: 'Lưu kết quả AI thất bại',
    status: 500,
  },
};

const WORD_COUNT_THRESHOLDS = {
  task1: { systemMin: 50, ieltsMin: 150 },
  task2: { systemMin: 100, ieltsMin: 250 },
};

const REPORT_STATUS = {
  COMPLETED: 'completed',
  FAILED: 'failed',
};

const PROMPT_VERSION = '1.0.0';

module.exports = {
  AI_GRADE_ERRORS,
  WORD_COUNT_THRESHOLDS,
  REPORT_STATUS,
  PROMPT_VERSION,
};
