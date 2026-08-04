import api from './api';

const SPEAKING_MIME_TYPES = new Set(['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav']);
const storage = () => {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
};

export const sha256Blob = async (blob) => {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const newIdempotencyKey = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `speaking-${Date.now()}-${Math.random().toString(36).slice(2)}-request`;
};

const gradingService = {
  // EARS[Event]: WHEN user submits audio file THEN call upload endpoint with multipart/form-data
  // Hàm tải file âm thanh lên server (lấy presigned URL rồi upload file nhị phân trực tiếp lên cloud storage)
  uploadAudio: async (audioBlob, { partNumber, durationMs } = {}) => {
    const contentType = String(audioBlob.type || '').split(';')[0].toLowerCase();
    if (!SPEAKING_MIME_TYPES.has(contentType)) {
      throw new Error('Trình duyệt không tạo được định dạng audio đã được hệ thống phê duyệt.');
    }
    const metadata = {
      part_number: Number(partNumber),
      content_type: contentType,
      size_bytes: audioBlob.size,
      sha256: await sha256Blob(audioBlob),
      duration_ms: Math.max(1, Math.round(Number(durationMs))),
    };
    const ticketResponse = await api.post('/submissions/speaking/audio-uploads', metadata);
    const ticket = ticketResponse.data?.data;
    if (!ticket?.upload_url || !ticket?.upload_token) throw new Error('Server không cấp được signed upload.');
    const uploadResponse = await fetch(ticket.upload_url, {
      method: 'PUT',
      headers: ticket.required_headers || {},
      body: audioBlob,
      credentials: 'omit',
      redirect: 'error',
    });
    if (!uploadResponse.ok) throw new Error(`Storage upload thất bại (${uploadResponse.status}).`);
    return { success: true, data: { upload_token: ticket.upload_token, part_number: metadata.part_number } };
  },

  // EARS[Event]: WHEN user submits writing THEN send text and grader preference
  submitWriting: async (data) => {
    const response = await api.post('/submissions/writing', data);
    return response.data;
  },

  // EARS[Event]: WHEN user submits full writing test THEN send tasks and grader preference
  submitFullWriting: async (data) => {
    const storageKey = `writing:idempotency:${data.test_id || 'practice'}`;
    const key = storage()?.getItem(storageKey) || newIdempotencyKey();
    storage()?.setItem(storageKey, key);
    const response = await api.post('/submissions/writing/full', data, {
      headers: { 'Idempotency-Key': key },
    });
    if (response.data?.data?.writing_group_id) storage()?.removeItem(storageKey);
    return response.data;
  },

  // EARS[Event]: WHEN user submits speaking THEN send temp_s3_key and grader preference
  submitSpeaking: async (data) => {
    const response = await api.post('/submissions/speaking', data);
    return response.data;
  },

  // EARS[Event]: WHEN user submits full speaking test THEN send parts and grader preference
  // Nộp bài thi Speaking hoàn chỉnh. Bao gồm cơ chế chống nộp trùng (Idempotency Key)
  submitFullSpeaking: async (data, idempotencyKey) => {
    const key = idempotencyKey || gradingService.getOrCreateSpeakingIdempotencyKey(data.test_id);
    const response = await api.post('/submissions/speaking/full', data, {
      headers: { 'Idempotency-Key': key },
    });
    const groupId = response.data?.data?.speaking_group_id;
    const jobId = response.data?.data?.job_id;
    if (groupId) {
      if (jobId) storage()?.setItem('speaking:pending-group', groupId);
      storage()?.removeItem(`speaking:idempotency:${data.test_id}`);
    }
    return response.data;
  },

  getOrCreateSpeakingIdempotencyKey: (testId) => {
    const key = `speaking:idempotency:${testId}`;
    const existing = storage()?.getItem(key);
    if (existing) return existing;
    const created = newIdempotencyKey();
    storage()?.setItem(key, created);
    return created;
  },

  // Truy vấn trạng thái chấm bài ngầm của AI (polling) liên tục cho đến khi có kết quả
  getSpeakingGradingStatus: async (groupId, { signal } = {}) => {
    const response = await api.get(`/submissions/speaking/${groupId}/grading-status`, { signal });
    return response.data;
  },

  // Gửi yêu cầu chấm lại bài AI nếu tiến trình trước đó gặp sự cố
  retrySpeakingGrading: async (groupId) => {
    const storageKey = `speaking:retry-idempotency:${groupId}`;
    const key = storage()?.getItem(storageKey) || newIdempotencyKey();
    storage()?.setItem(storageKey, key);
    const response = await api.post(`/submissions/speaking/${groupId}/retry-grading`, {
      reason: 'user_requested_retry',
    }, { headers: { 'Idempotency-Key': key } });
    if (response.data?.data?.job_id) storage()?.removeItem(storageKey);
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

  claimSpeakingGroup: async (groupId) => {
    const response = await api.post(`/tutors/submissions/speaking/${groupId}/claim`);
    return response.data;
  },

  requestAiGrading: async (submissionId) => {
    const storageKey = `writing:grade-idempotency:${submissionId}`;
    const key = storage()?.getItem(storageKey) || newIdempotencyKey();
    storage()?.setItem(storageKey, key);
    const response = await api.post(`/submissions/writing/${submissionId}/ai-grade`, null, {
      headers: { 'Idempotency-Key': key },
    });
    if (response.data?.success) storage()?.removeItem(storageKey);
    return response.data;
  },

  getAiReferenceList: async (filters) => {
    const response = await api.get('/tutors/ai-reference', { params: filters });
    return response.data;
  },

  getAiReferenceDetail: async (submissionId) => {
    const response = await api.get(`/tutors/ai-reference/${submissionId}`);
    return response.data;
  },

  // EARS[State-driven]: WHEN tutor views submission detail THEN fetch detail
  getSubmissionDetail: async (type, submissionId) => {
    const response = await api.get(`/tutors/submissions/${type}/${submissionId}`);
    return response.data;
  },

  runPrelimCheck: async (type, submissionId, taskNumber) => {
    const response = await api.post(`/tutors/submissions/${type}/${submissionId}/ai-prelim`, {
      taskNumber,
    });
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
