const { pool } = require('../db/pool');
const AppError = require('../utils/AppError');
const fs = require('fs');
const path = require('path');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeOptionalUuid = (value) => {
  if (!value) return null;
  const text = String(value);
  return UUID_REGEX.test(text) ? text : null;
};

const mapSpeakingDbError = (err) => {
  if (err.code === '42P01') {
    return new AppError(
      'Speaking tables are missing. Run backend migrations, then restart the server.',
      500,
      'SPEAKING_SCHEMA_MISSING'
    );
  }
  if (err.code === '23503') {
    return new AppError('Referenced speaking test or user was not found', 400, 'SPEAKING_REFERENCE_INVALID');
  }
  return err;
};

class SubmissionService {
  /**
   * Submit speaking record.
   * We insert DB first, then move the file. If move fails, we rollback the DB.
   */
  static async submitSpeaking(userId, testId, partNumber, tempS3Key, grader) {
    // 1. Validate mock test exists ONLY IF testId is provided (not null)
    if (testId) {
      try {
        const testRes = await pool.query('SELECT id FROM mock_tests WHERE id = $1', [testId]);
        if (testRes.rows.length === 0) {
          throw new AppError('Test not found', 404, 'TEST_NOT_FOUND');
        }
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError('Invalid test ID format', 400, 'INVALID_TEST_ID');
      }
    }

    // 2. Validate temp file exists
    // Use basename to prevent path traversal
    const filename = path.basename(tempS3Key);
    const tempPath = path.join(__dirname, '../../uploads/temp_audio', userId, filename);
    
    try {
      await fs.promises.access(tempPath, fs.constants.F_OK);
    } catch (e) {
      throw new AppError('Temp audio file not found or you do not have permission', 404, 'TEMP_AUDIO_NOT_FOUND');
    }

    // 3. Prepare final destination
    const finalDir = path.join(__dirname, '../../uploads/speaking', userId);
    if (!fs.existsSync(finalDir)) {
      fs.mkdirSync(finalDir, { recursive: true });
    }
    const finalPath = path.join(finalDir, filename);
    
    // Using relative path for frontend to consume (served statically)
    const relativeFinalPath = `/uploads/speaking/${userId}/${filename}`;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 4. Insert into speaking_submissions
      const insertRes = await client.query(
        `INSERT INTO speaking_submissions (user_id, test_id, part_number, audio_url, grader, status)
         VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
        [userId, testId, partNumber, relativeFinalPath, grader]
      );
      
      const submission = insertRes.rows[0];

      // 5. Move file
      await fs.promises.rename(tempPath, finalPath);

      await client.query('COMMIT');
      return submission;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
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
