import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StudentNavbar from '../../components/layout/StudentNavbar';
import ModeSelector from '../../components/objective-testing/ModeSelector';
import Pagination from '../../components/common/Pagination';
import api from '../../services/api';
import { testService } from '../../services/test.service';
import { attemptService } from '../../services/attempt.service';

const DIFFICULTY_STYLE = {
  'Dễ':           { bg: '#efefef', color: '#5e5e5e', label: 'Beginner' },
  'Trung bình':   { bg: '#000', color: '#fff', label: 'Intermediate' },
  'Khó':          { bg: '#282828', color: '#afafaf', label: 'Advanced' },
  'easy':         { bg: '#efefef', color: '#5e5e5e', label: 'Beginner' },
  'intermediate': { bg: '#000', color: '#fff', label: 'Intermediate' },
  'advanced':     { bg: '#282828', color: '#afafaf', label: 'Advanced' },
  'beginner':     { bg: '#efefef', color: '#5e5e5e', label: 'Beginner' }
};

const getDiffEnum = (diff) => {
  if (!diff) return 'intermediate';
  const d = diff.toLowerCase();
  if (['dễ', 'easy', 'beginner'].includes(d)) return 'beginner';
  if (['khó', 'advanced'].includes(d)) return 'advanced';
  return 'intermediate';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;
  const [attemptStats, setAttemptStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, difficultyFilter, statusFilter]);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [testRes, attemptRes] = await Promise.all([
          testService.getTests({ skill: 'writing', isPublished: true }),
          isAuthenticated ? attemptService.getAttemptHistory('writing') : Promise.resolve({ data: [] })
        ]);
        
        if (mounted && testRes.success && Array.isArray(testRes.data)) {
          setExams(testRes.data);
        } else if (mounted) {
          setError('Không thể tải danh sách đề thi.');
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
        if (mounted) setError('Lỗi kết nối máy chủ');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, [isAuthenticated]);

  const handleViewExam = async (exam) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { message: 'Vui lòng đăng nhập để xem chi tiết đề thi' } });
      return;
    }
    
    setError(null);
    try {
      setLoading(true);
      const res = await testService.getTestById(exam.id);
      if (res.success && res.data) {
        const fullExam = res.data;
        const tasks = (fullExam.passages || []).map(p => {
          let instructionData = {};
          try {
            if (p.instruction) instructionData = JSON.parse(p.instruction);
          } catch (e) {
            // ignore
          }
          return {
            id: p.id,
            task_number: p.passageNumber,
            title: p.title || `Task ${p.passageNumber}`,
            prompt_text: p.content,
            duration: instructionData.duration || (p.passageNumber === 1 ? '20 phút' : '40 phút'),
            min_words: instructionData.min_words || (p.passageNumber === 1 ? 150 : 250),
            illustration: instructionData.imageUrl || null,
            hint: instructionData.hint || null
          };
        });
        setSelectedExam({ ...exam, ...fullExam, tasks });
      } else {
        setError(res.error?.message || 'Không thể tải chi tiết đề thi.');
      }
    } catch (err) {
      setError('Lỗi kết nối khi tải chi tiết đề thi.');
    } finally {
      setLoading(false);
    }
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
                  transform: scale(1.05) translateY(-5px) rotateY(-10deg);
                  filter: drop-shadow(0 10px 15px rgba(0,0,0,0.1));
                }
                .hero-svg {
                  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .hero-illustration-container:hover .hero-paper {
                  animation: bob-paper 2s ease-in-out infinite alternate;
                }
                .hero-illustration-container:hover .hero-pen {
                  animation: wiggle-pen 1.5s ease-in-out infinite alternate;
                }
                @keyframes bob-paper {
                  0% { transform: translateY(0) rotate(-2deg); }
                  100% { transform: translateY(-5px) rotate(0deg); }
                }
                @keyframes wiggle-pen {
                  0% { transform: rotate(-15deg) translateX(0); }
                  25% { transform: rotate(-5deg) translateX(5px); }
                  50% { transform: rotate(-20deg) translateX(2px); }
                  75% { transform: rotate(-10deg) translateX(6px); }
                  100% { transform: rotate(-15deg) translateX(0); }
                }
              `}
            </style>
            <svg className="hero-svg w-100 h-100" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="120" height="120" rx="24" fill="#f8f9fa"/>
              {/* Paper */}
              <g className="hero-paper" style={{ transformOrigin: 'center' }}>
                <rect x="35" y="25" width="50" height="70" fill="#fff" stroke="#adb5bd" strokeWidth="2" rx="4" transform="rotate(-5 60 60)"/>
                <line x1="45" y1="40" x2="75" y2="40" stroke="#dee2e6" strokeWidth="2" strokeLinecap="round" transform="rotate(-5 60 60)"/>
                <line x1="45" y1="55" x2="75" y2="55" stroke="#dee2e6" strokeWidth="2" strokeLinecap="round" transform="rotate(-5 60 60)"/>
                <line x1="45" y1="70" x2="65" y2="70" stroke="#dee2e6" strokeWidth="2" strokeLinecap="round" transform="rotate(-5 60 60)"/>
              </g>
              {/* Pen */}
              <g className="hero-pen" style={{ transformOrigin: '75px 55px' }}>
                <path d="M75 55 L85 25 L90 27 L80 57 Z" fill="#343a40" stroke="#212529" strokeWidth="2" strokeLinejoin="round"/>
                <polygon points="75,55 80,57 73,63" fill="#e9ecef" stroke="#212529" strokeWidth="2"/>
                <polygon points="73,63 75,60 74,60" fill="#212529"/>
              </g>
            </svg>
          </div>
          <div>
            <h1 className="fw-bold mb-2 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '52px' }}>
              Writing
            </h1>
            <p className="text-muted mb-0" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px', maxWidth: '600px' }}>
              Chọn đề thi để luyện viết. Hoàn thành Task 1 và Task 2 để nhận nhận xét và điểm số từ hệ thống tự động.
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
            {error && (
              <div className="alert rounded-4 mb-4" style={{ backgroundColor: '#fdf2f2', color: '#c0392b', border: 'none' }}>
                {error}
              </div>
            )}
            
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-dark" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (() => {
              const filteredExams = exams.filter(exam => {
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
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                {exam.tasks ? exam.tasks.length : 0} Tasks
                              </span>
                              <span className="text-muted fw-medium d-flex align-items-center gap-1" style={{ fontSize: '13px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                {exam.duration_minutes || exam.duration || 60} phút
                              </span>
                              <span className="text-muted fw-medium d-flex align-items-center gap-1" style={{ fontSize: '13px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                {exam.participantCount || 0} lượt thi
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-2 pt-2 border-top position-relative d-flex justify-content-between align-items-center">
                            <span className="text-muted" style={{ fontSize: '12px' }}>
                              Cập nhật: {new Date(exam.created_at || exam.createdAt || Date.now()).toLocaleDateString('vi-VN')}
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

export default WritingPage;
