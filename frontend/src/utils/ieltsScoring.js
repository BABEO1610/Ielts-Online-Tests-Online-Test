export const roundToNearestHalf = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 2) / 2 : null;
};

export const formatIeltsBandScore = (value) => {
  const rounded = roundToNearestHalf(value);
  return rounded !== null ? rounded.toFixed(1) : '—';
};

export const calculatePreviewBand = (scores) => {
  const validScores = scores.filter(score => typeof score === 'number' && !Number.isNaN(score));
  if (validScores.length === 0) return 0;

  const sum = validScores.reduce((acc, score) => acc + score, 0);
  return roundToNearestHalf(sum / validScores.length);
};

