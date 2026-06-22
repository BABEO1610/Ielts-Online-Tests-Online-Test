import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StudentNavbar from '../../components/layout/StudentNavbar';
import ModeSelector from '../../components/objective-testing/ModeSelector';
import { testService } from '../../services/test.service';

/**
 * ListeningPage.jsx — /listening
 * Level 1: Danh sách đề Listening theo tháng
 * Level 2: Sections của đề đó (4 sections chuẩn IELTS Listening)
 * Level 3: Redirect vào ListeningTestPage (/tests/:id/listening)
 *
 * DESIGN: Uber-inspired — black/white duet, pill shapes (rounded.pill = 999px),
 *         cards (rounded.xl = 16px), UberMove/UberMoveText fonts, sentence-case.
 */

const DIFFICULTY_STYLE = {
  'beginner':        { bg: '#efefef', color: '#5e5e5e', label: 'Dễ' },
  'intermediate':    { bg: '#000',    color: '#fff', label: 'Trung bình' },
  'advanced':        { bg: '#282828', color: '#afafaf', label: 'Khó' }
};

// ─── Level 2: Sections của một đề ─────────────────────────────────────────────
const SectionList = ({ exam, onBack }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [showModeModal, setShowModeModal] = useState(false);

  const handleStartTest = (modeConfig) => {
    // EARS[Event]: WHEN user tries to start test
    if (!isAuthenticated) {
      // EARS[Unwanted]: IF user is not authenticated THEN redirect to login
      navigate('/login', { state: { message: 'Vui lòng đăng nhập để bắt đầu làm bài thi' } });
      return;
    }
    setShowModeModal(false);
    navigate(`/tests/${exam.id}/listening`, { 
      state: { 
        practiceMode: modeConfig.isPractice,
        selectedPartIds: modeConfig.selectedPartIds,
        customTimeLimit: modeConfig.customTimeLimit
      } 
    });
  };

  // We mock sections count based on standard IELTS layout if backend doesn't provide them
  const partsForMode = [
    { id: 's1', label: 'Section 1' },
    { id: 's2', label: 'Section 2' },
    { id: 's3', label: 'Section 3' },
    { id: 's4', label: 'Section 4' }
  ];

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
        <p className="text-muted mb-1 fw-medium" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '1px' }}>
          CHỦ ĐỀ: TỔNG HỢP
        </p>
        <h1 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '40px' }}>
          {exam.title}
        </h1>
        <p className="text-muted mb-0" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px' }}>
          {exam.sections?.length || 4} sections · {exam.questions || 40} câu hỏi · {exam.duration_minutes || 30} phút
        </p>
      </div>

      <div className="d-flex flex-column gap-3 mb-5">
        {/* Placeholder for sections list since we fetch full detail only on next page */}
        <div className="text-muted">
          Bài thi bao gồm 4 phần nghe (Listening Parts). Nội dung chi tiết sẽ được tải khi bạn bắt đầu làm bài.
        </div>
      </div>

      {/* Start Full Test CTA */}
      <div className="p-5 rounded-4 text-center" style={{ backgroundColor: '#000' }}>
        <h3 className="fw-bold mb-2" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '32px', color: '#fff' }}>
          Sẵn sàng chưa?
        </h3>
        <p className="mb-4" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px', color: '#afafaf' }}>
          Làm toàn bộ đề trong {exam.duration_minutes || 30} phút. Nghe audio chỉ một lần — đúng như thi thật.
        </p>
        <button
          onClick={() => setShowModeModal(true)}
          className="btn rounded-pill px-5 py-3 fw-bold"
          style={{ backgroundColor: '#fff', color: '#000', fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px', border: 'none' }}
        >
          Bắt đầu làm bài →
        </button>
      </div>

      <ModeSelector 
        show={showModeModal} 
        onHide={() => setShowModeModal(false)} 
        onSelectMode={handleStartTest} 
        examType="Listening"
        parts={partsForMode}
        fullDuration={exam.duration_minutes || 30}
      />
    </main>
  </div>
  );
};

const ListeningPage = () => {
  const [selectedExam, setSelectedExam] = useState(null);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  React.useEffect(() => {
    let mounted = true;
    const fetchExams = async () => {
      setLoading(true);
      try {
        const response = await testService.getTests({ skill: 'listening', isPublished: 'true' });
        if (mounted && response && response.data) {
          setTests(response.data);
        }
      } catch (err) {
        console.error('Failed to load listening tests', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchExams();
    return () => { mounted = false; };
  }, []);

  const handleViewExam = (exam) => {
    // EARS[Event]: WHEN user tries to view exam details
    if (!isAuthenticated) {
      // EARS[Unwanted]: IF user is not authenticated THEN redirect to login
      navigate('/login', { state: { message: 'Vui lòng đăng nhập để xem chi tiết đề thi' } });
      return;
    }
    setSelectedExam(exam);
  };

  if (selectedExam) {
    return <SectionList exam={selectedExam} onBack={() => setSelectedExam(null)} />;
  }

  return (
    <div className="bg-white min-vh-100 pb-5">
      <StudentNavbar />
      <main className="container-fluid px-3 px-md-5 mt-4 mt-md-5" style={{ maxWidth: '1200px' }}>

        {/* Hero */}
        <div className="mb-5">
          <h1 className="fw-bold mb-2 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '52px' }}>
            Listening
          </h1>
          <p className="text-muted" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '20px' }}>
            Chọn đề thi để luyện nghe. 40 câu hỏi · 30 phút · Chấm tự động ngay lập tức.
          </p>
        </div>

        {/* Exam Cards */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-dark" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-5 text-muted">Không có bài thi nào khả dụng lúc này.</div>
        ) : (
          <div className="row g-4">
            {tests.map((exam) => {
              const diff = DIFFICULTY_STYLE[exam.difficulty || 'intermediate'] || DIFFICULTY_STYLE['intermediate'];
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
                        {exam.questions || 40} câu · {exam.duration_minutes || 30} phút
                      </span>
                    </div>
                    <h3 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '24px' }}>
                      {exam.title}
                    </h3>
                    <p className="fw-medium mb-3" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', color: '#5e5e5e' }}>
                      Cập nhật: {exam.createdAt}
                    </p>
                    <p className="text-muted mb-4" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', lineHeight: '1.6' }}>
                      {exam.description || 'Đề thi trắc nghiệm nghe IELTS chuẩn 4 phần.'}
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

export default ListeningPage;
