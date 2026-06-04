/**
 * @file aiApi.test.js
 * @description Unit Tests — AI API Client Service (T039)
 *
 * ─────────────────────────────────────────────────────────────────
 * TRACEABILITY MATRIX
 * ─────────────────────────────────────────────────────────────────
 * Test ID   │ Requirement                             │ Source
 * ──────────┼─────────────────────────────────────────┼──────────────────────────────────
 * TC-WR-01  │ evaluateWriting → 202 (enqueued)        │ SPEC §4.2, PLAN §2.5, FR-01
 * TC-WR-02  │ evaluateWriting → 200 (existing report) │ SPEC §4.4 (AI_GRADE_DUP), FR-01
 * TC-WR-03  │ evaluateWriting → 400 (invalid state)   │ SPEC §4.2 (status != pending)
 * TC-WR-04  │ evaluateWriting → 403 (not owner/grader)│ SPEC §4.4, PLAN §3 Flow 1
 * TC-WR-05  │ evaluateWriting → 404 (not found)       │ PLAN §3 Flow 1
 * TC-WR-06  │ evaluateWriting → 429 (budget exceeded) │ SPEC §7, PLAN §1 Budget Control
 * ──────────┼─────────────────────────────────────────┼──────────────────────────────────
 * TC-SP-01  │ evaluateSpeaking → 202 (enqueued)       │ SPEC §4.2, PLAN §2.5, FR-05
 * TC-SP-02  │ evaluateSpeaking → 200 (existing report)│ SPEC §4.4 (AI_GRADE_DUP)
 * TC-SP-03  │ evaluateSpeaking → 400 (no audio_url)   │ SPEC §4.4 (AI_GRADE_003)
 * TC-SP-04  │ evaluateSpeaking → 422 (low confidence) │ SPEC §4.4 (AI_GRADE_002)
 * TC-SP-05  │ evaluateSpeaking → 429 (budget exceeded)│ PLAN §1 Budget Control
 * ──────────┼─────────────────────────────────────────┼──────────────────────────────────
 * TC-RP-01  │ getReport → 200 with report + disclaimer│ SPEC §4.4, FR-21, PLAN §2.5
 * TC-RP-02  │ getReport → 403 (not owner/tutor/admin) │ PLAN §3 (Ubiquitous)
 * TC-RP-03  │ getReport → 404 (report not found)      │ PLAN §2.5
 * ──────────┼─────────────────────────────────────────┼──────────────────────────────────
 * TC-EX-01  │ explainQuestion → 201 (cache miss)      │ SPEC §4.2 (Explain), FR-09
 * TC-EX-02  │ explainQuestion → 200 (cache hit)       │ SPEC §4.2, FR-10, SPEC §7 Idem.
 * TC-EX-03  │ explainQuestion → 403 (no access)       │ SPEC §4.4, FR-11
 * TC-EX-04  │ explainQuestion → 429 (budget exceeded) │ PLAN §1, FR-09
 * TC-EX-05  │ explainQuestion → 503 (AI unavailable)  │ SPEC §4.3, AI_EXP_001
 * TC-EX-06  │ explainQuestion sends correct body       │ SPEC §5 (POST /ai/explain)
 * ──────────┼─────────────────────────────────────────┼──────────────────────────────────
 * TC-CS-01  │ createChatSession → 201 with session_id │ SPEC §4.2 (Chatbot), FR-12
 * ──────────┼─────────────────────────────────────────┼──────────────────────────────────
 * TC-CM-01  │ sendChatMessage → 201 with reply        │ SPEC §4.2, FR-13
 * TC-CM-02  │ sendChatMessage → 400 (empty message)   │ SPEC §4.4, FR-13
 * TC-CM-03  │ sendChatMessage → 409 (session ended)   │ SPEC §4.4, FR-14
 * TC-CM-04  │ sendChatMessage → 429 (budget exceeded) │ PLAN §1, FR-13
 * TC-CM-05  │ sendChatMessage → 503 (AI unavailable)  │ SPEC §4.3, AI_CHAT_001
 * TC-CM-06  │ sendChatMessage sends correct body/URL  │ SPEC §5
 * ──────────┼─────────────────────────────────────────┼──────────────────────────────────
 * TC-ES-01  │ endChatSession → 200 (success)          │ SPEC §4.2, FR-15
 * TC-ES-02  │ endChatSession → 404 (session not found)│ PLAN §2.5
 * ──────────┼─────────────────────────────────────────┼──────────────────────────────────
 * TC-TP-01  │ getTutorPrecheck → 200 (existing)       │ SPEC §4.2 (Tutor Pre-grading)
 * TC-TP-02  │ getTutorPrecheck → 403 (not tutor)      │ SPEC §2, PLAN §3 Flow 5
 * TC-TP-03  │ getTutorPrecheck → 404 (no precheck yet)│ PLAN §3 Flow 5
 * TC-TP-04  │ requestTutorPrecheck → 202 (enqueued)   │ FR-17, PLAN §3 Flow 5
 * TC-TP-05  │ requestTutorPrecheck → 200 (existing)   │ PLAN §3 Flow 5 (idempotency)
 * TC-TP-06  │ requestTutorPrecheck → 403 (forbidden)  │ PLAN §3 Flow 5
 * TC-TP-07  │ requestTutorPrecheck → 429 (budget)     │ PLAN §1, FR-17
 * ──────────┼─────────────────────────────────────────┼──────────────────────────────────
 * TC-AU-01  │ getAdminAiUsage → 200 (success)         │ FR-18, PLAN §2.5
 * TC-AU-02  │ getAdminAiUsage → 400 (invalid dates)   │ PLAN §2.5, FR-19
 * TC-AU-03  │ getAdminAiUsage → 403 (not admin)       │ SPEC §2
 * TC-AU-04  │ getAdminAiUsage sends correct query params│ SPEC §5, PLAN §2.5
 * TC-AU-05  │ getAdminAiUsage omits undefined groupBy │ PLAN §2.5 (optional param)
 * ─────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import api from '../../../src/services/api';
import {
  evaluateWriting,
  evaluateSpeaking,
  getReport,
  explainQuestion,
  createChatSession,
  sendChatMessage,
  endChatSession,
  getTutorPrecheck,
  requestTutorPrecheck,
  getAdminAiUsage,
} from '../../../src/services/aiApi';

// ─────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────
const SUBMISSION_ID = 'sub-uuid-1234';
const REPORT_ID = 'rpt-uuid-5678';
const QUESTION_ID = 'qst-uuid-9012';
const SESSION_ID = 'ses-uuid-3456';

const MOCK_REPORT = {
  id: REPORT_ID,
  band_score: 7.0,
  task_achievement_score: 7.0,
  coherence_score: 7.0,
  lexical_score: 7.0,
  grammar_score: 7.0,
  error_highlights: [],
  suggestions: 'Good essay.',
  disclaimer: 'This report was generated by AI.',
};

const MOCK_METRICS = [
  { date: '2026-06-01', ai_calls_total: 10, ai_tokens_total: 5000, feature: 'writing_evaluation' },
];

// ─────────────────────────────────────────────
// Setup / Teardown
// ─────────────────────────────────────────────
describe('AI API Client Service (aiApi.js)', () => {
  let mock;

  beforeEach(() => {
    mock = new MockAdapter(api);
  });

  afterEach(() => {
    mock.reset();
  });

  // ═══════════════════════════════════════════════════════════════
  // evaluateWriting
  // ═══════════════════════════════════════════════════════════════
  describe('evaluateWriting(submissionId)', () => {
    // TC-WR-01
    it('TC-WR-01: SHOULD return 202 Accepted when evaluation job is enqueued successfully', async () => {
      const body = { success: true, data: { message: 'AI evaluation job enqueued.' }, error: null, meta: {} };
      mock.onPost(`/ai/writing/evaluate/${SUBMISSION_ID}`).reply(202, body);

      const res = await evaluateWriting(SUBMISSION_ID);

      expect(res.status).toBe(202);
      expect(res.data.success).toBe(true);
      expect(res.data.data.message).toBeDefined();
    });

    // TC-WR-02
    it('TC-WR-02: SHOULD return 200 when an existing report is found (idempotency — no double-billing)', async () => {
      const body = { success: true, data: { report: MOCK_REPORT }, error: null, meta: {} };
      mock.onPost(`/ai/writing/evaluate/${SUBMISSION_ID}`).reply(200, body);

      const res = await evaluateWriting(SUBMISSION_ID);

      expect(res.status).toBe(200);
      expect(res.data.data.report.id).toBe(REPORT_ID);
    });

    // TC-WR-03
    it('TC-WR-03: SHOULD reject with 400 when submission status is not "pending"', async () => {
      const body = { success: false, data: null, error: { code: 'INVALID_SUBMISSION_STATE', message: 'Submission is not in pending state.' }, meta: {} };
      mock.onPost(`/ai/writing/evaluate/${SUBMISSION_ID}`).reply(400, body);

      await expect(evaluateWriting(SUBMISSION_ID)).rejects.toMatchObject({
        response: { status: 400 },
      });
    });

    // TC-WR-04
    it('TC-WR-04: SHOULD reject with 403 when user does not own submission or grader != "ai"', async () => {
      const body = { success: false, data: null, error: { code: 'AI_FORBIDDEN', message: 'Forbidden.' }, meta: {} };
      mock.onPost(`/ai/writing/evaluate/${SUBMISSION_ID}`).reply(403, body);

      await expect(evaluateWriting(SUBMISSION_ID)).rejects.toMatchObject({
        response: { status: 403 },
      });
    });

    // TC-WR-05
    it('TC-WR-05: SHOULD reject with 404 when submission is not found', async () => {
      mock.onPost(`/ai/writing/evaluate/${SUBMISSION_ID}`).reply(404, {
        success: false, data: null, error: { code: 'NOT_FOUND' }, meta: {},
      });

      await expect(evaluateWriting(SUBMISSION_ID)).rejects.toMatchObject({
        response: { status: 404 },
      });
    });

    // TC-WR-06
    it('TC-WR-06: SHOULD reject with 429 when global AI budget is exceeded', async () => {
      mock.onPost(`/ai/writing/evaluate/${SUBMISSION_ID}`).reply(429, {
        success: false, data: null, error: { code: 'AI_USAGE_LIMIT_EXCEEDED', message: 'Daily token budget exceeded.' }, meta: {},
      });

      await expect(evaluateWriting(SUBMISSION_ID)).rejects.toMatchObject({
        response: { status: 429 },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // evaluateSpeaking
  // ═══════════════════════════════════════════════════════════════
  describe('evaluateSpeaking(submissionId)', () => {
    // TC-SP-01
    it('TC-SP-01: SHOULD return 202 Accepted when STT + AI evaluation job is enqueued', async () => {
      mock.onPost(`/ai/speaking/evaluate/${SUBMISSION_ID}`).reply(202, {
        success: true, data: { message: 'Speaking AI evaluation job enqueued.' }, error: null, meta: {},
      });

      const res = await evaluateSpeaking(SUBMISSION_ID);
      expect(res.status).toBe(202);
    });

    // TC-SP-02
    it('TC-SP-02: SHOULD return 200 when an existing report is found (idempotency)', async () => {
      mock.onPost(`/ai/speaking/evaluate/${SUBMISSION_ID}`).reply(200, {
        success: true, data: { report: { ...MOCK_REPORT, speaking_submission_id: SUBMISSION_ID } }, error: null, meta: {},
      });

      const res = await evaluateSpeaking(SUBMISSION_ID);
      expect(res.status).toBe(200);
      expect(res.data.data.report.speaking_submission_id).toBe(SUBMISSION_ID);
    });

    // TC-SP-03
    it('TC-SP-03: SHOULD reject with 400 (AI_GRADE_003) when audio_url is not accessible', async () => {
      mock.onPost(`/ai/speaking/evaluate/${SUBMISSION_ID}`).reply(400, {
        success: false, data: null, error: { code: 'AI_GRADE_003', message: 'Audio file is not accessible. Please re-upload.' }, meta: {},
      });

      await expect(evaluateSpeaking(SUBMISSION_ID)).rejects.toMatchObject({
        response: { status: 400, data: { error: { code: 'AI_GRADE_003' } } },
      });
    });

    // TC-SP-04
    it('TC-SP-04: SHOULD reject with 422 (AI_GRADE_002) when STT confidence < 0.6 or transcript < 30 words', async () => {
      mock.onPost(`/ai/speaking/evaluate/${SUBMISSION_ID}`).reply(422, {
        success: false, data: null,
        error: { code: 'AI_GRADE_002', message: 'Audio quality insufficient for analysis. Please re-record in a quiet environment.' },
        meta: {},
      });

      await expect(evaluateSpeaking(SUBMISSION_ID)).rejects.toMatchObject({
        response: { status: 422, data: { error: { code: 'AI_GRADE_002' } } },
      });
    });

    // TC-SP-05
    it('TC-SP-05: SHOULD reject with 429 when global AI budget is exceeded', async () => {
      mock.onPost(`/ai/speaking/evaluate/${SUBMISSION_ID}`).reply(429, {
        success: false, data: null, error: { code: 'AI_USAGE_LIMIT_EXCEEDED' }, meta: {},
      });

      await expect(evaluateSpeaking(SUBMISSION_ID)).rejects.toMatchObject({
        response: { status: 429 },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getReport
  // ═══════════════════════════════════════════════════════════════
  describe('getReport(reportId)', () => {
    // TC-RP-01
    it('TC-RP-01: SHOULD return 200 with report data and AI disclaimer (no raw provider metadata)', async () => {
      mock.onGet(`/ai/reports/${REPORT_ID}`).reply(200, {
        success: true,
        data: { report: MOCK_REPORT, disclaimer: 'This report was generated by AI and may not be 100% accurate.' },
        error: null,
        meta: {},
      });

      const res = await getReport(REPORT_ID);

      expect(res.status).toBe(200);
      expect(res.data.data.report.band_score).toBe(7.0);
      expect(res.data.data.disclaimer).toBeDefined();
      // EARS[Ubiquitous]: raw_ai_response (containing API key/prompt) must NOT be exposed
      expect(res.data.data.report.raw_ai_response).toBeUndefined();
    });

    // TC-RP-02
    it('TC-RP-02: SHOULD reject with 403 when user is not owner, tutor, or admin', async () => {
      mock.onGet(`/ai/reports/${REPORT_ID}`).reply(403, {
        success: false, data: null, error: { code: 'AI_FORBIDDEN', message: 'Forbidden.' }, meta: {},
      });

      await expect(getReport(REPORT_ID)).rejects.toMatchObject({
        response: { status: 403 },
      });
    });

    // TC-RP-03
    it('TC-RP-03: SHOULD reject with 404 when report is not found', async () => {
      mock.onGet(`/ai/reports/${REPORT_ID}`).reply(404, {
        success: false, data: null, error: { code: 'NOT_FOUND' }, meta: {},
      });

      await expect(getReport(REPORT_ID)).rejects.toMatchObject({
        response: { status: 404 },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // explainQuestion
  // ═══════════════════════════════════════════════════════════════
  describe('explainQuestion(questionId)', () => {
    // TC-EX-01
    it('TC-EX-01: SHOULD return 201 Created on cache miss (new explanation generated)', async () => {
      mock.onPost('/ai/explain').reply(201, {
        success: true,
        data: { ai_response: 'The answer is B because...', tokens_used: 312 },
        error: null,
        meta: {},
      });

      const res = await explainQuestion(QUESTION_ID);

      expect(res.status).toBe(201);
      expect(res.data.data.ai_response).toBeDefined();
    });

    // TC-EX-02
    it('TC-EX-02: SHOULD return 200 on cache hit (existing explanation — Claude NOT called again)', async () => {
      mock.onPost('/ai/explain').reply(200, {
        success: true,
        data: { ai_response: 'Cached: The answer is B because...', tokens_used: 0 },
        error: null,
        meta: {},
      });

      const res = await explainQuestion(QUESTION_ID);

      expect(res.status).toBe(200);
      expect(res.data.data.ai_response).toContain('Cached');
    });

    // TC-EX-03
    it('TC-EX-03: SHOULD reject with 403 when student does not have access to question', async () => {
      mock.onPost('/ai/explain').reply(403, {
        success: false, data: null, error: { code: 'AI_FORBIDDEN', message: 'You do not have access to this question.' }, meta: {},
      });

      await expect(explainQuestion(QUESTION_ID)).rejects.toMatchObject({
        response: { status: 403 },
      });
    });

    // TC-EX-04
    it('TC-EX-04: SHOULD reject with 429 when global AI budget is exceeded', async () => {
      mock.onPost('/ai/explain').reply(429, {
        success: false, data: null, error: { code: 'AI_USAGE_LIMIT_EXCEEDED' }, meta: {},
      });

      await expect(explainQuestion(QUESTION_ID)).rejects.toMatchObject({
        response: { status: 429 },
      });
    });

    // TC-EX-05
    it('TC-EX-05: SHOULD reject with 503 (AI_EXP_001) when Claude API is unavailable', async () => {
      mock.onPost('/ai/explain').reply(503, {
        success: false, data: null,
        error: { code: 'AI_EXP_001', message: 'AI explanation is temporarily unavailable. Please try again shortly.' },
        meta: {},
      });

      await expect(explainQuestion(QUESTION_ID)).rejects.toMatchObject({
        response: { status: 503, data: { error: { code: 'AI_EXP_001' } } },
      });
    });

    // TC-EX-06
    it('TC-EX-06: SHOULD send question_id in request body', async () => {
      mock.onPost('/ai/explain').reply(201, { success: true, data: {}, error: null, meta: {} });

      await explainQuestion(QUESTION_ID);

      const sentBody = JSON.parse(mock.history.post[0].data);
      expect(sentBody).toEqual({ question_id: QUESTION_ID });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // createChatSession
  // ═══════════════════════════════════════════════════════════════
  describe('createChatSession()', () => {
    // TC-CS-01
    it('TC-CS-01: SHOULD return 201 Created with a session_id', async () => {
      mock.onPost('/ai/chat/sessions').reply(201, {
        success: true, data: { session_id: SESSION_ID }, error: null, meta: {},
      });

      const res = await createChatSession();

      expect(res.status).toBe(201);
      expect(res.data.data.session_id).toBe(SESSION_ID);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // sendChatMessage
  // ═══════════════════════════════════════════════════════════════
  describe('sendChatMessage(sessionId, message)', () => {
    const MESSAGE = 'What is the difference between Task 1 and Task 2?';

    // TC-CM-01
    it('TC-CM-01: SHOULD return 201 with AI reply on success', async () => {
      mock.onPost(`/ai/chat/sessions/${SESSION_ID}/messages`).reply(201, {
        success: true,
        data: { reply: 'Task 1 requires describing a chart...', tokens_used: 145 },
        error: null,
        meta: {},
      });

      const res = await sendChatMessage(SESSION_ID, MESSAGE);

      expect(res.status).toBe(201);
      expect(res.data.data.reply).toBeDefined();
      expect(res.data.data.tokens_used).toBeGreaterThan(0);
    });

    // TC-CM-02
    it('TC-CM-02: SHOULD reject with 400 when message is empty or exceeds max length', async () => {
      mock.onPost(`/ai/chat/sessions/${SESSION_ID}/messages`).reply(400, {
        success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Message cannot be empty.' }, meta: {},
      });

      await expect(sendChatMessage(SESSION_ID, '')).rejects.toMatchObject({
        response: { status: 400 },
      });
    });

    // TC-CM-03
    it('TC-CM-03: SHOULD reject with 409 Conflict when session has already ended', async () => {
      mock.onPost(`/ai/chat/sessions/${SESSION_ID}/messages`).reply(409, {
        success: false, data: null,
        error: { code: 'SESSION_ENDED', message: 'This chat session has ended. Please start a new session.' },
        meta: {},
      });

      await expect(sendChatMessage(SESSION_ID, MESSAGE)).rejects.toMatchObject({
        response: { status: 409 },
      });
    });

    // TC-CM-04
    it('TC-CM-04: SHOULD reject with 429 when global AI budget is exceeded', async () => {
      mock.onPost(`/ai/chat/sessions/${SESSION_ID}/messages`).reply(429, {
        success: false, data: null, error: { code: 'AI_USAGE_LIMIT_EXCEEDED' }, meta: {},
      });

      await expect(sendChatMessage(SESSION_ID, MESSAGE)).rejects.toMatchObject({
        response: { status: 429 },
      });
    });

    // TC-CM-05
    it('TC-CM-05: SHOULD reject with 503 (AI_CHAT_001) when Claude API is unavailable', async () => {
      mock.onPost(`/ai/chat/sessions/${SESSION_ID}/messages`).reply(503, {
        success: false, data: null,
        error: { code: 'AI_CHAT_001', message: 'AI assistant is temporarily unavailable. Please try again shortly.' },
        meta: {},
      });

      await expect(sendChatMessage(SESSION_ID, MESSAGE)).rejects.toMatchObject({
        response: { status: 503, data: { error: { code: 'AI_CHAT_001' } } },
      });
    });

    // TC-CM-06
    it('TC-CM-06: SHOULD POST to correct URL and send message in request body', async () => {
      mock.onPost(`/ai/chat/sessions/${SESSION_ID}/messages`).reply(201, {
        success: true, data: { reply: 'OK', tokens_used: 10 }, error: null, meta: {},
      });

      await sendChatMessage(SESSION_ID, MESSAGE);

      expect(mock.history.post[0].url).toBe(`/ai/chat/sessions/${SESSION_ID}/messages`);
      const body = JSON.parse(mock.history.post[0].data);
      expect(body).toEqual({ message: MESSAGE });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // endChatSession
  // ═══════════════════════════════════════════════════════════════
  describe('endChatSession(sessionId)', () => {
    // TC-ES-01
    it('TC-ES-01: SHOULD return 200 when session is ended successfully', async () => {
      mock.onPatch(`/ai/chat/sessions/${SESSION_ID}/end`).reply(200, {
        success: true, data: { message: 'Session ended.' }, error: null, meta: {},
      });

      const res = await endChatSession(SESSION_ID);

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });

    // TC-ES-02
    it('TC-ES-02: SHOULD reject with 404 when session is not found', async () => {
      mock.onPatch(`/ai/chat/sessions/${SESSION_ID}/end`).reply(404, {
        success: false, data: null, error: { code: 'NOT_FOUND', message: 'Session not found.' }, meta: {},
      });

      await expect(endChatSession(SESSION_ID)).rejects.toMatchObject({
        response: { status: 404 },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getTutorPrecheck
  // ═══════════════════════════════════════════════════════════════
  describe('getTutorPrecheck(submissionId)', () => {
    // TC-TP-01
    it('TC-TP-01: SHOULD return 200 with existing precheck data', async () => {
      const precheck = { id: 'pre-uuid-001', band_score: 6.5, suggestions: 'Grammar issues noted.' };
      mock.onGet(`/tutor/submissions/writing/${SUBMISSION_ID}/ai-precheck`).reply(200, {
        success: true, data: { precheck }, error: null, meta: {},
      });

      const res = await getTutorPrecheck(SUBMISSION_ID);

      expect(res.status).toBe(200);
      expect(res.data.data.precheck.band_score).toBe(6.5);
    });

    // TC-TP-02
    it('TC-TP-02: SHOULD reject with 403 when user is not a Tutor', async () => {
      mock.onGet(`/tutor/submissions/writing/${SUBMISSION_ID}/ai-precheck`).reply(403, {
        success: false, data: null, error: { code: 'AI_FORBIDDEN', message: 'Tutor role required.' }, meta: {},
      });

      await expect(getTutorPrecheck(SUBMISSION_ID)).rejects.toMatchObject({
        response: { status: 403 },
      });
    });

    // TC-TP-03
    it('TC-TP-03: SHOULD reject with 404 when no precheck exists yet', async () => {
      mock.onGet(`/tutor/submissions/writing/${SUBMISSION_ID}/ai-precheck`).reply(404, {
        success: false, data: null, error: { code: 'NOT_FOUND', message: 'No AI precheck found for this submission.' }, meta: {},
      });

      await expect(getTutorPrecheck(SUBMISSION_ID)).rejects.toMatchObject({
        response: { status: 404 },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // requestTutorPrecheck
  // ═══════════════════════════════════════════════════════════════
  describe('requestTutorPrecheck(submissionId)', () => {
    // TC-TP-04
    it('TC-TP-04: SHOULD return 202 Accepted when precheck job is enqueued', async () => {
      mock.onPost(`/tutor/submissions/writing/${SUBMISSION_ID}/ai-precheck`).reply(202, {
        success: true, data: { message: 'Tutor precheck job enqueued.' }, error: null, meta: {},
      });

      const res = await requestTutorPrecheck(SUBMISSION_ID);

      expect(res.status).toBe(202);
      expect(res.data.data.message).toBeDefined();
    });

    // TC-TP-05
    it('TC-TP-05: SHOULD return 200 when an existing precheck is found (idempotency)', async () => {
      const precheck = { id: 'pre-uuid-002', band_score: 7.0 };
      mock.onPost(`/tutor/submissions/writing/${SUBMISSION_ID}/ai-precheck`).reply(200, {
        success: true, data: { precheck }, error: null, meta: {},
      });

      const res = await requestTutorPrecheck(SUBMISSION_ID);

      expect(res.status).toBe(200);
      expect(res.data.data.precheck).toBeDefined();
    });

    // TC-TP-06
    it('TC-TP-06: SHOULD reject with 403 when tutor does not have access to this submission', async () => {
      mock.onPost(`/tutor/submissions/writing/${SUBMISSION_ID}/ai-precheck`).reply(403, {
        success: false, data: null, error: { code: 'AI_FORBIDDEN' }, meta: {},
      });

      await expect(requestTutorPrecheck(SUBMISSION_ID)).rejects.toMatchObject({
        response: { status: 403 },
      });
    });

    // TC-TP-07
    it('TC-TP-07: SHOULD reject with 429 when global AI budget is exceeded', async () => {
      mock.onPost(`/tutor/submissions/writing/${SUBMISSION_ID}/ai-precheck`).reply(429, {
        success: false, data: null, error: { code: 'AI_USAGE_LIMIT_EXCEEDED' }, meta: {},
      });

      await expect(requestTutorPrecheck(SUBMISSION_ID)).rejects.toMatchObject({
        response: { status: 429 },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getAdminAiUsage
  // ═══════════════════════════════════════════════════════════════
  describe('getAdminAiUsage({ dateFrom, dateTo, groupBy })', () => {
    const DATE_FROM = '2026-06-01';
    const DATE_TO = '2026-06-04';

    // TC-AU-01
    it('TC-AU-01: SHOULD return 200 with aggregated metrics (no private content)', async () => {
      mock.onGet('/admin/ai/usage').reply(200, {
        success: true, data: { metrics: MOCK_METRICS }, error: null, meta: {},
      });

      const res = await getAdminAiUsage({ dateFrom: DATE_FROM, dateTo: DATE_TO });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.data.metrics)).toBe(true);
      // EARS[Ubiquitous]: response must NOT contain essay or chat content
      const metric = res.data.data.metrics[0];
      expect(metric.essay_text).toBeUndefined();
      expect(metric.chat_content).toBeUndefined();
    });

    // TC-AU-02
    it('TC-AU-02: SHOULD reject with 400 when date range is invalid or missing', async () => {
      mock.onGet('/admin/ai/usage').reply(400, {
        success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'dateFrom and dateTo are required.' }, meta: {},
      });

      await expect(getAdminAiUsage({})).rejects.toMatchObject({
        response: { status: 400 },
      });
    });

    // TC-AU-03
    it('TC-AU-03: SHOULD reject with 403 when user does not have admin role', async () => {
      mock.onGet('/admin/ai/usage').reply(403, {
        success: false, data: null, error: { code: 'FORBIDDEN', message: 'Admin role required.' }, meta: {},
      });

      await expect(getAdminAiUsage({ dateFrom: DATE_FROM, dateTo: DATE_TO })).rejects.toMatchObject({
        response: { status: 403 },
      });
    });

    // TC-AU-04
    it('TC-AU-04: SHOULD pass dateFrom, dateTo, and groupBy as query params', async () => {
      mock.onGet('/admin/ai/usage').reply(200, { success: true, data: { metrics: [] }, error: null, meta: {} });

      await getAdminAiUsage({ dateFrom: DATE_FROM, dateTo: DATE_TO, groupBy: 'day' });

      const params = mock.history.get[0].params;
      expect(params.dateFrom).toBe(DATE_FROM);
      expect(params.dateTo).toBe(DATE_TO);
      expect(params.groupBy).toBe('day');
    });

    // TC-AU-05
    it('TC-AU-05: SHOULD NOT include groupBy in params when it is undefined', async () => {
      mock.onGet('/admin/ai/usage').reply(200, { success: true, data: { metrics: [] }, error: null, meta: {} });

      await getAdminAiUsage({ dateFrom: DATE_FROM, dateTo: DATE_TO });

      const params = mock.history.get[0].params;
      expect(params.groupBy).toBeUndefined();
    });
  });
});
