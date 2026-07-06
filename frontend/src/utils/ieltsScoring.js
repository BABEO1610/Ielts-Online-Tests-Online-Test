export const calculatePreviewBand = (scores) => {
  const validScores = scores.filter(score => typeof score === 'number' && !Number.isNaN(score));
  if (validScores.length === 0) return 0;

  const sum = validScores.reduce((acc, score) => acc + score, 0);
  return Math.round((sum / validScores.length) * 2) / 2;
};
