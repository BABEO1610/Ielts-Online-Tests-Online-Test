const { pool } = require('../db/pool');

class SubmissionService {
  /**
   * Submit a writing task response.
   */
  static async submitWriting(userId, data) {
    const { test_id, task_number, prompt_text, response_text, grader } = data;

    const query = `
      INSERT INTO writing_submissions 
        (user_id, test_id, task_number, prompt_text, response_text, grader, status)
      VALUES 
        ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING id, status, submitted_at
    `;
    
    const values = [userId, test_id, task_number, prompt_text, response_text, grader];

    const result = await pool.query(query, values);
    return result.rows[0];
  }
}

module.exports = SubmissionService;
