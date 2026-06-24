/**
 * TestResultPage.jsx — /results/:attemptId
 * Trang Kết quả thi (Tổng quan): Band Score, Raw Score, thời gian, số câu đúng/sai.
 * Lấy dữ liệu thật từ GET /api/v1/attempts/:attemptId
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { attemptService } from '../../services/attempt.service';
import '../../styles/objective-testing.css';

/** Format seconds → "mm:ss" */
function formatTime(seconds) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function TestResultPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        const res = await attemptService.getAttempt(attemptId);
        if (res.success && res.data) {
          setResult(res.data);
        } else {
          setError(res.error?.message || 'Không tìm thấy kết quả bài thi.');
        }
      } catch {
        setError('Lỗi kết nối đến server.');
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="container py-4" style={{ maxWidth: 800 }}>
        <div style={{ height: 200, backgroundColor: '#f5f5f5', borderRadius: 16, marginBottom: 24 }} />
        <div className="row g-3">
          {[1, 2, 3, 4].map((i) => (
            <div className="col-md-3 col-6" key={i}>
              <div style={{ height: 100, backgroundColor: '#f5f5f5', borderRadius: 12 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-4 text-center" style={{ maxWidth: 800 }}>
        <p style={{ color: '#c0392b', fontSize: 18 }}>{error}</p>
        <button className="btn btn-dark rounded-pill px-4 mt-2" onClick={() => navigate('/tests')}>
          Về danh sách đề thi
        </button>
      </div>
    );
  }

  const r = result;
  const isGraded = r.status === 'graded' || (r.bandScore !== null && r.bandScore !== undefined);

  return (
    <div className="container py-4" style={{ maxWidth: 800 }}>
      <div className="api-success-message d-flex align-items-center gap-2 justify-content-center mb-4" id="submit-success-alert">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e4620" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span>Bài đã được nộp thành công!</span>
      </div>

      <div className="card-content text-center mb-4" id="band-score-card" style={{ padding: '48px 24px' }}>
        <div className="caption mb-1" style={{ color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: 2 }}>Band Score của bạn</div>
        <div className="band-score-display" id="band-score-value">
          {isGraded ? parseFloat(r.bandScore).toFixed(1) : '—'}
        </div>
        <div className="body-md mt-2" style={{ color: 'var(--body)' }}>{r.testTitle}</div>
      </div>

      <div className="row g-3 mb-4">
        {[
          { id: 'stat-raw', label: 'Raw Score', val: `${r.rawScore}/${r.totalQuestions}` },
          { id: 'stat-correct', label: 'Đúng', val: r.correctCount, color: '#1e4620' },
          { id: 'stat-incorrect', label: 'Sai', val: r.incorrectCount, color: '#e02424' },
          { id: 'stat-time', label: 'Thời gian', val: formatTime(r.timeSpent) },
        ].map(s => (
          <div className="col-md-3 col-6" key={s.id}>
            <div className="card-content text-center" id={s.id}>
              <div className="display-md" style={s.color ? { color: s.color } : {}}>{s.val}</div>
              <div className="caption" style={{ color: 'var(--body)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="d-flex gap-3">
        <button
          className="button-primary flex-fill"
          id="btn-view-detail"
          style={{ textAlign: 'center', padding: '14px 0', border: 'none', cursor: 'pointer' }}
          onClick={() => navigate(`/results/${attemptId}/review`)}
        >
          Xem chi tiết đáp án
        </button>
        <button
          className="button-secondary flex-fill"
          id="btn-back-to-tests"
          style={{ textAlign: 'center', padding: '14px 0', border: '1px solid var(--surface-pressed)', cursor: 'pointer' }}
          onClick={() => navigate(r.skill === 'listening' ? '/listening' : '/reading')}
        >
          Quay lại danh sách đề thi
        </button>
      </div>
    </div>
  );
}

export default TestResultPage;
