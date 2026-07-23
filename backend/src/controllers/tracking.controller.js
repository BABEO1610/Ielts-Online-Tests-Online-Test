/**
 * @file backend/src/controllers/tracking.controller.js
 * @description Controller cho chức năng Process Tracking.
 */

const { pool } = require('../db/pool');
const trackingQueries = require('../db/queries/tracking.queries');
const { roundToNearestHalf } = require('../utils/scoring');

const getTrackingProcess = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const [target, stats, skills, history] = await Promise.all([
      trackingQueries.getUserTargetScore(pool, userId),
      trackingQueries.getUserStats(pool, userId),
      trackingQueries.getUserSkillScores(pool, userId),
      trackingQueries.getUserHistory(pool, userId)
    ]);
    
    // Format skills: Listening, Reading, Writing, Speaking
    const defaultSkills = ['listening', 'reading', 'writing', 'speaking'];
    const formattedSkills = defaultSkills.map(s => {
      const found = skills.find(sk => sk.skill && sk.skill.toLowerCase() === s);
      return {
        skill: s.charAt(0).toUpperCase() + s.slice(1),
        score: found ? roundToNearestHalf(found.avg_score).toFixed(1) : '0.0',
        target: roundToNearestHalf(target).toFixed(1)
      };
    });
    
    // Find best skill
    let bestSkill = 'N/A';
    let maxScore = -1;
    formattedSkills.forEach(s => {
      if (Number(s.score) > maxScore && Number(s.score) > 0) {
        maxScore = Number(s.score);
        bestSkill = s.skill;
      }
    });
    
    const totalTimeHours = (stats.total_time_minutes / 60).toFixed(1);
    
    const formattedStats = [
      { label: 'Tổng số bài thi', value: stats.total_tests.toString() },
      { label: 'Thời gian luyện tập', value: `${totalTimeHours} giờ` },
      { label: 'Kỹ năng mạnh nhất', value: bestSkill },
      { label: 'Mục tiêu (Overall)', value: Number(target).toFixed(1) }
    ];
    
    const formattedHistory = history.map((h, i) => ({
      date: `Bài ${i + 1}`,
      score: Number(h.score)
    }));
    
    res.status(200).json({
      success: true,
      data: {
        stats: formattedStats,
        historyData: formattedHistory,
        skillScores: formattedSkills
      },
      error: null,
      meta: null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTrackingProcess
};
