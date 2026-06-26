import api from './api';

const gradingService = {
  // EARS[Event]: WHEN user submits audio file THEN call upload endpoint with multipart/form-data
  uploadAudio: async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio_file', audioBlob);

    const response = await api.post('/submissions/speaking/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // EARS[Event]: WHEN user submits writing THEN send text and grader preference
  submitWriting: async (data) => {
    const response = await api.post('/submissions/writing', data);
    return response.data;
  },

  // EARS[Event]: WHEN user submits full writing test THEN send tasks and grader preference
  submitFullWriting: async (data) => {
    const response = await api.post('/submissions/writing/full', data);
    return response.data;
  },

  // EARS[Event]: WHEN user submits speaking THEN send temp_s3_key and grader preference
  submitSpeaking: async (data) => {
    const response = await api.post('/submissions/speaking', data);
    return response.data;
  },

  // EARS[Event]: WHEN user submits full speaking test THEN send parts and grader preference
  submitFullSpeaking: async (data) => {
    const response = await api.post('/submissions/speaking/full', data);
    return response.data;
  },

  // EARS[State-driven]: WHEN student wants to view feedback THEN fetch feedback report
  getFeedback: async (submissionId, type) => {
    const response = await api.get(`/submissions/${submissionId}/feedback`, {
      params: { type },
    });
    return response.data;
  },

  // EARS[Event]: WHEN tutor or student needs to listen to audio THEN get presigned URL
  getAudioUrl: async (submissionId, type = 'speaking') => {
    const response = await api.get(`/submissions/${submissionId}/audio-url`, {
      params: { type },
    });
    return response.data;
  },

  // EARS[Event]: WHEN tutor requests transcript THEN call API
  generateTranscript: async (partId) => {
    const response = await api.post(`/tutors/submissions/speaking/${partId}/transcribe`);
    return response.data;
  },

  // EARS[State-driven]: WHEN tutor dashboard loads THEN fetch stats
  getTutorDashboardStats: async () => {
    const response = await api.get('/tutors/dashboard-stats');
    return response.data;
  },

  // EARS[State-driven]: WHEN tutor wants to view pending submissions THEN fetch queue
  getTutorQueue: async (filters) => {
    const response = await api.get('/tutors/queue', { params: filters });
    return response.data;
  },
  // EARS[State-driven]: WHEN tutor views submission detail THEN fetch detail
  getSubmissionDetail: async (type, submissionId) => {
    const response = await api.get(`/tutors/submissions/${type}/${submissionId}`);
    return response.data;
  },

  // EARS[Event]: WHEN tutor submits grading result THEN call grade endpoint
  gradeSubmission: async (type, submissionId, gradeData) => {
    const response = await api.post(`/tutors/submissions/${type}/${submissionId}/grade`, gradeData);
    return response.data;
  },

  // EARS[State-driven]: WHEN student views dashboard THEN fetch stats
  getDashboardStats: async () => {
    const buildSeries = (base) =>
      Array.from({ length: 10 }, (_, index) => ({
        name: `Test ${index + 1}`,
        score: Number(Math.min(9, Math.max(4, base + Math.sin(index) * 0.8)).toFixed(1)),
      }));

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            // Widget tiles (StudentDashboardWidgets relies on the first three keys)
            target_band_score: 7.0,
            avg_band_score: 6.8,
            ai_grading_quota_remaining: 8,
            total_tests_taken: 74,
            avg_time_label: '00:52 mins',
            accuracy_pct: 63.57,
            // Per-skill score history for the performance chart
            chart: {
              LISTENING: buildSeries(6.5),
              READING: buildSeries(6.2),
              WRITING: buildSeries(5.8),
              SPEAKING: buildSeries(6.0),
            },
            // Per-skill current band for the profile skill-progress card
            skills: [
              { label: 'Listening', icon: 'bi-headphones', score: 6.5 },
              { label: 'Reading', icon: 'bi-book', score: 6.0 },
              { label: 'Writing', icon: 'bi-pencil', score: 5.5 },
              { label: 'Speaking', icon: 'bi-mic', score: 6.0 },
            ],
          },
        });
      }, 500);
    });
  },

  // EARS[Event]: WHEN student views history THEN fetch their submissions
  getSubmissionHistory: async () => {
    const response = await api.get('/submissions/history');
    return response.data;
  }
};

export default gradingService;
