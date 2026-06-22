const { pool } = require('../db/pool');
const AppError = require('../utils/AppError');
const supabase = require('../config/supabase');

const SUPABASE_BUCKET = process.env.SUPABASE_SPEAKING_BUCKET || 'speaking-audio';

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

const toPublicSpeakingAudioUrl = (audioUrlOrPath) => {
  if (!audioUrlOrPath) return null;
  if (/^https?:\/\//i.test(audioUrlOrPath)) return audioUrlOrPath;

  const storagePath = String(audioUrlOrPath).replace(/^\/+/, '');
  const { data: publicUrlData } = supabase
    .storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl(storagePath);

  return publicUrlData?.publicUrl || storagePath;
};

class SubmissionService {
  /**
   * Submit speaking record.
   * The audio is already uploaded to Supabase by /speaking/upload; this method
   * records the Supabase object path/public URL against the submission.
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

    // 2. Validate the uploaded Supabase object belongs to this user.
    const storagePath = String(tempS3Key || '').replace(/^\/+/, '');
    const expectedPrefix = `speaking/${userId}/`;
    if (!storagePath.startsWith(expectedPrefix) || storagePath.includes('..')) {
      throw new AppError('Invalid speaking audio path', 400, 'INVALID_AUDIO_PATH');
    }

    const audioUrl = toPublicSpeakingAudioUrl(storagePath);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 3. Insert into speaking_submissions
      const insertRes = await client.query(
        `INSERT INTO speaking_submissions (user_id, test_id, part_number, audio_url, grader, status)
         VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
        [userId, testId, partNumber, audioUrl, grader]
      );

      await client.query('COMMIT');
      return insertRes.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw mapSpeakingDbError(error);
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

  static async getSpeakingAudioUrl(submissionId, user) {
    const params = [submissionId];
    let query = 'SELECT id, user_id, audio_url FROM speaking_submissions WHERE id = $1';

    if (user.role === 'student') {
      params.push(user.id);
      query += ' AND user_id = $2';
    } else if (!['tutor', 'admin'].includes(user.role)) {
      throw new AppError('You do not have permission to access this audio', 403, 'AUTH_PERM_001');
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      throw new AppError('Speaking submission audio not found', 404, 'AUDIO_NOT_FOUND');
    }

    const audioUrl = toPublicSpeakingAudioUrl(result.rows[0].audio_url);
    if (!audioUrl) {
      throw new AppError('Speaking submission has no audio', 404, 'AUDIO_NOT_FOUND');
    }

    return audioUrl;
  }
}

module.exports = SubmissionService;
