const { pool } = require('../db/pool');
const AppError = require('../utils/AppError');

class TutorService {
  /**
   * Get pending grading queue for tutors
   * @param {Object} filters
   * @param {string} filters.submission_type - 'writing' or 'speaking'
   * @param {string} filters.search - Search by student name
   */
  static async getQueue(filters = {}) {
    // Base UNION query producing unified columns
    const unionQuery = `
      SELECT 'writing' AS submission_type,
             ws.id AS submission_id,
             ws.user_id AS student_id,
             u.full_name AS student_name,
             ws.submitted_at,
             ws.status,
             ws.grader
      FROM writing_submissions ws
      JOIN users u ON u.id = ws.user_id
      WHERE ws.status = 'pending' AND ws.grader = 'tutor'
      UNION ALL
      SELECT 'speaking' AS submission_type,
             ss.id AS submission_id,
             ss.user_id AS student_id,
             u.full_name AS student_name,
             ss.submitted_at,
             ss.status,
             ss.grader
      FROM speaking_submissions ss
      JOIN users u ON u.id = ss.user_id
      WHERE ss.status = 'pending' AND ss.grader = 'tutor'
    `;

    // Build outer query with optional filters
    let query = `SELECT * FROM (${unionQuery}) AS q WHERE 1=1`;
    const params = [];

    // Filter by submission_type (writing/speaking)
    if (filters.submission_type && ['writing', 'speaking'].includes(filters.submission_type)) {
      params.push(filters.submission_type);
      query += ` AND q.submission_type = $${params.length}`;
    }

    // Search by student name
    if (filters.search) {
      params.push(`%${filters.search}%`);
      query += ` AND q.student_name ILIKE $${params.length}`;
    }

    query += ' ORDER BY q.submitted_at ASC';

    try {
      const result = await pool.query(query, params);
      return result.rows;
    } catch (err) {
      // Propagate any DB errors
      throw err;
    }
  }
}

module.exports = TutorService;
