/**
 * @file aiApi.js
 * @module services/aiApi
 * @description AI API Client Service — Task T039 (feat-ai-assistance)
 *
 * Cung cấp các client functions gọi tất cả AI endpoints của backend.
 * Tái sử dụng axios instance từ `./api.js` để kế thừa:
 *   - baseURL (VITE_API_URL hoặc http://localhost:3000/api/v1)
 *   - withCredentials: true (HttpOnly cookie auth)
 *   - Auto-refresh token interceptor (401 → /auth/refresh-token → retry)
 *
 * SECURITY (EARS[Ubiquitous]):
 *   - Module này KHÔNG log, KHÔNG expose API key, raw provider error, system prompt.
 *   - Mọi sanitization thực hiện ở server side.
 *   - Response trả về `AxiosResponse` — component tự đọc `.data.data`.
 *
 * EARS[Ubiquitous]: THE system SHALL route all Claude API calls through
 * the server-side backend. Exposing the Anthropic API key to any
 * client-side response is STRICTLY PROHIBITED.
 *
 * Error propagation: Các function KHÔNG swallow lỗi.
 * Caller component chịu trách nhiệm xử lý từng HTTP status code.
 */

import api from './api';

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — WRITING EVALUATION
// Ref: PLAN §2.5 | SPEC §4.2 (AI Writing Grader) | SPEC §5
// Endpoint: POST /api/v1/ai/writing/evaluate/:submission_id
// ═══════════════════════════════════════════════════════════════

/**
 * Yêu cầu backend bắt đầu chấm bài Writing bằng AI (async job).
 *
 * EARS[Event]: WHEN a Student requests AI grading for a Writing submission
 * THEN the system SHALL enqueue a background job and return HTTP 202 Accepted.
 *
 * EARS[State-driven]: WHILE an ai_feedback_reports record already exists
 * for this writing_submission_id THE system SHALL return HTTP 200 with
 * the existing report without calling the AI provider again (idempotency).
 *
 * EARS[Unwanted]: WHERE submission does not belong to the requesting user
 * OR grader != 'ai' THEN the system SHALL return HTTP 403 Forbidden.
 *
 * EARS[Unwanted]: WHERE submission status != 'pending'
 * THEN the system SHALL return HTTP 400 Invalid submission state.
 *
 * EARS[Unwanted]: WHERE global AI budget is exceeded
 * THEN the system SHALL return HTTP 429 AI_USAGE_LIMIT_EXCEEDED
 * before enqueueing or calling the provider.
 *
 * @param {string} submissionId - UUID của writing submission
 * @returns {Promise<import('axios').AxiosResponse>}
 *   202 Accepted (enqueued) | 200 OK (existing report) |
 *   400 | 403 | 404 | 429
 */
export const evaluateWriting = (submissionId) => {
  return api.post(`/ai/writing/evaluate/${submissionId}`);
};

// ═══════════════════════════════════════════════════════════════
// SECTION 2 — SPEAKING EVALUATION
// Ref: PLAN §2.5 | SPEC §4.2 (AI Speaking Grader) | SPEC §5
// Endpoint: POST /api/v1/ai/speaking/evaluate/:submission_id
// ═══════════════════════════════════════════════════════════════

/**
 * Yêu cầu backend bắt đầu chấm bài Speaking bằng AI (async: STT → evaluate).
 *
 * EARS[Event]: WHEN a Student requests AI grading for a Speaking submission
 * THEN the system SHALL validate audio_url, enqueue STT + AI evaluation job,
 * and return HTTP 202 Accepted.
 *
 * EARS[State-driven]: WHILE an ai_feedback_reports record already exists
 * for this speaking_submission_id THE system SHALL return HTTP 200 with
 * the existing report (idempotency — prevents double-billing on client retry).
 *
 * EARS[Unwanted]: WHERE audio_url is missing or inaccessible (HEAD 4xx/5xx)
 * THEN the system SHALL return HTTP 400 AI_GRADE_003.
 *
 * EARS[Unwanted]: WHERE STT confidence < 0.6 or transcript < 30 words
 * THEN the system SHALL return HTTP 422 AI_GRADE_002.
 *
 * EARS[Unwanted]: WHERE global AI budget is exceeded
 * THEN the system SHALL return HTTP 429 AI_USAGE_LIMIT_EXCEEDED.
 *
 * @param {string} submissionId - UUID của speaking submission
 * @returns {Promise<import('axios').AxiosResponse>}
 *   202 Accepted | 200 OK (existing) |
 *   400 | 403 | 404 | 422 | 429
 */
export const evaluateSpeaking = (submissionId) => {
  return api.post(`/ai/speaking/evaluate/${submissionId}`);
};

// ═══════════════════════════════════════════════════════════════
// SECTION 3 — AI FEEDBACK REPORT RETRIEVAL
// Ref: PLAN §2.5 (getReport) | SPEC §5 | TASKS T032
// Endpoint: GET /api/v1/ai/reports/:report_id
// ═══════════════════════════════════════════════════════════════

/**
 * Lấy chi tiết một AI feedback report (Writing hoặc Speaking).
 *
 * EARS[State-driven]: WHILE a submission has status 'ai_graded'
 * THE system SHALL serve the associated ai_feedback_reports record
 * directly from the DB — do NOT re-call the Claude API.
 *
 * EARS[Ubiquitous]: THE system SHALL sanitize private metadata
 * (raw_ai_response, API key, system prompt) before returning to client.
 * Response data SHALL include an AI disclaimer field.
 *
 * EARS[Unwanted]: WHERE the requesting user is not the submission owner
 * AND not a Tutor with access AND not Admin THEN return HTTP 403 Forbidden.
 *
 * @param {string} reportId - UUID của ai_feedback_reports record
 * @returns {Promise<import('axios').AxiosResponse>}
 *   200 OK { success, data: { report, disclaimer } } | 403 | 404
 */
export const getReport = (reportId) => {
  return api.get(`/ai/reports/${reportId}`);
};

// ═══════════════════════════════════════════════════════════════
// SECTION 4 — EXPLAIN WITH AI
// Ref: PLAN §2.5 (explain) | SPEC §4.2 (Explain with AI) | FR-09..FR-11
// Endpoint: POST /api/v1/ai/explain
// ═══════════════════════════════════════════════════════════════

/**
 * Gọi "Explain with AI" cho một câu hỏi objective.
 *
 * EARS[Event]: WHEN a Student clicks "Explain with AI" for a specific question
 * THEN the system SHALL check ai_explain_requests for an existing record
 * matching (user_id, question_id).
 *
 * EARS[State-driven]: WHILE a cached explanation exists for (user_id, question_id)
 * THE system SHALL return HTTP 200 with the existing ai_response immediately
 * WITHOUT calling the Claude API (cache HIT — prevents double-billing).
 *
 * EARS[Event]: Cache MISS — WHEN no cached explanation exists
 * THEN the system SHALL call the Claude API, INSERT ai_explain_requests,
 * and return HTTP 201 Created.
 *
 * EARS[Unwanted]: WHERE the Student does not have access to this question
 * (question not in any test the student attempted) THEN return HTTP 403 Forbidden.
 *
 * EARS[Unwanted]: WHERE global AI budget is exceeded
 * THEN return HTTP 429 AI_USAGE_LIMIT_EXCEEDED before calling the provider.
 *
 * EARS[Unwanted]: WHERE the Claude API is unavailable
 * THEN return HTTP 503 AI_EXP_001.
 *
 * @param {string} questionId - UUID của câu hỏi cần giải thích
 * @returns {Promise<import('axios').AxiosResponse>}
 *   201 Created (cache miss) | 200 OK (cache hit) | 403 | 429 | 503
 */
export const explainQuestion = (questionId) => {
  // EARS[Ubiquitous]: THE system SHALL NOT modify the official correct_answer field.
  return api.post('/ai/explain', { question_id: questionId });
};

// ═══════════════════════════════════════════════════════════════
// SECTION 5 — AI CHATBOT: SESSION MANAGEMENT
// Ref: PLAN §2.5 | SPEC §4.2 (AI Chatbot) | FR-12..FR-16
// Endpoints: POST /ai/chat/sessions
//            POST /ai/chat/sessions/:id/messages
//            PATCH /ai/chat/sessions/:id/end
// ═══════════════════════════════════════════════════════════════

/**
 * Tạo phiên chatbot mới cho student.
 *
 * EARS[Event]: WHEN a Student opens the Chatbot widget for the first time
 * in a session THEN the system SHALL create a new record in chatbot_sessions
 * (user_id, started_at = NOW(), ended_at = NULL) and return HTTP 201.
 *
 * @returns {Promise<import('axios').AxiosResponse>}
 *   201 Created { success, data: { session_id } }
 */
export const createChatSession = () => {
  return api.post('/ai/chat/sessions');
};

/**
 * Gửi tin nhắn vào phiên chatbot đang hoạt động.
 *
 * EARS[Event]: WHEN a Student sends a chat message
 * THEN the system SHALL: validate session ownership and open state,
 * check budget, INSERT user message, call Claude API with history
 * capped at 20 recent messages, INSERT assistant message with tokens_used,
 * and return HTTP 201 with the AI reply.
 *
 * EARS[State-driven]: WHILE a chatbot_session has ended_at = NULL
 * AND the student sends a new message THE system SHALL continue appending
 * messages to that same session (do not create a new session per message).
 *
 * EARS[Unwanted]: WHERE the session has ended_at IS NOT NULL (session closed)
 * THEN the system SHALL return HTTP 409 Conflict.
 *
 * EARS[Unwanted]: WHERE message is empty or exceeds maximum allowed length
 * THEN the system SHALL return HTTP 400 Bad Request.
 *
 * EARS[Unwanted]: WHERE global AI budget is exceeded
 * THEN return HTTP 429 AI_USAGE_LIMIT_EXCEEDED before calling the provider.
 *
 * EARS[Unwanted]: WHERE the Claude API is unavailable
 * THEN return HTTP 503 AI_CHAT_001 — do NOT persist an empty assistant message.
 *
 * @param {string} sessionId - UUID của chatbot session đang hoạt động
 * @param {string} message - Nội dung tin nhắn của student (plain text)
 * @returns {Promise<import('axios').AxiosResponse>}
 *   201 Created { success, data: { reply, tokens_used } } |
 *   400 | 409 | 429 | 503
 */
export const sendChatMessage = (sessionId, message) => {
  return api.post(`/ai/chat/sessions/${sessionId}/messages`, { message });
};

/**
 * Kết thúc phiên chatbot (student đóng widget hoặc navigate away).
 *
 * EARS[Event]: WHEN a Student closes the Chatbot widget or navigates away
 * THEN the system SHALL set chatbot_sessions.ended_at = NOW().
 *
 * @param {string} sessionId - UUID của chatbot session cần đóng
 * @returns {Promise<import('axios').AxiosResponse>}
 *   200 OK { success, data: { message } } | 404
 */
export const endChatSession = (sessionId) => {
  return api.patch(`/ai/chat/sessions/${sessionId}/end`);
};

// ═══════════════════════════════════════════════════════════════
// SECTION 6 — TUTOR AI PRECHECK
// Ref: PLAN §2.5 (tutorPrecheckGet / tutorPrecheckPost) | FR-17
// Endpoints: GET  /api/v1/tutor/submissions/writing/:id/ai-precheck
//            POST /api/v1/tutor/submissions/writing/:id/ai-precheck
// ═══════════════════════════════════════════════════════════════

/**
 * Lấy kết quả AI precheck đã có cho một bài Writing (nếu tồn tại).
 *
 * EARS[Event]: WHEN a Tutor opens a Writing submission detail page
 * AND an ai_feedback_reports record already exists linked to this submission
 * THEN the system SHALL return the precheck data alongside submission data.
 *
 * EARS[Ubiquitous]: THE system SHALL NOT update writing_submissions.status
 * and SHALL NOT overwrite tutor_feedback_reports for any Tutor precheck operation.
 *
 * @param {string} submissionId - UUID của writing submission
 * @returns {Promise<import('axios').AxiosResponse>}
 *   200 OK { success, data: { precheck } } | 403 | 404
 */
export const getTutorPrecheck = (submissionId) => {
  return api.get(`/tutor/submissions/writing/${submissionId}/ai-precheck`);
};

/**
 * Yêu cầu tạo AI precheck mới cho bài Writing (async background job).
 *
 * EARS[Event]: WHEN a Tutor requests an AI precheck for a Writing submission
 * AND no precheck exists THEN the system SHALL enqueue a background job
 * and return HTTP 202 Accepted immediately (non-blocking).
 *
 * EARS[State-driven]: WHILE an existing precheck report is found
 * THE system SHALL return HTTP 200 with the existing data
 * WITHOUT enqueuing a new job or calling the provider.
 *
 * EARS[Unwanted]: WHERE the requesting user does not have Tutor role
 * OR does not have permission to view this submission
 * THEN the system SHALL return HTTP 403 Forbidden.
 *
 * EARS[Unwanted]: WHERE global AI budget is exceeded
 * THEN return HTTP 429 AI_USAGE_LIMIT_EXCEEDED before enqueueing.
 *
 * EARS[Ubiquitous]: THE Tutor precheck SHALL only INSERT ai_feedback_reports.
 * It MUST NOT update writing_submissions.status to 'ai_graded'
 * and MUST NOT overwrite tutor_feedback_reports.
 *
 * @param {string} submissionId - UUID của writing submission
 * @returns {Promise<import('axios').AxiosResponse>}
 *   202 Accepted | 200 OK (existing precheck) | 403 | 429
 */
export const requestTutorPrecheck = (submissionId) => {
  return api.post(`/tutor/submissions/writing/${submissionId}/ai-precheck`);
};

// ═══════════════════════════════════════════════════════════════
// SECTION 7 — ADMIN AI USAGE METRICS
// Ref: PLAN §2.5 (adminUsage) | SPEC §4 (FR-18, FR-19)
// Endpoint: GET /api/v1/admin/ai/usage
// ═══════════════════════════════════════════════════════════════

/**
 * Lấy tổng hợp AI usage metrics (Admin only).
 *
 * EARS[Event]: WHEN an Admin requests AI usage metrics with a date range
 * THEN the system SHALL aggregate token usage and call counts
 * from chatbot_messages, ai_explain_requests, ai_feedback_reports,
 * and platform_metrics_snapshots, then return HTTP 200.
 *
 * EARS[Ubiquitous]: THE system SHALL return aggregate metrics ONLY.
 * Essay content, chat messages, or any private user content
 * SHALL NOT appear in the admin usage response.
 *
 * EARS[Unwanted]: WHERE dateFrom or dateTo is missing or invalid
 * THEN the system SHALL return HTTP 400 Bad Request.
 *
 * EARS[Unwanted]: WHERE the requesting user does not have 'admin' role
 * THEN the system SHALL return HTTP 403 Forbidden.
 *
 * @param {Object} params - Query parameters
 * @param {string} params.dateFrom  - Start date ISO 8601 (e.g. '2026-01-01')
 * @param {string} params.dateTo    - End date ISO 8601 (e.g. '2026-01-31')
 * @param {string} [params.groupBy] - Optional: 'day' | 'feature'
 * @returns {Promise<import('axios').AxiosResponse>}
 *   200 OK { success, data: { metrics[] } } | 400 | 403
 */
export const getAdminAiUsage = ({ dateFrom, dateTo, groupBy } = {}) => {
  return api.get('/admin/ai/usage', {
    params: { dateFrom, dateTo, ...(groupBy && { groupBy }) },
  });
};
