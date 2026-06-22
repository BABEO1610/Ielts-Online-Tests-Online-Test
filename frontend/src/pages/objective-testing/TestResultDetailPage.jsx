/**
 * TestResultDetailPage.jsx — Task 4.3.2
 * Lưới Chi tiết từng câu hỏi
 * 
 * 40 câu: Trạng thái Đúng/Sai, đáp án của bạn, đáp án đúng.
 * Mở rộng (Accordion) để xem giải thích.
 * Bootstrap Accordion, text-success (đúng), text-danger (sai).
 */
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { testService } from '../../services/test.service';
import '../../styles/objective-testing.css';

function TestResultDetailPage() {
  const { attemptId: id } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const response = await testService.getSubmissionResult(id);
        if (response && response.success && response.data) {
          setResult(response.data);
        } else {
          setError('Không tìm thấy kết quả bài thi');
        }
      } catch (err) {
        setError('Đã có lỗi xảy ra khi tải kết quả');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchResult();
  }, [id]);

  if (loading) return <div className="text-center py-5">Đang tải đáp án...</div>;
  if (error || !result) return <div className="text-center py-5 text-danger">{error || 'Không tìm thấy kết quả'}</div>;

  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      <div className="mb-3">
        <Link to={`/results/${id}`} className="text-decoration-none text-muted">
          ← Quay lại tổng quan
        </Link>
      </div>
      <div className="page-heading">
        <h1>Chi tiết đáp án</h1>
        <p>{result.testTitle} · Band {parseFloat(result.bandScore).toFixed(1)} · {result.correctCount}/{result.totalQuestions} câu đúng</p>
      </div>

      {/* Summary Bar */}
      <div className="d-flex gap-3 mb-4 flex-wrap">
        <div className="badge-status published" style={{ fontSize: 14, padding: '6px 16px' }}>
          ✓ {result.correctCount} Correct
        </div>
        <div className="badge-status draft" style={{ fontSize: 14, padding: '6px 16px', background: '#fdf2f2', color: '#e02424' }}>
          ✗ {result.incorrectCount} Incorrect
        </div>
      </div>

      {/* Accordion */}
      <div className="accordion" id="resultsAccordion">
        {result.answers && result.answers.map((item) => (
          <div className="accordion-item" key={item.order} id={`result-q-${item.order}`} style={{ border: 'none', borderBottom: '1px solid var(--surface-pressed)', borderRadius: 0 }}>
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
                    <span className="body-sm">Yours: <strong style={{ color: item.isCorrect ? '#1e4620' : '#e02424' }}>{item.yourAnswer || '—'}</strong></span>
                    {!item.isCorrect && <span className="body-sm">Correct: <strong style={{ color: '#1e4620' }}>{item.correctAnswer}</strong></span>}
                  </div>
                </div>
              </button>
            </h2>
            <div id={`collapse-${item.order}`} className="accordion-collapse collapse" data-bs-parent="#resultsAccordion">
              <div className="accordion-body" style={{ background: 'var(--canvas-soft)', padding: 'var(--spacing-2xl)' }}>
                <p className="body-md mb-0" style={{ color: 'var(--body)' }}>
                  {item.explanation || 'Không có giải thích cho câu hỏi này.'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TestResultDetailPage;
