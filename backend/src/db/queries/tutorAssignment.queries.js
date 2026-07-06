/**
 * @file backend/src/db/queries/tutorAssignment.queries.js
 * @description Database queries for assigning tutors to submissions.
 */

const { pool } = require('../pool');

/**
 * Gets all active tutors.
 * @returns {Promise<Array>}
 */
const getTutors = async () => {
  const result = await pool.query(
    `SELECT id, full_name as name 
     FROM users 
     WHERE role = 'tutor' AND status = 'active'
     ORDER BY full_name ASC`
  );
  return result.rows;
};

/**
 * Gets all pending submissions (writing and speaking)
 * @returns {Promise<Array>}
 */
const getPendingSubmissions = async () => {
  const result = await pool.query(`
    SELECT 
      ws.writing_group_id::text as id, 
      u.full_name as student, 
      u.email, 
      'writing' as type,
      COUNT(ws.id)::int as task_or_part,
      MIN(mt.title) as test_title,
      u.target_band_score as target_band,
      MIN(ws.assigned_tutor_id::text) as tutor_id,
      MIN(ws.submitted_at) as submitted_at
    FROM writing_submissions ws
    JOIN users u ON ws.user_id = u.id
    LEFT JOIN mock_tests mt ON ws.test_id = mt.id
    WHERE ws.status = 'pending'
    GROUP BY ws.writing_group_id, u.full_name, u.email, u.target_band_score
    
    UNION ALL
    
    SELECT 
      ss.speaking_group_id::text as id, 
      u.full_name as student, 
      u.email, 
      'speaking' as type,
      COUNT(ss.id)::int as task_or_part,
      MIN(mt.title) as test_title,
      u.target_band_score as target_band,
      MIN(ss.assigned_tutor_id::text) as tutor_id,
      MIN(ss.submitted_at) as submitted_at
    FROM speaking_submissions ss
    JOIN users u ON ss.user_id = u.id
    LEFT JOIN mock_tests mt ON ss.test_id = mt.id
    WHERE ss.status = 'pending'
    GROUP BY ss.speaking_group_id, u.full_name, u.email, u.target_band_score
    
    ORDER BY submitted_at DESC
  `);
  return result.rows;
};

/**
 * Assigns a tutor to a specific submission.
 * @param {string} submissionId 
 * @param {string} type - 'writing' or 'speaking'
 * @param {string|null} tutorId 
 * @returns {Promise<Object>}
 */
const assignTutorToSubmission = async (submissionId, type, tutorId) => {
  let table = '';
  let idCol = '';
  if (type === 'writing') { table = 'writing_submissions'; idCol = 'writing_group_id'; }
  else if (type === 'speaking') { table = 'speaking_submissions'; idCol = 'speaking_group_id'; }
  else throw new Error('Invalid submission type');

  // CTE để lấy thêm thông tin tutor mới sau UPDATE,
  // tránh phải thực hiện query riêng chỉ để resolve UUID → tên người.
  const result = await pool.query(
    `WITH updated AS (
       UPDATE ${table}
       SET assigned_tutor_id = $2
       WHERE ${idCol} = $1
       RETURNING *
     )
     SELECT
       updated.*,
       tutor.full_name  AS tutor_name,
       tutor.email      AS tutor_email,
       student.full_name AS student_name,
       student.email     AS student_email
     FROM updated
     LEFT JOIN users tutor   ON tutor.id   = updated.assigned_tutor_id
     LEFT JOIN users student ON student.id = updated.user_id`,
    [submissionId, tutorId]
  );
  return result.rows[0];
};

/**
 * Finds a submission by id and type.
 * @param {string} submissionId 
 * @param {string} type 
 * @returns {Promise<Object>}
 */
const getSubmissionByIdAndType = async (submissionId, type) => {
  let table = '';
  let idCol = '';
  if (type === 'writing') { table = 'writing_submissions'; idCol = 'writing_group_id'; }
  else if (type === 'speaking') { table = 'speaking_submissions'; idCol = 'speaking_group_id'; }
  else throw new Error('Invalid submission type');

  // JOIN users để lấy tên tutor đang được phân công (nếu có) — cần thiết
  // để ghi old_value có nghĩa vào audit log thay vì lưu UUID thô.
  const result = await pool.query(
    `SELECT
       s.*,
       tutor.full_name  AS tutor_name,
       tutor.email      AS tutor_email,
       student.full_name AS student_name,
       student.email     AS student_email
     FROM ${table} s
     LEFT JOIN users tutor   ON tutor.id   = s.assigned_tutor_id
     LEFT JOIN users student ON student.id = s.user_id
     WHERE s.${idCol} = $1
     LIMIT 1`,
    [submissionId]
  );
  return result.rows[0];
};

module.exports = {
  getTutors,
  getPendingSubmissions,
  assignTutorToSubmission,
  getSubmissionByIdAndType,
};
