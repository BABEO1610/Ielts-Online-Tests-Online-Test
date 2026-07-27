/**
 * scoring.js
 * Utility functions for calculating IELTS Band Scores based on raw scores.
 */

// Mapping table for IELTS Listening and Reading (Academic/General)
// Based on standard IELTS scoring scales (40 questions).

const calculateListeningBand = (rawScore) => {
  if (rawScore >= 39) return 9.0;
  if (rawScore >= 37) return 8.5;
  if (rawScore >= 35) return 8.0;
  if (rawScore >= 32) return 7.5;
  if (rawScore >= 30) return 7.0;
  if (rawScore >= 26) return 6.5;
  if (rawScore >= 23) return 6.0;
  if (rawScore >= 18) return 5.5;
  if (rawScore >= 16) return 5.0;
  if (rawScore >= 13) return 4.5;
  if (rawScore >= 10) return 4.0;
  if (rawScore >= 8) return 3.5;
  if (rawScore >= 6) return 3.0;
  if (rawScore >= 4) return 2.5;
  if (rawScore >= 2) return 2.0;
  if (rawScore >= 1) return 1.0;
  return 0.0;
};

const calculateReadingAcademicBand = (rawScore) => {
  if (rawScore >= 39) return 9.0;
  if (rawScore >= 37) return 8.5;
  if (rawScore >= 35) return 8.0;
  if (rawScore >= 33) return 7.5;
  if (rawScore >= 30) return 7.0;
  if (rawScore >= 27) return 6.5;
  if (rawScore >= 23) return 6.0;
  if (rawScore >= 19) return 5.5;
  if (rawScore >= 15) return 5.0;
  if (rawScore >= 13) return 4.5;
  if (rawScore >= 10) return 4.0;
  if (rawScore >= 8) return 3.5;
  if (rawScore >= 6) return 3.0;
  if (rawScore >= 4) return 2.5;
  if (rawScore >= 2) return 2.0;
  if (rawScore >= 1) return 1.0;
  return 0.0;
};

/**
 * Get band score based on skill and raw score.
 * (Hàm getBandScore: Dựa trên scaledRawScore và skill, tra cứu (Lookup table) để ra Band Score (từ 0.0 - 9.0). Barem cứng cho Reading Academic và Listening)
 * @param {string} skill - 'listening' or 'reading'
 * @param {number} rawScore - The number of correct answers (0 - 40)
 * @returns {number} The band score (0.0 - 9.0)
 */
const getBandScore = (skill, rawScore) => {
  // Barem cứng cho Reading Academic và Listening. Tra cứu (Lookup table) để ra Band Score (từ 0.0 - 9.0)
  if (rawScore < 0 || rawScore > 40) {
    throw new Error('Raw score must be between 0 and 40');
  }

  if (skill === 'listening') {
    return calculateListeningBand(rawScore);
  } else if (skill === 'reading') {
    return calculateReadingAcademicBand(rawScore);
  } else {
    // Other skills like writing/speaking are manually graded or AI graded
    return 0.0;
  }
};

const roundToNearestHalf = (value) => Math.round(Number(value) * 2) / 2;

const isValidHalfBandScore = (value) => {
  const number = Number(value);
  return Number.isFinite(number)
    && number >= 0
    && number <= 9
    && Number.isInteger(number * 2);
};

const calcBandFromCriteria = (scores) => {
  if (!Array.isArray(scores) || scores.length !== 4) {
    throw new Error('Exactly 4 criteria scores are required');
  }
  if (!scores.every(isValidHalfBandScore)) {
    throw new Error('Criteria scores must be between 0 and 9 in 0.5 steps');
  }
  const total = scores.reduce((sum, score) => sum + Number(score), 0);
  return roundToNearestHalf(total / 4);
};

const calcWeightedWritingOverall = (task1Band, task2Band) => {
  if (!isValidHalfBandScore(task1Band) || !isValidHalfBandScore(task2Band)) {
    throw new Error('Task bands must be between 0 and 9 in 0.5 steps');
  }
  return roundToNearestHalf((Number(task1Band) * 0.33) + (Number(task2Band) * 0.67));
};

module.exports = {
  getBandScore,
  roundToNearestHalf,
  isValidHalfBandScore,
  calcBandFromCriteria,
  calcWeightedWritingOverall,
};
