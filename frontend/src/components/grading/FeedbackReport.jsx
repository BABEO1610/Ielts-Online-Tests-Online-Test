import { useState, useEffect, useCallback } from 'react';
import gradingService from '../../services/grading.service';
import useGradingSocket from '../../hooks/useGradingSocket';
import AiFeedbackPanel from './AiFeedbackPanel';

const FeedbackReport = ({ submissionId, type }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { socket } = useGradingSocket();

  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await gradingService.getFeedback(submissionId, type);
      if (response.success) {
        setReportData(response.data);
      } else {
        setError(response.error?.message || 'Có lỗi xảy ra khi tải điểm.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Không thể kết nối đến server.');
    } finally {
      setLoading(false);
    }
  }, [submissionId, type]);

  // EARS[Event]: WHEN component mounts THEN fetch feedback report initially (Fallback mechanism)
  useEffect(() => {
    if (submissionId) {
      const timer = window.setTimeout(fetchFeedback, 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [fetchFeedback, submissionId]);

  // EARS[Event]: WHEN socket emits grading_complete or grading_failed THEN refetch or update state
  useEffect(() => {
    if (!socket) return;

    const handleGradingComplete = (data) => {
      const eventSubmissionId = data.submission_id || data.submissionId;
      if (eventSubmissionId === submissionId) {
        fetchFeedback();
      }
    };

    const handleGradingFailed = (data) => {
      const eventSubmissionId = data.submission_id || data.submissionId;
      if (eventSubmissionId === submissionId) {
        setError('AI grading failed. Please check AI configuration or try again.');
        setLoading(false);
      }
    };

    socket.on('grading_complete', handleGradingComplete);
    socket.on('grading_failed', handleGradingFailed);

    return () => {
      // EARS[Event]: WHEN component unmounts THEN clean up socket listeners to prevent memory leaks and duplicate events
      socket.off('grading_complete', handleGradingComplete);
      socket.off('grading_failed', handleGradingFailed);
    };
  }, [socket, submissionId, fetchFeedback]);

  // UI/UX Chuẩn Bootstrap 5 - Trạng thái Pending
  if (loading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-muted fw-bold">Bài làm của bạn đang được chấm...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <h4 className="alert-heading">Lỗi!</h4>
        <p>{error}</p>
        <button className="btn btn-outline-danger mt-2" onClick={fetchFeedback}>Thử lại</button>
      </div>
    );
  }

  if (!reportData || (!reportData.ai_report && !reportData.tutor_report)) {
    return (
      <div className="alert alert-info" role="alert">
        <p className="mb-0">Chưa có kết quả chấm điểm cho bài làm này.</p>
      </div>
    );
  }

  const report = reportData.tutor_report || reportData.ai_report;
  const isTutor = !!reportData.tutor_report;

  if (!isTutor && reportData.ai_report) {
    return (
      <div className="feedback-report mt-4">
        <AiFeedbackPanel report={reportData.ai_report} />
      </div>
    );
  }

  const formatScore = (score) => {
    if (score === null || score === undefined) return 'N/A';
    const num = parseFloat(score);
    return isNaN(num) ? 'N/A' : num.toFixed(1);
  };

  // UI/UX Minimalist Black & White Theme (Uber-like)
  return (
    <div className="feedback-report mt-4" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
      {/* Nổi bật Điểm Overall */}
      <div className="card shadow-none border mb-4 rounded-4" style={{ borderColor: '#e2e2e2' }}>
        <div className="card-body text-center py-5 bg-white rounded-4">
          <h2 className="text-uppercase fw-bold text-dark mb-2" style={{ fontSize: '16px', letterSpacing: '1px' }}>Overall Band Score</h2>
          <div className="display-1 fw-bold text-dark mb-4" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '80px' }}>
            {formatScore(report.band_score)}
          </div>
          <span className="badge bg-dark text-white rounded-pill fs-6 px-4 py-2 fw-medium">
            Graded by {isTutor ? 'Tutor' : 'AI'}
          </span>
        </div>
      </div>

      {/* 4 tiêu chí thành phần hiển thị dạng Grid */}
      <div className="row g-4 mb-4">
        {type === 'writing' ? (
          <>
            <div className="col-6 col-lg-3">
              <div className="card h-100 border shadow-none rounded-4" style={{ borderColor: '#e2e2e2', backgroundColor: '#fdfdfd' }}>
                <div className="card-body p-3 p-lg-4 text-center">
                  <h6 className="card-title text-muted fw-medium mb-2 mb-lg-3" style={{ fontSize: '13px' }}>Task Achievement / Response</h6>
                  <h3 className="card-text fw-bold text-dark mb-0" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '28px' }}>{formatScore(report.task_achievement_score || report.task_response_score)}</h3>
                </div>
              </div>
            </div>
            <div className="col-6 col-lg-3">
              <div className="card h-100 border shadow-none rounded-4" style={{ borderColor: '#e2e2e2', backgroundColor: '#fdfdfd' }}>
                <div className="card-body p-3 p-lg-4 text-center">
                  <h6 className="card-title text-muted fw-medium mb-2 mb-lg-3" style={{ fontSize: '13px' }}>Coherence & Cohesion</h6>
                  <h3 className="card-text fw-bold text-dark mb-0" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '28px' }}>{formatScore(report.coherence_score)}</h3>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="col-6 col-lg-3">
              <div className="card h-100 border shadow-none rounded-4" style={{ borderColor: '#e2e2e2', backgroundColor: '#fdfdfd' }}>
                <div className="card-body p-3 p-lg-4 text-center">
                  <h6 className="card-title text-muted fw-medium mb-2 mb-lg-3" style={{ fontSize: '13px' }}>Fluency & Coherence</h6>
                  <h3 className="card-text fw-bold text-dark mb-0" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '28px' }}>{formatScore(report.fluency_score)}</h3>
                </div>
              </div>
            </div>
            <div className="col-6 col-lg-3">
              <div className="card h-100 border shadow-none rounded-4" style={{ borderColor: '#e2e2e2', backgroundColor: '#fdfdfd' }}>
                <div className="card-body p-3 p-lg-4 text-center">
                  <h6 className="card-title text-muted fw-medium mb-2 mb-lg-3" style={{ fontSize: '13px' }}>Pronunciation</h6>
                  <h3 className="card-text fw-bold text-dark mb-0" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '28px' }}>{formatScore(report.pronunciation_score)}</h3>
                </div>
              </div>
            </div>
          </>
        )}
        <div className="col-6 col-lg-3">
          <div className="card h-100 border shadow-none rounded-4" style={{ borderColor: '#e2e2e2', backgroundColor: '#fdfdfd' }}>
            <div className="card-body p-3 p-lg-4 text-center">
              <h6 className="card-title text-muted fw-medium mb-2 mb-lg-3" style={{ fontSize: '13px' }}>Lexical Resource</h6>
              <h3 className="card-text fw-bold text-dark mb-0" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '28px' }}>{formatScore(report.lexical_score)}</h3>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card h-100 border shadow-none rounded-4" style={{ borderColor: '#e2e2e2', backgroundColor: '#fdfdfd' }}>
            <div className="card-body p-3 p-lg-4 text-center">
              <h6 className="card-title text-muted fw-medium mb-2 mb-lg-3" style={{ fontSize: '13px' }}>Grammatical Range & Accuracy</h6>
              <h3 className="card-text fw-bold text-dark mb-0" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '28px' }}>{formatScore(report.grammar_score)}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Error Highlights */}
      {report.error_highlights && report.error_highlights.length > 0 && (
        <div className="card shadow-none mb-4 rounded-4 border" style={{ borderColor: '#e2e2e2' }}>
          <div className="card-header bg-dark text-white rounded-top-4 py-3 border-0">
            <h5 className="mb-0 fw-bold" style={{ fontFamily: 'UberMove, system-ui, sans-serif' }}><i className="bi bi-exclamation-triangle-fill me-2 text-warning"></i>Error Highlights</h5>
          </div>
          <div className="card-body p-0">
            <ul className="list-group list-group-flush rounded-bottom-4">
              {report.error_highlights.map((err, idx) => (
                <li key={idx} className="list-group-item px-4 py-4 border-bottom" style={{ borderColor: '#e2e2e2' }}>
                  <div className="mb-2">
                    <span className="badge bg-secondary rounded-pill px-3 py-1 fw-medium">{err.type || 'Error'}</span>
                  </div>
                  <div className="fst-italic text-muted mb-2 text-decoration-line-through" style={{ fontSize: '15px' }}>"{err.text}"</div>
                  <div className="fw-bold text-dark" style={{ fontSize: '15px' }}>&rarr; {err.suggestion}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Feedback chi tiết */}
      <div className="card shadow-none rounded-4 border" style={{ borderColor: '#e2e2e2' }}>
        <div className="card-header bg-white border-bottom py-3 rounded-top-4" style={{ borderColor: '#e2e2e2' }}>
          <h5 className="mb-0 fw-bold text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif' }}>Detailed Feedback</h5>
        </div>
        <div className="card-body p-4 bg-white rounded-bottom-4" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', fontSize: '15px' }}>
          {report.written_feedback || report.feedback_text || 'Không có nhận xét chi tiết.'}
        </div>
      </div>
    </div>
  );
};

export default FeedbackReport;
