/**
 * TestResultPage.jsx — Task 4.3.1
 * Trang Kết quả thi (Tổng quan)
 * Band Score lớn, điểm thô /40, thời gian hoàn thành.
 */
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { testService } from '../../services/test.service';
import '../../styles/objective-testing.css';

function TestResultPage() {
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

  if (loading) return <div className="text-center py-5">Đang tải kết quả...</div>;
  if (error || !result) return <div className="text-center py-5 text-danger">{error || 'Không tìm thấy kết quả'}</div>;

  const r = result;
  return (
    <div className="container py-4" style={{ maxWidth: 800 }}>
      <div className="api-success-message d-flex align-items-center gap-2 justify-content-center mb-4" id="submit-success-alert">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e4620" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span>Test submitted successfully!</span>
      </div>
      <div className="card-content text-center mb-4" id="band-score-card" style={{ padding: '48px 24px' }}>
        <div className="caption mb-1" style={{ color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: 2 }}>Your Band Score</div>
        <div className="band-score-display" id="band-score-value">{r.bandScore.toFixed(1)}</div>
        <div className="body-md mt-2" style={{ color: 'var(--body)' }}>{r.testTitle}</div>
      </div>
      <div className="row g-3 mb-4">
        {[
          { id: 'stat-raw', label: 'Raw score', val: `${r.rawScore}/${r.totalQuestions}` },
          { id: 'stat-correct', label: 'Correct', val: r.correctCount, color: '#1e4620' },
          { id: 'stat-incorrect', label: 'Incorrect', val: r.incorrectCount, color: '#e02424' },
          { id: 'stat-time', label: 'Time spent', val: r.timeSpent },
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
        <Link to={`/results/${id}/detail`} className="button-primary flex-fill" id="btn-view-detail" style={{ textDecoration: 'none', textAlign: 'center', padding: '14px 0' }}>Xem chi tiết đáp án</Link>
        <Link to={r.skill === 'listening' ? "/listening" : "/reading"} className="button-secondary flex-fill" id="btn-back-to-tests" style={{ textDecoration: 'none', textAlign: 'center', padding: '14px 0', border: '1px solid var(--surface-pressed)' }}>Quay lại danh sách đề thi</Link>
      </div>
    </div>
  );
}

export default TestResultPage;
