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
      ws.id, 
      u.full_name as student, 
      u.email, 
      'writing' as type,
      ws.task_number as task_or_part,
      u.target_band_score as target_band,
      ws.assigned_tutor_id as tutor_id,
      ws.submitted_at
    FROM writing_submissions ws
    JOIN users u ON ws.user_id = u.id
    WHERE ws.status = 'pending'
    
    UNION ALL
    
    SELECT 
      ss.id, 
      u.full_name as student, 
      u.email, 
      'speaking' as type,
      ss.part_number as task_or_part,
      u.target_band_score as target_band,
      ss.assigned_tutor_id as tutor_id,
      ss.submitted_at
    FROM speaking_submissions ss
    JOIN users u ON ss.user_id = u.id
    WHERE ss.status = 'pending'
    
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
  if (type === 'writing') table = 'writing_submissions';
  else if (type === 'speaking') table = 'speaking_submissions';
  else throw new Error('Invalid submission type');

  const result = await pool.query(
    `UPDATE ${table} 
     SET assigned_tutor_id = $2
     WHERE id = $1
     RETURNING *`,
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
  if (type === 'writing') table = 'writing_submissions';
  else if (type === 'speaking') table = 'speaking_submissions';
  else throw new Error('Invalid submission type');

  const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [submissionId]);
  return result.rows[0];
};

module.exports = {
  getTutors,
  getPendingSubmissions,
  assignTutorToSubmission,
  getSubmissionByIdAndType,
};
