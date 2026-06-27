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

import api from './api';

const BASE = '/tutors/grading-history';



// ─── API Functions ───────────────────────────────────────────────────────────

/**
 * Lấy danh sách thống kê chấm bài tháng này.
 * @returns {Promise<{ success, data, error, meta }>}
 */
export async function getGradingHistoryStats() {
  const { data } = await api.get(`${BASE}/stats`);
  return data;
}

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
  const { data } = await api.get(BASE, { params });
  return data;
}

/**
 * Lấy chi tiết một bài chấm theo id.
 *
 * @param {string} id — submission id
 * @returns {Promise<{ success, data, error, meta }>}
 */
export async function getGradingHistoryById(id) {
  const { data } = await api.get(`${BASE}/${id}`);
  return data;
}

/**
 * Thu hồi kết quả đã công bố.
 *
 * @param {string} id — submission id
 * @returns {Promise<{ success, data, error, meta }>}
 */
export async function revokeGradingResult(id) {
  const { data } = await api.patch(`${BASE}/${id}/revoke`);
  return data;
}

/**
 * Cập nhật điểm và nhận xét của một bài chấm.
 *
 * @param {string} id — submission id
 * @param {object} payload — data cập nhật (bandScore, feedback...)
 * @returns {Promise<{ success, data, error, meta }>}
 */
export async function updateGradingResult(id, payload) {
  const { data } = await api.patch(`${BASE}/${id}/score`, payload);
  return data;
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
