import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StudentNavbar from '../../components/layout/StudentNavbar';
import ModeSelector from '../../components/objective-testing/ModeSelector';
import api from '../../services/api';


const DIFFICULTY_STYLE = {
  'Dễ': { bg: '#efefef', color: '#5e5e5e' },
  'Trung bình': { bg: '#000', color: '#fff' },
  'Khó': { bg: '#282828', color: '#afafaf' }
};

// ─── Level 2: Tasks của một đề ───────────────────────────────────────────────
const WritingTaskList = ({ exam, onStartExam, onBack }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showModeModal, setShowModeModal] = useState(false);

  const handleStartClick = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { message: 'Vui lòng đăng nhập để bắt đầu làm bài' } });
      return;
    }
    setShowModeModal(true);
  };

  const handleModeSelect = (modeConfig) => {
    setShowModeModal(false);
    onStartExam(modeConfig);
  };

  return (
    <div className="bg-white min-vh-100 pb-5">
      <StudentNavbar />
      <main className="container-fluid px-3 px-md-5 mt-4 mt-md-5" style={{ maxWidth: '1200px' }}>
        <div className="d-flex align-items-center gap-3 mb-2">
          <button
            className="btn btn-light rounded-pill px-4 py-2 fw-medium border-0"
            style={{ backgroundColor: '#efefef', fontSize: '14px' }}
            onClick={onBack}
          >
            ← Tất cả đề thi
          </button>
        </div>

        <div className="mb-5 mt-3">
          <h1 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '40px' }}>
            {exam.title}
          </h1>
          <div className="d-flex justify-content-between align-items-center mb-0 mt-4">
            <p className="text-muted mb-0" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px' }}>
              Gồm {exam.tasks.length} phần · Hoàn thành toàn bộ để nhận điểm chấm
            </p>
            <button className="btn btn-dark rounded-pill px-5 py-3 fw-bold" style={{ fontSize: '16px' }} onClick={handleStartClick}>
              Bắt đầu làm bài thi
            </button>
          </div>
        </div>

        <div className="d-flex flex-column gap-3">
          {exam.tasks.map((task, idx) => (
            <div
              key={task.id}
              className="d-flex align-items-center justify-content-between p-4 rounded-4 bg-white"
              style={{ border: '1px solid #e2e2e2' }}
            >
              <div className="d-flex align-items-center gap-4">
                {/* Task Number Badge */}
                <div
                  className="d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                  style={{ width: '56px', height: '56px', borderRadius: '999px', backgroundColor: '#000', color: '#fff', fontSize: '20px', fontFamily: 'UberMove, system-ui, sans-serif' }}
                >
                  {idx + 1}
                </div>
                <div>
                  <h4 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '20px' }}>
                    {task.title}
                  </h4>
                  <div className="d-flex gap-2 flex-wrap">
                    <span className="text-muted fw-medium" style={{ fontSize: '14px' }}>⏱ {task.duration}</span>
                    <span className="text-muted" style={{ fontSize: '14px' }}>·</span>
                    <span className="text-muted fw-medium" style={{ fontSize: '14px' }}>✍ Tối thiểu {task.min_words} từ</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <ModeSelector
          show={showModeModal}
          onHide={() => setShowModeModal(false)}
          onSelectMode={handleModeSelect}
          examType="Writing"
          fullDuration={exam.tasks.reduce((acc, t) => acc + (parseInt(t.duration) || 0), 0)}
        />
      </main>
    </div>
  );
};

// ─── Level 1: Danh sách đề thi ───────────────────────────────────────────────
const WritingPage = () => {
  const [selectedExam, setSelectedExam] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchExams = async () => {
      try {
        setLoading(true);
        const res = await api.get('/tests/writing');
        if (res.data.success) {
          setExams(res.data.data || []);
        } else {
          setError(res.data.error?.message || 'Không thể lấy dữ liệu');
        }
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Lỗi kết nối máy chủ');
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  const handleViewExam = (exam) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { message: 'Vui lòng đăng nhập để xem chi tiết đề thi' } });
      return;
    }
    setSelectedExam(exam);
  };

  const handleStartExam = (modeConfig) => {
    if (selectedExam) {
      navigate(`/tests/${selectedExam.id}/writing`, {
        state: {
          practiceMode: modeConfig.isPractice,
          customTimeLimit: modeConfig.customTimeLimit,
          exam: selectedExam
        }
      });
    }
  };

  // Level 2: Danh sách task của một đề
  if (selectedExam) {
    return (
      <WritingTaskList
        exam={selectedExam}
        onStartExam={handleStartExam}
        onBack={() => setSelectedExam(null)}
      />
    );
  }

  // Level 1: Danh sách đề thi
  return (
    <div className="bg-white min-vh-100 pb-5">
      <StudentNavbar />
      <main className="container-fluid px-3 px-md-5 mt-4 mt-md-5" style={{ maxWidth: '1200px' }}>

        <div className="mb-5">
          <h1 className="fw-bold mb-2 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '52px' }}>
            Writing
          </h1>
          <p className="text-muted" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '20px' }}>
            Chọn đề thi để luyện viết. Nộp bài để nhận điểm từ AI hoặc giáo viên.
          </p>
        </div>

        {/* Exam List */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-dark" role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : exams.length === 0 ? (
          <div className="text-center py-5 text-muted">Không có đề thi nào.</div>
        ) : (
          <div className="row g-4">
            {exams.map((exam) => {
              const diff = DIFFICULTY_STYLE[exam.difficulty] || DIFFICULTY_STYLE['Trung bình'];
              return (
                <div key={exam.id} className="col-md-6">
                  <div
                    className="p-4 rounded-4 h-100 d-flex flex-column justify-content-between"
                    style={{ border: '1px solid #e2e2e2', cursor: 'pointer', transition: 'box-shadow 0.2s ease' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = 'rgba(0,0,0,0.12) 0px 4px 16px 0px'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                    onClick={() => handleViewExam(exam)}
                  >
                    <div>
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <span
                          className="rounded-pill px-3 py-1 fw-medium"
                          style={{ backgroundColor: diff.bg, color: diff.color, fontSize: '13px', fontFamily: 'UberMoveText, system-ui, sans-serif' }}
                        >
                          {exam.difficulty}
                        </span>
                        <span className="text-muted fw-medium" style={{ fontSize: '13px' }}>
                          {exam.tasks ? exam.tasks.length : 0} Tasks
                        </span>
                      </div>
                      <h3 className="fw-bold mb-2 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '24px' }}>
                        {exam.title}
                      </h3>
                      <p className="text-muted mb-4" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', lineHeight: '1.6' }}>
                        {exam.tasks ? exam.tasks.map(t => t.title).join(' · ') : ''}
                      </p>
                    </div>
                    <button
                      className="btn btn-dark rounded-pill px-4 py-2 fw-medium align-self-start"
                      style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '15px' }}
                      onClick={(e) => { e.stopPropagation(); handleViewExam(exam); }}
                    >
                      Xem đề →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default WritingPage;
