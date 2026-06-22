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
  const isSubmitted = r.status === 'submitted';

  return (
    <div className="bg-white min-vh-100 d-flex align-items-center justify-content-center">
      <div className="text-center px-4" style={{ maxWidth: '560px', width: '100%' }}>
        <div
          className="mx-auto mb-5 d-flex align-items-center justify-content-center rounded-circle"
          style={{ width: '88px', height: '88px', backgroundColor: '#000', flexShrink: 0 }}
        >
          <i className="bi bi-check-lg text-white" style={{ fontSize: '40px', lineHeight: 1 }}></i>
        </div>

        <h2 className="fw-bold mb-3" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '36px', letterSpacing: '-0.5px' }}>
          Bài đã được nộp
        </h2>
        <p className="mb-2" style={{ fontSize: '17px', fontFamily: 'UberMoveText, system-ui, sans-serif', color: '#3d3d3d' }}>
          Bài Reading của bạn đã được gửi thành công.
        </p>
        <p className="mb-5" style={{ fontSize: '15px', fontFamily: 'UberMoveText, system-ui, sans-serif', color: '#767676' }}>
          Kết quả sẽ hiển thị trong lịch sử bài làm sau khi giáo viên hoặc AI hoàn tất chấm điểm.
        </p>

        <div style={{ width: '100%', height: '1px', backgroundColor: '#e2e2e2', marginBottom: '28px' }}></div>

        <button
          className="btn btn-dark rounded-pill px-5 py-3 fw-semibold"
          style={{ fontSize: '15px', fontFamily: 'UberMoveText, system-ui, sans-serif', letterSpacing: '0.1px' }}
          onClick={() => navigate('/reading')}
        >
          Trở về danh sách đề
        </button>
      </div>
    </div>
  );
}

export default TestResultPage;
