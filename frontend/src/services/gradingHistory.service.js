/**
 * gradingHistory.service.js
 *
 * Service layer cho tính năng Lịch sử chấm bài (Tutor).
 * Theo CLAUDE.md pattern: export named async functions — không có HTTP req/res ở đây.
 *
 * API endpoints dự kiến (backend cần implement — xem agents_changelog.md):
 *   GET    /api/v1/grading/history          — danh sách có phân trang + filter
 *   GET    /api/v1/grading/history/:id      — chi tiết một bài chấm
 *   PATCH  /api/v1/grading/history/:id/revoke — thu hồi kết quả
 *   PATCH  /api/v1/grading/history/:id/score  — chỉnh sửa điểm
 *
 * Response format tuân thủ Constitution ARTICLE 2:
 *   { success: true, data: {...}, error: null, meta: { page, total } }
 */

import axios from 'axios';

const BASE = '/api/v1/grading/history';

// ─── Mock data (dùng tạm đến khi backend sẵn sàng) ──────────────────────────
export const MOCK_HISTORY = [
  {
    id: 'sub-w-001',
    time: '14:30', date: '10/06/2026',
    rawDate: new Date('2026-06-10T14:30:00'),
    studentName: 'Nguyễn Văn A', studentCode: 'HS001',
    testName: 'Mock Test Tháng 6 - Writing',
    skill: 'writing', band: 6.5,
    feedbackTypes: ['Text', 'Audio feedback'],
    status: 'graded',
  },
  {
    id: 'sub-s-002',
    time: '11:15', date: '10/06/2026',
    rawDate: new Date('2026-06-10T11:15:00'),
    studentName: 'Trần Thị B', studentCode: 'HS002',
    testName: 'Cambridge IELTS 18 - Listening',
    skill: 'speaking', band: 7.0,
    feedbackTypes: ['Audio feedback'],
    status: 'edited',
  },
  {
    id: 'sub-w-003',
    time: '09:00', date: '10/06/2026',
    rawDate: new Date('2026-06-10T09:00:00'),
    studentName: 'Lê Văn C', studentCode: 'HS003',
    testName: 'Mock Test T5 - Writing',
    skill: 'writing', band: 5.5,
    feedbackTypes: ['Private note', 'Text'],
    status: 'disputed',
  },
  {
    id: 'sub-s-004',
    time: '16:45', date: '09/06/2026',
    rawDate: new Date('2026-06-09T16:45:00'),
    studentName: 'Phạm Thị D', studentCode: 'HS004',
    testName: 'Cambridge IELTS 17 - Speaking',
    skill: 'speaking', band: 6.0,
    feedbackTypes: ['Text', 'Audio feedback'],
    status: 'graded',
  },
  {
    id: 'sub-w-005',
    time: '13:20', date: '09/06/2026',
    rawDate: new Date('2026-06-09T13:20:00'),
    studentName: 'Dương Dũng', studentCode: 'HS005',
    testName: 'Cam 18 - Reading',
    skill: 'writing', band: 7.5,
    feedbackTypes: ['Text', 'Audio feedback'],
    status: 'graded',
  },
  {
    id: 'sub-s-006',
    time: '10:05', date: '09/06/2026',
    rawDate: new Date('2026-06-09T10:05:00'),
    studentName: 'Em En', studentCode: 'HS006',
    testName: 'Mock Test T6 - Listening',
    skill: 'speaking', band: 6.5,
    feedbackTypes: ['Private note'],
    status: 'graded',
  },
  {
    id: 'sub-w-007',
    time: '08:45', date: '08/06/2026',
    rawDate: new Date('2026-06-08T08:45:00'),
    studentName: 'Phạm Quỳnh', studentCode: 'HS007',
    testName: 'Cambridge IELTS 17 - Writing Task 1',
    skill: 'writing', band: 5.0,
    feedbackTypes: ['Text'],
    status: 'edited',
  },
  {
    id: 'sub-s-008',
    time: '15:30', date: '07/06/2026',
    rawDate: new Date('2026-06-07T15:30:00'),
    studentName: 'Hoàng Minh', studentCode: 'HS008',
    testName: 'Mock Test T4 - Speaking Part 2',
    skill: 'speaking', band: 8.0,
    feedbackTypes: ['Text', 'Private note'],
    status: 'graded',
  },
];

// ─── API Functions ───────────────────────────────────────────────────────────

/**
 * Lấy danh sách lịch sử chấm bài (có filter + phân trang).
 *
 * @param {object} params
 * @param {string}  params.skill     — 'writing' | 'speaking' | undefined
 * @param {string}  params.timeRange — 'week' | 'month' | 'custom' | undefined
 * @param {number}  params.bandMin   — band score tối thiểu
 * @param {number}  params.bandMax   — band score tối đa
 * @param {string}  params.search    — keyword tìm kiếm
 * @param {number}  params.page      — trang hiện tại (bắt đầu từ 1)
 * @param {number}  params.pageSize  — số bài mỗi trang
 * @returns {Promise<{ success, data, error, meta }>}
 */
export async function getGradingHistory(params = {}) {
  // TODO: bỏ comment khi backend sẵn sàng, xóa phần mock phía dưới
  // const { data } = await axios.get(BASE, { params });
  // return data;

  // Mock response theo format { success, data, error, meta }
  return {
    success: true,
    data: MOCK_HISTORY,
    error: null,
    meta: { page: params.page ?? 1, total: MOCK_HISTORY.length },
  };
}

/**
 * Lấy chi tiết một bài chấm theo id.
 *
 * @param {string} id — submission id
 * @returns {Promise<{ success, data, error, meta }>}
 */
export async function getGradingHistoryById(id) {
  // TODO: bỏ comment khi backend sẵn sàng
  // const { data } = await axios.get(`${BASE}/${id}`);
  // return data;

  const record = MOCK_HISTORY.find((r) => r.id === id);
  return record
    ? { success: true, data: record, error: null, meta: {} }
    : { success: false, data: null, error: { code: 'NOT_FOUND', message: 'Không tìm thấy bài chấm' }, meta: {} };
}

/**
 * Thu hồi kết quả đã công bố.
 *
 * @param {string} id — submission id
 * @returns {Promise<{ success, data, error, meta }>}
 */
export async function revokeGradingResult(id) {
  // TODO: bỏ comment khi backend sẵn sàng
  // const { data } = await axios.patch(`${BASE}/${id}/revoke`);
  // return data;

  return { success: true, data: { id, status: 'revoked' }, error: null, meta: {} };
}

/**
 * Cập nhật điểm Band và ghi chú của một bài chấm.
 *
 * @param {string} id      — submission id
 * @param {object} payload — { band_score, private_note }
 * @returns {Promise<{ success, data, error, meta }>}
 */
export async function updateGradingScore(id, payload) {
  // TODO: bỏ comment khi backend sẵn sàng
  // const { data } = await axios.patch(`${BASE}/${id}/score`, payload);
  // return data;

  return { success: true, data: { id, ...payload }, error: null, meta: {} };
}
