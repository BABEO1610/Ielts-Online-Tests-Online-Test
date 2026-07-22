import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentNavbar from '../../components/layout/StudentNavbar';
import FeedbackReport from '../../components/grading/FeedbackReport';
import gradingService from '../../services/grading.service';

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const StatusBadge = ({ status }) => {
  const config = {
    pending: { bg: '#efefef', color: '#5e5e5e', label: 'Đang chấm' },
    ai_graded: { bg: '#000', color: '#fff', label: 'Đã chấm (AI)' },
    tutor_graded: { bg: '#000', color: '#fff', label: 'Đã chấm (GV)' },
    failed: { bg: '#e2e2e2', color: '#5e5e5e', label: 'Chấm thất bại' },
    queued: { bg: '#efefef', color: '#5e5e5e', label: 'Đã xếp hàng' },
    running: { bg: '#fff3cd', color: '#664d03', label: 'AI đang phân tích' },
    retry_wait: { bg: '#fff3cd', color: '#664d03', label: 'Đang chờ thử lại' },
    completed: { bg: '#000', color: '#fff', label: 'AI đã hoàn tất' },
    needs_review: { bg: '#cff4fc', color: '#055160', label: 'Chờ tutor xác nhận' },
  };
  const { bg, color, label } = config[status] || { bg: '#efefef', color: '#5e5e5e', label: status };
  return (
    <span
      className="rounded-pill px-3 py-1 fw-medium"
      style={{ backgroundColor: bg, color, fontSize: '13px', fontFamily: 'UberMoveText, system-ui, sans-serif', display: 'inline-block' }}
    >
      {label}
    </span>
  );
};

const StudentHistoryPage = () => {
  const navigate = useNavigate();
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [filterType, setFilterType] = useState('all');

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [aiGradingIds, setAiGradingIds] = useState({});
  const [retryIds, setRetryIds] = useState({});
  const scoredBands = history
    .map((submission) => submission.band_score)
    .filter((band) => band !== null && band !== undefined && band !== '')
    .map(Number)
    .filter((band) => Number.isFinite(band) && band >= 0 && band <= 9);
  const currentAverage = scoredBands.length > 0
    ? scoredBands.reduce((sum, band) => sum + band, 0) / scoredBands.length
    : null;

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await gradingService.getSubmissionHistory();
        if (res.success) {
          setHistory(res.data || []);
        } else {
          setError(res.error?.message || 'Lỗi không xác định');
        }
      } catch (err) {
        setError(err.message || 'Lỗi kết nối');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [refreshKey]);

  const filtered = filterType === 'all' ? history : history.filter(s => s.type === filterType);

  const handleAiGrading = async (submission) => {
    const tasks = submission.aiGradingTasks?.length
      ? submission.aiGradingTasks
      : [{ submissionId: submission.aiGradingSubmissionId }];
    const validTasks = tasks.filter(task => task?.submissionId);
    if (validTasks.length === 0) return;

    setAiGradingIds(prev => ({ ...prev, [submission.id]: true }));
    setError(null);
    try {
      for (const task of validTasks) {
        await gradingService.requestAiGrading(task.submissionId);
      }
      setRefreshKey(key => key + 1);
    } catch (err) {
      const message = err.response?.data?.error?.message
        || err.message
        || 'Không thể gửi yêu cầu AI chấm điểm.';
      setError(message);
    } finally {
      setAiGradingIds(prev => ({ ...prev, [submission.id]: false }));
    }
  };

  const handleSpeakingRetry = async (submission) => {
    setRetryIds((current) => ({ ...current, [submission.id]: true }));
    setError(null);
    try {
      await gradingService.retrySpeakingGrading(submission.id);
      setRefreshKey((key) => key + 1);
    } catch (retryError) {
      setError(retryError.response?.data?.error?.message || 'Không thể retry bài Speaking.');
    } finally {
      setRetryIds((current) => ({ ...current, [submission.id]: false }));
    }
  };

  const openDetailPage = (submission) => {
    navigate(`/student/profile/practice-history/${submission.id}?type=${submission.type}`, {
      state: { type: submission.type },
    });
  };

  return (
    <div className="bg-white min-vh-100 pb-5">
      <StudentNavbar />

      <main className="container-fluid px-3 px-md-5 mt-4 mt-md-5" style={{ maxWidth: '1200px' }}>

        {/* Hero */}
        <div className="mb-5">
          <h1 className="fw-bold mb-2 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '52px' }}>
            Lịch sử chấm bài
          </h1>
          <p className="text-muted" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '20px' }}>
            Theo dõi tiến độ và xem lại kết quả các bài nộp của bạn.
          </p>
        </div>

        {/* Stats Widgets — 3 cards: Target Band / Current Avg / Remaining Quota */}
        <div className="row g-3 mb-5">
          <div className="col-md-4">
            <div className="p-4 rounded-4" style={{ backgroundColor: '#000', color: '#fff' }}>
              <p className="mb-1 fw-medium" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', color: '#afafaf' }}>
                MỤC TIÊU BAND
              </p>
              <p className="mb-0 fw-bold" style={{ fontSize: '48px', fontFamily: 'UberMove, system-ui, sans-serif', lineHeight: 1 }}>
                Chưa đặt
              </p>
              <p className="mt-2 mb-0" style={{ fontSize: '14px', color: '#afafaf', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                Mục tiêu IELTS Overall
              </p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="p-4 rounded-4" style={{ backgroundColor: '#efefef' }}>
              <p className="mb-1 fw-medium" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', color: '#5e5e5e' }}>
                ĐIỂM TRUNG BÌNH HIỆN TẠI
              </p>
              <p className="mb-0 fw-bold text-dark" style={{ fontSize: '48px', fontFamily: 'UberMove, system-ui, sans-serif', lineHeight: 1 }}>
                {currentAverage === null ? 'Chưa có' : currentAverage.toFixed(2)}
              </p>
              <p className="mt-2 mb-0" style={{ fontSize: '14px', color: '#5e5e5e', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                Tính trên các bài đã chấm xong
              </p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="p-4 rounded-4" style={{ backgroundColor: '#efefef' }}>
              <p className="mb-1 fw-medium" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', color: '#5e5e5e' }}>
                HẠN MỨC CHẤM AI
              </p>
              <p className="mb-0 fw-bold text-dark" style={{ fontSize: '48px', fontFamily: 'UberMove, system-ui, sans-serif', lineHeight: 1 }}>
                10
              </p>
              <p className="mt-2 mb-0" style={{ fontSize: '14px', color: '#5e5e5e', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                Bài mới/ngày UTC · lượt còn lại do máy chủ kiểm tra
              </p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="d-flex gap-2 mb-4 border-bottom pb-1">
          {['all', 'writing', 'speaking'].map(type => (
            <button
              key={type}
              className="btn rounded-pill px-4 py-2 fw-medium border-0"
              style={{
                backgroundColor: filterType === type ? '#000' : '#efefef',
                color: filterType === type ? '#fff' : '#000',
                fontFamily: 'UberMoveText, system-ui, sans-serif',
                fontSize: '15px',
                transition: 'all 0.15s ease'
              }}
              onClick={() => setFilterType(type)}
            >
              {type === 'all' ? 'Tất cả' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Submission Table */}
        {loading ? (
          <div className="text-center py-5 rounded-4" style={{ backgroundColor: '#efefef' }} role="status">
            <p className="fw-bold text-dark mb-0" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px' }}>
              Đang tải lịch sử bài nộp...
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-5 rounded-4" style={{ backgroundColor: '#fee' }}>
            <p className="fw-bold text-danger mb-0" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px' }}>
              Lỗi!
            </p>
            <p className="text-danger mb-0">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-5 rounded-4" style={{ backgroundColor: '#efefef' }}>
            <p className="fw-bold text-dark mb-0" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px' }}>
              Bạn chưa có bài nộp nào.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
              <thead>
                <tr style={{ backgroundColor: '#efefef' }}>
                  <th className="py-3 px-4 border-0 fw-bold text-dark" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ngày nộp</th>
                  <th className="py-3 px-4 border-0 fw-bold text-dark" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Kỹ năng</th>
                  <th className="py-3 px-4 border-0 fw-bold text-dark" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chi tiết</th>
                  <th className="py-3 px-4 border-0 fw-bold text-dark" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trạng thái</th>
                  <th className="py-3 px-4 border-0 fw-bold text-dark text-center" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Band Score</th>
                  <th className="py-3 px-4 border-0"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sub) => (
                  <tr
                    key={sub.id}
                    style={{ cursor: sub.band_score ? 'pointer' : 'default', borderBottom: '1px solid #e2e2e2' }}
                    onClick={() => sub.band_score && setSelectedSubmission(sub)}
                    onMouseEnter={e => { if (sub.band_score) e.currentTarget.style.backgroundColor = '#f3f3f3'; }}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                  >
                    <td className="py-3 px-4 border-0 text-muted" style={{ fontSize: '14px' }}>
                      {formatDate(sub.submitted_at)}
                    </td>
                    <td className="py-3 px-4 border-0 fw-bold text-dark text-capitalize" style={{ fontSize: '15px' }}>
                      {sub.type}
                    </td>
                    <td className="py-3 px-4 border-0 text-muted" style={{ fontSize: '14px' }}>
                      {sub.task_number || sub.part_number ? (sub.type === 'writing' ? `Task ${sub.task_number}` : `Part ${sub.part_number}`) : 'Full Test'}
                    </td>
                    <td className="py-3 px-4 border-0">
                      <StatusBadge status={sub.gradingStatus || sub.status} />
                      {sub.gradingStage && !['completed', 'needs_review', 'failed'].includes(sub.gradingStatus) && (
                        <div className="text-muted mt-1" style={{ fontSize: '11px' }}>{sub.gradingStage}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 border-0 text-center">
                      {sub.band_score ? (
                        <div>
                          <span className="fw-bold text-dark" style={{ fontSize: '20px', fontFamily: 'UberMove, system-ui, sans-serif' }}>
                            {(Math.round(Number(sub.band_score) * 2) / 2).toFixed(1)}
                          </span>
                          <div className="text-muted" style={{ fontSize: '12px' }}>
                            {sub.tutor_band_score ? 'Tutor Final' : 'AI Estimated'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '14px' }}>—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 border-0">
                      {sub.band_score && (
                        <button
                          className="btn btn-dark rounded-pill px-3 py-1 fw-medium"
                          style={{ fontSize: '13px' }}
                          onClick={(e) => { e.stopPropagation(); openDetailPage(sub); }}
                        >
                          Xem chi tiết
                        </button>
                      )}
                      {(sub.gradingStatus || sub.status) === 'pending' && sub.type === 'writing' && sub.grader === 'ai' && (
                        <button
                          className="btn btn-dark rounded-pill px-3 py-1 fw-medium"
                          style={{ fontSize: '13px' }}
                          disabled={!!aiGradingIds[sub.id]}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAiGrading(sub);
                          }}
                        >
                          {aiGradingIds[sub.id] ? 'Đang chấm...' : 'AI Chấm điểm'}
                        </button>
                      )}
                      {(sub.gradingStatus || sub.status) === 'pending' && !(sub.type === 'writing' && sub.grader === 'ai') && (
                        <span className="text-muted fw-medium" style={{ fontSize: '13px' }}>Đang xử lý...</span>
                      )}
                      {(sub.gradingStatus || sub.status) === 'failed' && (
                        sub.type === 'speaking' && sub.canRetry ? (
                          <button
                            className="btn btn-outline-dark rounded-pill px-3 py-1 fw-medium"
                            style={{ fontSize: '13px' }}
                            disabled={!!retryIds[sub.id]}
                            onClick={(event) => { event.stopPropagation(); handleSpeakingRetry(sub); }}
                          >
                            {retryIds[sub.id] ? 'Đang retry...' : 'Thử lại một lần'}
                          </button>
                        ) : <span className="text-muted fw-medium" style={{ fontSize: '13px' }}>AI lỗi</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Feedback Modal */}
      {selectedSubmission && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
          onClick={() => setSelectedSubmission(null)}
        >
          <div
            className="bg-white rounded-4 shadow"
            style={{ width: '95%', maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="d-flex justify-content-between align-items-center p-4 border-bottom">
              <h4 className="fw-bold mb-0 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif' }}>
                Kết quả — {selectedSubmission.task_number || selectedSubmission.part_number ? (selectedSubmission.type === 'writing' ? `Writing Task ${selectedSubmission.task_number}` : `Speaking Part ${selectedSubmission.part_number}`) : (selectedSubmission.type === 'writing' ? 'Writing Test' : 'Speaking Test')}
              </h4>
              <button
                className="btn btn-light rounded-pill px-3 py-1 fw-medium border-0"
                style={{ backgroundColor: '#efefef' }}
                onClick={() => setSelectedSubmission(null)}
              >
                ✕ Đóng
              </button>
            </div>
            {/* Modal Body */}
            <div className="p-4">
              <FeedbackReport
                submissionId={selectedSubmission.id}
                type={selectedSubmission.type}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentHistoryPage;
