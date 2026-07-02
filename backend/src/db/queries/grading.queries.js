/**
 * @file backend/src/db/queries/grading.queries.js
 * @description Data access layer for admin grading oversight.
 *
 * Kết hợp dữ liệu từ writing_submissions và speaking_submissions
 * để tạo một unified view cho Admin quản lý hàng đợi chấm bài.
 *
 * Cả hai bảng đều dùng ENUM `submission_status` nên UNION ALL hoạt động tốt.
 */

const { pool } = require('../pool');

/**
 * Lấy toàn bộ danh sách bài nộp (writing + speaking) cho trang Giám sát chấm bài.
 * Mỗi row được normalize về cùng một shape để frontend dùng được.
 *
 * @param {object} opts - { status?, limit?, offset? }
 * @returns {Promise<Array>}
 */
const listSubmissionsRaw = async ({ status, limit = 50, offset = 0 } = {}) => {
  const values = [];
  let statusFilter = '';

  if (status) {
    values.push(status);
    statusFilter = `AND status = $1`;
  }

  const limitIdx = values.length + 1;
  const offsetIdx = values.length + 2;
  values.push(limit, offset);

  const query = `
    SELECT * FROM (
      SELECT
        COALESCE(ws.writing_group_id, ws.id)::text AS id,
        'writing'                               AS type,
        u.full_name                             AS student,
        'Writing'                               AS skill,
        MIN(ws.grader::text)                    AS grader,
        MIN(ws.status::text)                    AS status,
        MIN(ws.submitted_at)                    AS submitted_at
      FROM writing_submissions ws
      JOIN users u ON u.id = ws.user_id
      ${status ? `WHERE ws.status::text = $1` : ''}
      GROUP BY COALESCE(ws.writing_group_id, ws.id), u.full_name

      UNION ALL

      SELECT
        COALESCE(ss.speaking_group_id, ss.id)::text AS id,
        'speaking'                             AS type,
        u.full_name                            AS student,
        'Speaking'                             AS skill,
        MIN(ss.grader::text)                   AS grader,
        MIN(ss.status::text)                   AS status,
        MIN(ss.submitted_at)                   AS submitted_at
      FROM speaking_submissions ss
      JOIN users u ON u.id = ss.user_id
      ${status ? `WHERE ss.status::text = $1` : ''}
      GROUP BY COALESCE(ss.speaking_group_id, ss.id), u.full_name
    ) combined
    ORDER BY submitted_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx};
  `;

  const { rows } = await pool.query(query, values);
  return rows;
};

/**
 * Đếm số bài theo từng status (gộp cả writing + speaking).
 * Dùng để tạo stat cards.
 */
const countSubmissionsByStatus = async () => {
  const query = `
    SELECT status::text, COUNT(*)::int AS count FROM (
      SELECT MIN(status) as status FROM writing_submissions GROUP BY COALESCE(writing_group_id, id)
      UNION ALL
      SELECT MIN(status) as status FROM speaking_submissions GROUP BY COALESCE(speaking_group_id, id)
    ) combined
    GROUP BY status;
  `;
  const { rows } = await pool.query(query);
  return rows.reduce((acc, r) => {
    acc[r.status] = r.count;
    return acc;
  }, {});
};

/**
 * Cập nhật trạng thái của bài nộp writing về pending (để AI retry).
 */
const resetWritingSubmissionStatus = async (id) => {
  const query = `
    UPDATE writing_submissions
    SET status = 'pending'
    WHERE writing_group_id = $1 OR id = $1
    RETURNING id, status, submitted_at;
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
};

/**
 * Cập nhật trạng thái của bài nộp speaking về pending (để AI retry).
 */
const resetSpeakingSubmissionStatus = async (id) => {
  const query = `
    UPDATE speaking_submissions
    SET status = 'pending'
    WHERE speaking_group_id = $1 OR id = $1
    RETURNING id, status, submitted_at;
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
};

module.exports = {
  listSubmissionsRaw,
  countSubmissionsByStatus,
  resetWritingSubmissionStatus,
  resetSpeakingSubmissionStatus
};
