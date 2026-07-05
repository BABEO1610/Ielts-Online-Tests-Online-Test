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
 * @param {string} skill - 'listening' or 'reading'
 * @param {number} rawScore - The number of correct answers (0 - 40)
 * @returns {number} The band score (0.0 - 9.0)
 */
const getBandScore = (skill, rawScore) => {
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

module.exports = {
  getBandScore,
  roundToNearestHalf
};
