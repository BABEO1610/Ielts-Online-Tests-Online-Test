import React, { useState } from 'react';
import StudentNavbar from '../../components/layout/StudentNavbar';
import StudentDashboardWidgets from '../../components/grading/StudentDashboardWidgets';
import FeedbackReport from '../../components/grading/FeedbackReport';

/**
 * MOCK DATA — Dữ liệu tĩnh dùng cho demo
 * Phản ánh cấu trúc DB thực tế (shared_context.md):
 * writing_submissions: id, user_id, test_id, task_number, status, band_score, submitted_at
 * speaking_submissions: id, user_id, test_id, part_number, status, band_score, submitted_at
 */
const MOCK_HISTORY = [
  {
    id: 'sub-writing-001',
    type: 'writing',
    task_number: 2,
    part_number: null,
    status: 'tutor_graded',
    band_score: 7.0,
    submitted_at: '2026-06-04T10:30:00Z',
    grader: 'tutor'
  },
  {
    id: 'sub-speaking-001',
    type: 'speaking',
    task_number: null,
    part_number: 1,
    status: 'ai_graded',
    band_score: 6.5,
    submitted_at: '2026-06-04T08:15:00Z',
    grader: 'ai'
  },
  {
    id: 'sub-writing-002',
    type: 'writing',
    task_number: 1,
    status: 'ai_graded',
    band_score: 6.0,
    submitted_at: '2026-06-03T14:00:00Z',
    grader: 'ai'
  },
  {
    id: 'sub-speaking-002',
    type: 'speaking',
    task_number: null,
    part_number: 2,
    status: 'pending',
    band_score: null,
    submitted_at: '2026-06-03T11:45:00Z',
    grader: 'ai'
  },
  {
    id: 'sub-writing-003',
    type: 'writing',
    task_number: 2,
    status: 'tutor_graded',
    band_score: 7.5,
    submitted_at: '2026-06-02T09:20:00Z',
    grader: 'tutor'
  },
  {
    id: 'sub-speaking-003',
    type: 'speaking',
    task_number: null,
    part_number: 3,
    status: 'failed',
    band_score: null,
    submitted_at: '2026-06-01T16:00:00Z',
    grader: 'ai'
  }
];

const MOCK_STATS = {
  targetBand: 7.0,
  currentAvg: 6.75,
  quotaRemaining: 7
};

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
    failed: { bg: '#e2e2e2', color: '#5e5e5e', label: 'Chấm thất bại' }
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
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [filterType, setFilterType] = useState('all');

  const filtered = filterType === 'all' ? MOCK_HISTORY : MOCK_HISTORY.filter(s => s.type === filterType);

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
                {MOCK_STATS.targetBand.toFixed(1)}
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
                {MOCK_STATS.currentAvg.toFixed(2)}
              </p>
              <p className="mt-2 mb-0" style={{ fontSize: '14px', color: '#5e5e5e', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                Tính trên các bài đã chấm xong
              </p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="p-4 rounded-4" style={{ backgroundColor: '#efefef' }}>
              <p className="mb-1 fw-medium" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', color: '#5e5e5e' }}>
                LƯỢT CHẤM AI CÒN LẠI
              </p>
              <p className="mb-0 fw-bold text-dark" style={{ fontSize: '48px', fontFamily: 'UberMove, system-ui, sans-serif', lineHeight: 1 }}>
                {MOCK_STATS.quotaRemaining}
              </p>
              <p className="mt-2 mb-0" style={{ fontSize: '14px', color: '#5e5e5e', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                Tháng này · Reset ngày 01
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
        {filtered.length === 0 ? (
          <div className="text-center py-5 rounded-4" style={{ backgroundColor: '#efefef' }}>
            <p className="fw-bold text-dark mb-0" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px' }}>
              Chưa có bài nộp nào.
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
                      {sub.type === 'writing' ? `Task ${sub.task_number}` : `Part ${sub.part_number}`}
                    </td>
                    <td className="py-3 px-4 border-0">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="py-3 px-4 border-0 text-center">
                      {sub.band_score ? (
                        <span className="fw-bold text-dark" style={{ fontSize: '20px', fontFamily: 'UberMove, system-ui, sans-serif' }}>
                          {sub.band_score.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '14px' }}>—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 border-0">
                      {sub.band_score && (
                        <button
                          className="btn btn-dark rounded-pill px-3 py-1 fw-medium"
                          style={{ fontSize: '13px' }}
                          onClick={(e) => { e.stopPropagation(); setSelectedSubmission(sub); }}
                        >
                          Xem kết quả
                        </button>
                      )}
                      {sub.status === 'pending' && (
                        <span className="text-muted fw-medium" style={{ fontSize: '13px' }}>Đang xử lý...</span>
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
                Kết quả — {selectedSubmission.type === 'writing' ? `Writing Task ${selectedSubmission.task_number}` : `Speaking Part ${selectedSubmission.part_number}`}
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
