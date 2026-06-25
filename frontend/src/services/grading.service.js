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

  // PLACEHOLDER DATA — no backend endpoint exists yet.
  // The backend currently only exposes GET/PUT /users/me. There is no
  // dashboard-stats, attempts, or score-history endpoint. The values below
  // (except target_band_score, which the Dashboard overrides with the real
  // value from /users/me) are illustrative placeholders.
  //
  // When the backend is ready, replace the body with a single call, e.g.:
  //   const response = await api.get('/students/me/dashboard-stats');
  //   return response.data;
  // and keep this same response shape so consumers don't change:
  //   {
  //     success: boolean,
  //     data: {
  //       target_band_score, avg_band_score, ai_grading_quota_remaining,
  //       total_tests_taken, avg_time_label, accuracy_pct,
  //       chart: { LISTENING: [{ name, score }], READING: [...], ... },
  //       skills: [{ label, icon, score }]
  //     }
  //   }
  //
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

  // TODO: Replace with real API call (GET /api/v1/submissions) when backend is ready
  // EARS[Event]: WHEN student views history THEN fetch their submissions
  getSubmissionHistory: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: [
            {
              id: 'sub-1',
              type: 'writing',
              task_number: 1,
              submitted_at: '2026-06-01T10:00:00Z',
              status: 'ai_graded',
              band_score: 6.5,
              grader: 'ai'
            },
            {
              id: 'sub-2',
              type: 'speaking',
              part_number: 2,
              submitted_at: '2026-06-02T15:30:00Z',
              status: 'tutor_graded',
              band_score: 7.0,
              grader: 'tutor'
            },
            {
              id: 'sub-3',
              type: 'writing',
              task_number: 2,
              submitted_at: '2026-06-03T09:15:00Z',
              status: 'pending',
              band_score: null,
              grader: 'tutor'
            },
            {
              id: 'sub-4',
              type: 'speaking',
              part_number: 1,
              submitted_at: '2026-06-03T18:45:00Z',
              status: 'failed',
              band_score: null,
              grader: 'ai'
            }
          ]
        });
      }, 800);
    });
  }
};

export default gradingService;
