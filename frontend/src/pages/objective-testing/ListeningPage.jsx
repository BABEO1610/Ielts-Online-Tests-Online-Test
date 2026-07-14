import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StudentNavbar from '../../components/layout/StudentNavbar';
import ModeSelector from '../../components/objective-testing/ModeSelector';
import Pagination from '../../components/common/Pagination';
import { testService } from '../../services/test.service';
import { attemptService } from '../../services/attempt.service';

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
  'beginner':        { bg: '#efefef', color: '#5e5e5e', label: 'Beginner' },
  'intermediate':    { bg: '#000',    color: '#fff', label: 'Intermediate' },
  'advanced':        { bg: '#282828', color: '#afafaf', label: 'Advanced' },
  'easy':            { bg: '#efefef', color: '#5e5e5e', label: 'Beginner' },
  'Dễ':              { bg: '#efefef', color: '#5e5e5e', label: 'Beginner' },
  'Trung bình':      { bg: '#000',    color: '#fff', label: 'Intermediate' },
  'Khó':             { bg: '#282828', color: '#afafaf', label: 'Advanced' }
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
  <div className=" min-vh-100 pb-5">
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
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;
  const [attemptStats, setAttemptStats] = useState({});

  React.useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [testRes, attemptRes] = await Promise.all([
          testService.getTests({ skill: 'listening', isPublished: 'true' }),
          isAuthenticated ? attemptService.getAttemptHistory('listening') : Promise.resolve({ data: [] })
        ]);

        if (mounted && testRes && testRes.data) {
          setTests(testRes.data);
        }

        if (mounted && attemptRes && attemptRes.success && attemptRes.data) {
          const stats = {};
          attemptRes.data.forEach(attempt => {
            if (attempt.testId) {
              const currentMax = stats[attempt.testId] !== undefined ? stats[attempt.testId] : -1;
              if (attempt.bandScore >= currentMax) {
                stats[attempt.testId] = attempt.bandScore;
              }
            }
          });
          setAttemptStats(stats);
        }
      } catch (err) {
        console.error('Failed to load listening data', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, [isAuthenticated]);

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
    <div className=" min-vh-100 pb-5">
      <StudentNavbar />
      <main className="container-fluid px-3 px-md-5 mt-4 mt-md-5" style={{ maxWidth: '1200px' }}>

        {/* Hero Section */}
        <div className="mb-5 d-flex align-items-center gap-4 bg-white p-4 rounded-4 border">
          <div 
            className="hero-illustration-container d-none d-md-flex" 
            style={{ 
              width: '120px', 
              height: '120px', 
              perspective: '1000px',
              cursor: 'pointer' 
            }}
          >
            <style>
              {`
                .hero-illustration-container:hover .hero-svg {
                  transform: scale(1.05) translateY(-5px) rotateY(10deg);
                  filter: drop-shadow(0 10px 15px rgba(0,0,0,0.1));
                }
                .hero-svg {
                  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .hero-illustration-container:hover .hero-note-1 {
                  animation: float-up 1s ease-out infinite alternate;
                }
                .hero-illustration-container:hover .hero-note-2 {
                  animation: float-up 1.2s ease-out infinite alternate-reverse;
                }
                @keyframes float-up {
                  0% { transform: translateY(0) scale(1); opacity: 0.8; }
                  100% { transform: translateY(-10px) scale(1.1); opacity: 1; }
                }
              `}
            </style>
            <svg className="hero-svg w-100 h-100" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="120" height="120" rx="24" fill="#f8f9fa"/>
              {/* Stack of books */}
              <path d="M25 85h70v10H25z" fill="#e9ecef" rx="2"/>
              <path d="M28 77h64v8H28z" fill="#dee2e6" rx="2"/>
              <path d="M32 69h56v8H32z" fill="#ced4da" rx="2"/>
              {/* Headphones */}
              <path d="M35 55c0-13.8 11.2-25 25-25s25 11.2 25 25v15" stroke="#212529" strokeWidth="6" strokeLinecap="round"/>
              <rect x="25" y="50" width="20" height="30" rx="8" fill="#343a40"/>
              <rect x="75" y="50" width="20" height="30" rx="8" fill="#343a40"/>
              <rect x="20" y="55" width="10" height="20" rx="4" fill="#495057"/>
              <rect x="90" y="55" width="10" height="20" rx="4" fill="#495057"/>
              {/* Music notes */}
              <path className="hero-note-1" d="M85 30v-10h10v3" stroke="#adb5bd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle className="hero-note-1" cx="83" cy="30" r="3" fill="#adb5bd"/>
              <path className="hero-note-2" d="M35 25v-8h8v2" stroke="#adb5bd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle className="hero-note-2" cx="33" cy="25" r="2.5" fill="#adb5bd"/>
            </svg>
          </div>
          <div>
            <h1 className="fw-bold mb-2 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '52px' }}>
              Listening
            </h1>
            <p className="text-muted mb-0" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px', maxWidth: '600px' }}>
              Chọn đề thi để luyện nghe. 40 câu hỏi · 30 phút. Nâng cao kỹ năng với hệ thống chấm tự động ngay lập tức.
            </p>
          </div>
        </div>

        {/* Main Content Layout: Sidebar + Grid */}
        <div className="row">
          {/* Sidebar Filter */}
          <div className="col-lg-3 mb-4">
            <div className="p-4 rounded-4 bg-white border"
              style={{ position: 'sticky', top: '20px' }}>
              <h5 className="fw-bold mb-4" style={{ fontFamily: 'UberMove, system-ui, sans-serif' }}>Lọc đề thi</h5>
              
              <div className="mb-4">
                <label className="form-label fw-medium text-muted mb-2" style={{ fontSize: '14px' }}>TÌM KIẾM</label>
                <input
                  type="text"
                  className="form-control rounded-pill px-3 py-2"
                  placeholder="Nhập tên đề thi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ fontSize: '14px' }}
                />
              </div>

              <div className="mb-4">
                <label className="form-label fw-medium text-muted mb-2" style={{ fontSize: '14px' }}>ĐỘ KHÓ</label>
                <select 
                  className="form-select rounded-pill px-3 py-2"
                  value={difficultyFilter} 
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  style={{ fontSize: '14px' }}
                >
                  <option value="">Tất cả độ khó</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label fw-medium text-muted mb-2" style={{ fontSize: '14px' }}>TRẠNG THÁI</label>
                <select 
                  className="form-select rounded-pill px-3 py-2"
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ fontSize: '14px' }}
                >
                  <option value="all">Tất cả</option>
                  <option value="completed">Đã làm</option>
                  <option value="incomplete">Chưa làm</option>
                </select>
              </div>
            </div>
          </div>

          {/* Exam Grid */}
          <div className="col-lg-9">
            {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-dark" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
            ) : (() => {
              const getDiffEnum = (diff) => {
                if (!diff) return 'intermediate';
                const d = diff.toLowerCase();
                if (['dễ', 'easy', 'beginner'].includes(d)) return 'beginner';
                if (['khó', 'advanced'].includes(d)) return 'advanced';
                return 'intermediate';
              };

              const filteredExams = tests.filter(exam => {
                const matchSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase());
                const examDiffEnum = getDiffEnum(exam.difficulty);
                const matchDiff = difficultyFilter === '' || examDiffEnum === difficultyFilter;
                const isCompleted = attemptStats[exam.id] !== undefined;
                const matchStatus = statusFilter === 'all' || 
                                    (statusFilter === 'completed' && isCompleted) || 
                                    (statusFilter === 'incomplete' && !isCompleted);
                return matchSearch && matchDiff && matchStatus;
              });

              const totalPages = Math.ceil(filteredExams.length / ITEMS_PER_PAGE);
              const paginatedExams = filteredExams.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

              if (filteredExams.length === 0) {
                return <div className="text-center py-5 text-muted bg-white rounded-4 border">Không tìm thấy bài thi phù hợp với bộ lọc hiện tại.</div>;
              }

              return (
                <>
                  <div className="row g-4">
                    {paginatedExams.map((exam) => {
                      const diff = DIFFICULTY_STYLE[exam.difficulty || 'intermediate'] || DIFFICULTY_STYLE['intermediate'];
                      const bestBandScore = attemptStats[exam.id];
                      const isCompleted = bestBandScore !== undefined;

                      return (
                      <div key={exam.id} className="col-md-6">
                        <div
                          className="card border-0 bg-white shadow-sm p-3 rounded-4 h-100 d-flex flex-column justify-content-between position-relative overflow-hidden"
                          style={{ 
                            ...(isCompleted ? { border: '2px solid #86efac', backgroundColor: 'var(--canvas-soft)' } : {}),
                            cursor: 'pointer', 
                            transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)' 
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.boxShadow = 'rgba(0,0,0,0.1) 0px 10px 25px -5px, rgba(0,0,0,0.04) 0px 10px 10px -5px';
                            e.currentTarget.style.transform = 'translateY(-4px)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.transform = 'none';
                          }}
                          onClick={() => handleViewExam(exam)}
                        >
                          {/* Optional subtle background pattern */}
                          <div style={{ position: 'absolute', top: '-10%', right: '-10%', opacity: 0.03, pointerEvents: 'none' }}>
                            <svg width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#000" /></svg>
                          </div>

                          <div className="position-relative">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div className="d-flex gap-2 align-items-center flex-wrap">
                                <span
                                  className="rounded-pill px-2 py-1 fw-medium"
                                  style={{ backgroundColor: diff.bg, color: diff.color, fontSize: '12px', fontFamily: 'UberMoveText, system-ui, sans-serif' }}
                                >
                                  {diff.label || exam.difficulty}
                                </span>
                                {isCompleted && (
                                  <span className="rounded-pill px-2 py-1 fw-bold d-inline-flex align-items-center gap-1" style={{ backgroundColor: '#dcfce7', color: '#166534', fontSize: '12px' }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    Band {bestBandScore.toFixed(1)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <h3 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '18px', lineHeight: '1.3' }}>
                              {exam.title}
                            </h3>

                            <div className="d-flex flex-wrap gap-3 mb-2 mt-2">
                              <span className="text-muted fw-medium d-flex align-items-center gap-1" style={{ fontSize: '13px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                {exam.duration_minutes || 30} phút
                              </span>
                              <span className="text-muted fw-medium d-flex align-items-center gap-1" style={{ fontSize: '13px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                {exam.participantCount || 0} lượt thi
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-2 pt-2 border-top position-relative d-flex justify-content-between align-items-center">
                            <span className="text-muted" style={{ fontSize: '12px' }}>
                              Cập nhật: {new Date(exam.created_at).toLocaleDateString('vi-VN')}
                            </span>
                            <button
                              className={`btn rounded-pill px-3 py-1 fw-medium ${isCompleted ? 'btn-outline-success' : 'btn-dark'}`}
                              style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '13px' }}
                              onClick={(e) => { e.stopPropagation(); handleViewExam(exam); }}
                            >
                              {isCompleted ? 'Làm lại →' : 'Vào thi →'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </>
              );
            })()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ListeningPage;
