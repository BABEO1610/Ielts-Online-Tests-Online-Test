/**
 * TestResultDetailPage.jsx — /results/:attemptId/detail
 * Chi tiết từng câu hỏi: đáp án của bạn, đáp án đúng, giải thích.
 * Lấy dữ liệu thật từ GET /api/v1/attempts/:attemptId/detail
 * 
 * (TestResultDetailPage Component: Bắn API lấy Detail 40 câu.
 * Xử lý UX hiển thị giao diện Accordion. 
 * Khi bấm vào câu trả lời sai sẽ rủ xuống hiển thị đoạn văn bản giải thích tại sao sai)
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { attemptService } from '../../services/attempt.service';
import '../../styles/objective-testing.css';

function TestResultDetailPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await attemptService.getAttemptDetail(attemptId);
        if (res.success && res.data) {
          setDetail(res.data);
        } else {
          setError(res.error?.message || 'Không tìm thấy chi tiết bài thi.');
        }
      } catch {
        setError('Lỗi kết nối đến server.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="container py-4" style={{ maxWidth: 900 }}>
        <div style={{ height: 80, backgroundColor: '#f5f5f5', borderRadius: 12, marginBottom: 24 }} />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ height: 64, backgroundColor: '#f5f5f5', borderRadius: 8, marginBottom: 8 }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-4 text-center" style={{ maxWidth: 900 }}>
        <p style={{ color: '#c0392b', fontSize: 18 }}>{error}</p>
        <button className="btn btn-dark rounded-pill px-4 mt-2" onClick={() => navigate(-1)}>← Quay lại</button>
      </div>
    );
  }

  const answers = detail.answers || [];
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const incorrectCount = answers.length - correctCount;

  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      <div className="mb-3">
        <button className="text-decoration-none text-muted btn btn-link p-0" onClick={() => navigate(`/results/${attemptId}`)}>
          ← Quay lại tổng quan
        </button>
      </div>
      <div className="page-heading">
        <h1>Xem lại đáp án</h1>
        <p>
          {detail.testTitle} · Band {typeof detail.bandScore === 'number' ? detail.bandScore.toFixed(1) : '—'} · {detail.rawScore}/{detail.totalQuestions} câu đúng
        </p>
      </div>

      {/* Summary Bar */}
      <div className="d-flex gap-3 mb-4 flex-wrap">
        <div className="badge-status published" style={{ fontSize: 14, padding: '6px 16px' }}>
          ✓ {correctCount} Đúng
        </div>
        <div className="badge-status draft" style={{ fontSize: 14, padding: '6px 16px', background: '#fdf2f2', color: '#e02424' }}>
          ✗ {incorrectCount} Sai
        </div>
      </div>

      {/* Accordion */}
      <div className="accordion" id="resultsAccordion">
        {answers.map((item) => (
          <div
            className="accordion-item"
            key={item.order}
            id={`result-q-${item.order}`}
            style={{ border: 'none', borderBottom: '1px solid var(--surface-pressed)', borderRadius: 0 }}
          >
            <h2 className="accordion-header">
              <button
                className="accordion-button collapsed"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target={`#collapse-${item.order}`}
                aria-expanded="false"
                aria-controls={`collapse-${item.order}`}
                style={{ background: 'var(--canvas)', boxShadow: 'none', padding: 'var(--spacing-lg)' }}
              >
                <div className="d-flex align-items-center gap-3 w-100">
                  <span
                    className={`q-number ${item.isCorrect ? 'correct' : 'incorrect'}`}
                    style={{
                      minWidth: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 'var(--rounded-md)', fontWeight: 700, fontSize: 14,
                      background: item.isCorrect ? '#edf7ed' : '#fdf2f2',
                      color: item.isCorrect ? '#1e4620' : '#e02424',
                    }}
                  >
                    {item.order}
                  </span>
                  <div className="flex-fill">
                    <span className="body-sm" style={{ color: 'var(--body)' }}>{item.text}</span>
                  </div>
                  <div className="d-flex gap-2 me-3">
                    <span className="body-sm">
                      Của bạn:{' '}
                      <strong style={{ color: item.isCorrect ? '#1e4620' : '#e02424' }}>
                        {item.userAnswer || '—'}
                      </strong>
                    </span>
                    {!item.isCorrect && (
                      <span className="body-sm">
                        Đúng:{' '}
                        <strong style={{ color: '#1e4620' }}>{item.correctAnswer}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </h2>
            <div id={`collapse-${item.order}`} className="accordion-collapse collapse" data-bs-parent="#resultsAccordion">
              <div className="accordion-body" style={{ background: 'var(--canvas-soft)', padding: 'var(--spacing-2xl)' }}>
                <p className="body-md mb-0" style={{ color: 'var(--body)' }}>
                  {item.explanation || 'Không có giải thích cho câu này.'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Back button */}
      <div className="d-flex gap-3 mt-4">
        <button
          className="button-secondary flex-fill"
          style={{ textAlign: 'center', padding: '14px 0', border: '1px solid var(--surface-pressed)', cursor: 'pointer' }}
          onClick={() => navigate(`/results/${attemptId}`)}
        >
          ← Quay lại kết quả
        </button>
        <button
          className="button-primary flex-fill"
          style={{ textAlign: 'center', padding: '14px 0', border: 'none', cursor: 'pointer' }}
          onClick={() => navigate('/reading')}
        >
          Làm bài mới
        </button>
      </div>
    </div>
  );
}

export default TestResultDetailPage;
