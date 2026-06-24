import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { attemptService } from '../../services/attempt.service';
import ReadingReviewPage from './ReadingReviewPage';
import ListeningReviewPage from './ListeningReviewPage';

function TestReviewRouter() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attemptData, setAttemptData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchAttempt = async () => {
      try {
        setLoading(true);
        const res = await attemptService.getAttemptDetail(attemptId);
        if (!cancelled) {
          if (res.success && res.data) {
            setAttemptData(res.data);
          } else {
            setError(res.error?.message || 'Không tìm thấy kết quả hoặc không có quyền truy cập.');
          }
        }
      } catch (err) {
        if (!cancelled) setError('Lỗi kết nối đến server.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAttempt();
    return () => { cancelled = true; };
  }, [attemptId]);

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !attemptData) {
    return (
      <div className="container py-5 text-center">
        <p style={{ color: '#c0392b', fontSize: 18 }}>{error || 'Lỗi không xác định.'}</p>
        <button className="btn btn-dark rounded-pill px-4 mt-2" onClick={() => navigate('/tests')}>
          Về danh sách đề thi
        </button>
      </div>
    );
  }

  if (attemptData.skill === 'reading') {
    return <ReadingReviewPage attemptDetail={attemptData} />;
  }
  
  if (attemptData.skill === 'listening') {
    return <ListeningReviewPage attemptDetail={attemptData} />;
  }

  return (
    <div className="container py-5 text-center">
      <p style={{ color: '#c0392b', fontSize: 18 }}>Loại bài thi không được hỗ trợ review.</p>
    </div>
  );
}

export default TestReviewRouter;
