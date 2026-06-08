import React, { useState, useEffect, useCallback } from 'react';
import gradingService from '../../services/grading.service';
import useGradingSocket from '../../hooks/useGradingSocket';

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
      fetchFeedback();
    }
  }, [fetchFeedback, submissionId]);

  // EARS[Event]: WHEN socket emits grading_complete or grading_failed THEN refetch or update state
  useEffect(() => {
    if (!socket) return;

    const handleGradingComplete = (data) => {
      if (data.submission_id === submissionId) {
        fetchFeedback();
      }
    };

    const handleGradingFailed = (data) => {
      if (data.submission_id === submissionId) {
        setError('Chấm bài thất bại, quota đã được hoàn trả.');
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

  // UI/UX Chuẩn Bootstrap 5 - Trạng thái Success
  return (
    <div className="feedback-report mt-4">
      {/* Nổi bật Điểm Overall */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body text-center py-5 bg-light rounded">
          <h2 className="text-uppercase text-muted mb-2">Overall Band Score</h2>
          <div className="display-1 fw-bold text-primary mb-3">
            {report.band_score?.toFixed(1) || 'N/A'}
          </div>
          <span className={`badge ${isTutor ? 'bg-success' : 'bg-primary'} fs-5 px-3 py-2`}>
            Graded by {isTutor ? 'Tutor' : 'AI'}
          </span>
        </div>
      </div>

      {/* 4 tiêu chí thành phần hiển thị dạng Grid */}
      <div className="row g-4 mb-4">
        <div className="col-md-6 col-lg-3">
          <div className="card h-100 border-start border-4 border-primary shadow-sm">
            <div className="card-body">
              <h6 className="card-title text-muted fw-bold">Task Achievement / Response</h6>
              <h3 className="card-text fw-bold text-dark">{report.task_achievement_score?.toFixed(1) || 'N/A'}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="card h-100 border-start border-4 border-success shadow-sm">
            <div className="card-body">
              <h6 className="card-title text-muted fw-bold">Coherence & Cohesion</h6>
              <h3 className="card-text fw-bold text-dark">{report.coherence_score?.toFixed(1) || 'N/A'}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="card h-100 border-start border-4 border-warning shadow-sm">
            <div className="card-body">
              <h6 className="card-title text-muted fw-bold">Lexical Resource</h6>
              <h3 className="card-text fw-bold text-dark">{report.lexical_score?.toFixed(1) || 'N/A'}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="card h-100 border-start border-4 border-danger shadow-sm">
            <div className="card-body">
              <h6 className="card-title text-muted fw-bold">Grammatical Range & Accuracy</h6>
              <h3 className="card-text fw-bold text-dark">{report.grammar_score?.toFixed(1) || 'N/A'}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* For Speaking: Fluency and Pronunciation */}
      {(report.fluency_score !== undefined || report.pronunciation_score !== undefined) && (
        <div className="row g-4 mb-4">
          {report.fluency_score !== undefined && (
            <div className="col-md-6">
              <div className="card h-100 border-start border-4 border-info shadow-sm">
                <div className="card-body">
                  <h6 className="card-title text-muted fw-bold">Fluency & Coherence</h6>
                  <h3 className="card-text fw-bold text-dark">{report.fluency_score?.toFixed(1) || 'N/A'}</h3>
                </div>
              </div>
            </div>
          )}
          {report.pronunciation_score !== undefined && (
            <div className="col-md-6">
              <div className="card h-100 border-start border-4 border-secondary shadow-sm">
                <div className="card-body">
                  <h6 className="card-title text-muted fw-bold">Pronunciation</h6>
                  <h3 className="card-text fw-bold text-dark">{report.pronunciation_score?.toFixed(1) || 'N/A'}</h3>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Highlights */}
      {report.error_highlights && report.error_highlights.length > 0 && (
        <div className="card shadow-sm mb-4 border-0">
          <div className="card-header bg-danger text-white">
            <h5 className="mb-0"><i className="bi bi-exclamation-triangle-fill me-2"></i>Error Highlights</h5>
          </div>
          <div className="card-body">
            <ul className="list-group list-group-flush">
              {report.error_highlights.map((err, idx) => (
                <li key={idx} className="list-group-item px-0 py-3">
                  <div className="mb-1">
                    <span className="badge bg-danger me-2">{err.type || 'Error'}</span>
                  </div>
                  <div className="fst-italic text-muted mb-1 text-decoration-line-through">"{err.text}"</div>
                  <div className="fw-bold text-success">&rarr; {err.suggestion}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Feedback & Suggestions */}
      {(report.suggestions || report.written_feedback) && (
        <div className="card shadow-sm border-0">
          <div className="card-header bg-info text-white">
            <h5 className="mb-0"><i className="bi bi-chat-left-text-fill me-2"></i>Feedback & Suggestions</h5>
          </div>
          <div className="card-body bg-light">
            <p className="card-text fs-5" style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>
              {report.written_feedback || report.suggestions}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackReport;
