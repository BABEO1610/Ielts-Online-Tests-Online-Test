export const formatBand = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(1) : '—';
};

export const getWritingCriterionLabel = (taskNumber, criterionKey) => {
  const normalizedTaskNumber = Number(taskNumber);
  const labels = {
    taskAchievementOrResponse: normalizedTaskNumber === 1
      ? 'Task Achievement'
      : (normalizedTaskNumber === 2 ? 'Task Response' : 'Task Achievement / Response'),
    coherenceCohesion: 'Coherence & Cohesion',
    lexicalResource: 'Lexical Resource',
    grammarRangeAccuracy: 'Grammar Range & Accuracy',
    grammaticalRangeAccuracy: 'Grammar Range & Accuracy',
  };

  return labels[criterionKey] || criterionKey;
};

export const getScoreBadge = (score) => {
  const number = Number(score);
  if (!Number.isFinite(number)) {
    return { label: 'Chưa có điểm', tone: 'muted' };
  }
  if (number >= 7) {
    return { label: 'Tốt', tone: 'good' };
  }
  if (number >= 6) {
    return { label: 'Trung bình', tone: 'average' };
  }
  return { label: 'Cần cải thiện', tone: 'weak' };
};

export const calculateOverallWritingBand = (task1Band, task2Band) => {
  if (
    task1Band === null || task1Band === undefined || task1Band === ''
    || task2Band === null || task2Band === undefined || task2Band === ''
  ) {
    return null;
  }

  const task1 = Number(task1Band);
  const task2 = Number(task2Band);

  if (!Number.isFinite(task1) || !Number.isFinite(task2)) {
    return null;
  }

  return Number((task1 * 0.33 + task2 * 0.67).toFixed(1));
};
