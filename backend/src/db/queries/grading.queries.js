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

  if (status) {
    values.push(status);
  }

  const limitIdx = values.length + 1;
  const offsetIdx = values.length + 2;
  values.push(limit, offset);

  const query = `
    SELECT * FROM (
      SELECT
        ws.id,
        'writing'                               AS type,
        u.full_name                             AS student,
        CONCAT('Writing Task ', ws.task_number) AS skill,
        ws.grader::text                         AS grader,
        ws.status::text                         AS status,
        ws.submitted_at
      FROM writing_submissions ws
      JOIN users u ON u.id = ws.user_id
      ${status ? `WHERE ws.status::text = $1` : ''}

      UNION ALL

      SELECT
        ss.id,
        'speaking'                             AS type,
        u.full_name                            AS student,
        CONCAT('Speaking Part ', ss.part_number) AS skill,
        ss.grader::text                        AS grader,
        ss.status::text                        AS status,
        ss.submitted_at
      FROM speaking_submissions ss
      JOIN users u ON u.id = ss.user_id
      ${status ? `WHERE ss.status::text = $1` : ''}
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
      SELECT status FROM writing_submissions
      UNION ALL
      SELECT status FROM speaking_submissions
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
    WHERE id = $1
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
    WHERE id = $1
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
