/**
 * @file backend/src/db/queries/tracking.queries.js
 * @description Data access layer for process tracking and study plan.
 */

const getUserStats = async (pool, userId) => {
  const query = `
    SELECT 
      COUNT(id) as total_tests,
      COALESCE(SUM(time_spent), 0) as total_time_minutes
    FROM test_attempts
    WHERE user_id = $1 AND status = 'completed'
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows[0];
};

const getUserSkillScores = async (pool, userId) => {
  const query = `
    SELECT t.skill, AVG(a.band_score) as avg_score
    FROM test_attempts a
    JOIN mock_tests t ON a.test_id = t.id
    WHERE a.user_id = $1 AND a.status = 'completed' AND a.band_score IS NOT NULL
    GROUP BY t.skill;
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows;
};

const getUserHistory = async (pool, userId) => {
  const query = `
    SELECT id, created_at as date, band_score as score
    FROM (
      SELECT id, created_at, band_score
      FROM test_attempts
      WHERE user_id = $1 AND status = 'completed' AND band_score IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 6
    ) sub
    ORDER BY date ASC;
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows;
};

const getUserTargetScore = async (pool, userId) => {
  const query = `SELECT target_band_score FROM users WHERE id = $1`;
  const { rows } = await pool.query(query, [userId]);
  return rows[0]?.target_band_score || 7.0;
};

module.exports = {
  getUserStats,
  getUserSkillScores,
  getUserHistory,
  getUserTargetScore
};
