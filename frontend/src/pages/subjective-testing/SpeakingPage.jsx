import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StudentNavbar from '../../components/layout/StudentNavbar';
import ModeSelector from '../../components/objective-testing/ModeSelector';
import Pagination from '../../components/common/Pagination';
import { testService } from '../../services/test.service';
import { attemptService } from '../../services/attempt.service';

const DIFFICULTY_STYLE = {
  'Dễ': { bg: '#efefef', color: '#5e5e5e', label: 'Beginner' },
  'Trung bình': { bg: '#000', color: '#fff', label: 'Intermediate' },
  'Khó': { bg: '#282828', color: '#afafaf', label: 'Advanced' },
  'easy': { bg: '#efefef', color: '#5e5e5e', label: 'Beginner' },
  'intermediate': { bg: '#000', color: '#fff', label: 'Intermediate' },
  'advanced': { bg: '#282828', color: '#afafaf', label: 'Advanced' },
  'beginner': { bg: '#efefef', color: '#5e5e5e', label: 'Beginner' }
};

const DIFFICULTY_LABEL = {
  'Dễ': 'Beginner',
  'Trung bình': 'Intermediate',
  'Khó': 'Advanced',
  'easy': 'Beginner',
  'intermediate': 'Intermediate',
  'advanced': 'Advanced',
  'beginner': 'Beginner'
};

const getDiffEnum = (diff) => {
  if (!diff) return 'intermediate';
  const d = diff.toLowerCase();
  if (['dễ', 'easy', 'beginner'].includes(d)) return 'beginner';
  if (['khó', 'advanced'].includes(d)) return 'advanced';
  return 'intermediate';
};

const formatDuration = (exam) => exam.duration || exam.duration_minutes || '–';

const parseSpeakingQuestions = (content) => {
  if (!content) return [];
  if (Array.isArray(content)) {
    return content.map((item, idx) => (
      typeof item === 'string' ? { id: `q${idx + 1}`, text: item } : item
    ));
  }
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((text, idx) => ({ id: `q${idx + 1}`, text }));
};

const buildSpeakingParts = (passages = []) => passages.map((passage, idx) => {
  if (idx === 0) {
    return {
      partName: passage.title || 'Part 1: Introduction and Interview',
      description: passage.instruction || 'Answer questions about yourself and familiar topics.',
      questions: parseSpeakingQuestions(passage.content),
      duration: '4-5 phút'
    };
  }
  if (idx === 1) {
    return {
      partName: passage.title || 'Part 2: Long Turn',
      description: passage.instruction || 'Cue card bullet points',
      prompt: passage.title && passage.title !== 'Speaking Part 2' ? passage.title : passage.content || '',
      bulletPoints: passage.content || '',
      preparationTime: 60,
      speakingTime: 120,
      duration: '3-4 phút'
    };
  }
  if (idx === 2) {
    return {
      partName: passage.title || 'Part 3: Discussion',
      description: passage.instruction || 'Follow-up discussion',
      questions: parseSpeakingQuestions(passage.content),
      duration: '4-5 phút'
    };
  }
  return {
    partName: passage.title || `Part ${idx + 1}`,
    description: passage.instruction || '',
    prompt: passage.content || '',
    questions: parseSpeakingQuestions(passage.content),
    duration: '4-5 phút'
  };
});

const SpeakingPartList = ({ exam, onStartExam, onBack }) => {
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
          <div className="d-flex justify-content-between align-items-center mb-0 mt-4 flex-wrap gap-3">
            <p className="text-muted mb-0" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px' }}>
              Gồm {exam.parts.length} phần · Hoàn thành toàn bộ để nhận điểm chấm
            </p>
            <button className="btn btn-dark rounded-pill px-5 py-3 fw-bold" style={{ fontSize: '16px' }} onClick={handleStartClick}>
              Bắt đầu làm bài thi
            </button>
          </div>
        </div>

        <div className="d-flex flex-column gap-3">
          {exam.parts.map((part, idx) => (
            <div
              key={idx}
              className="d-flex align-items-center justify-content-between p-4 rounded-4 bg-white"
              style={{ border: '1px solid #e2e2e2' }}
            >
              <div className="d-flex align-items-center gap-4">
                <div
                  className="d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                  style={{ width: '56px', height: '56px', borderRadius: '999px', backgroundColor: '#000', color: '#fff', fontSize: '20px', fontFamily: 'UberMove, system-ui, sans-serif' }}
                >
                  {idx + 1}
                </div>
                <div>
                  <h4 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '20px' }}>
                    {part.partName}
                  </h4>
                  <div className="d-flex gap-2 flex-wrap">
                    <span className="text-muted fw-medium" style={{ fontSize: '14px' }}>⏱ {part.duration}</span>
                    <span className="text-muted" style={{ fontSize: '14px' }}>·</span>
                    <span className="text-muted fw-medium" style={{ fontSize: '14px' }}>🗣 {part.description}</span>
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
          examType="Speaking"
          fullDuration={exam.duration}
        />
      </main>
    </div>
  );
};

const SpeakingPage = () => {
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
          testService.getTests({ skill: 'speaking', isPublished: true }),
          isAuthenticated ? attemptService.getAttemptHistory('speaking') : Promise.resolve({ data: [] })
        ]);
        
        if (mounted && testRes.success && Array.isArray(testRes.data)) {
          setExams(testRes.data);
        } else if (mounted) {
          setError(testRes.error?.message || 'Không thể tải danh sách đề thi.');
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
        if (mounted) setError('Lỗi kết nối đến server.');
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
        const parts = buildSpeakingParts(fullExam.passages || []);
        setSelectedExam({
          ...exam,
          ...fullExam,
          parts,
          topic: fullExam.topic || exam.topic || 'Tổng hợp',
          questions: parts.reduce((sum, part) => sum + (part.questions?.length || 0), 0)
        });
      } else {
        setError(res.error?.message || 'Không thể tải chi tiết đề thi.');
      }
    } catch (err) {
      setError('Không thể tải chi tiết đề thi.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = (modeConfig) => {
    navigate(`/tests/${selectedExam.id}/speaking`, { 
      state: { 
        exam: selectedExam, 
        practiceMode: modeConfig.isPractice,
        selectedPartIds: modeConfig.selectedPartIds,
        customTimeLimit: modeConfig.customTimeLimit
      } 
    });
  };

  if (selectedExam) {
    return <SpeakingPartList exam={selectedExam} onStartExam={handleStartExam} onBack={() => setSelectedExam(null)} />;
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
                  transform: scale(1.05) translateY(-5px) rotateY(-10deg);
                  filter: drop-shadow(0 10px 15px rgba(0,0,0,0.1));
                }
                .hero-svg {
                  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .hero-illustration-container:hover .hero-mic {
                  animation: bob-mic 2s ease-in-out infinite alternate;
                }
                .hero-illustration-container:hover .hero-wave-1 {
                  animation: pulse-wave 1s ease-in-out infinite alternate;
                }
                .hero-illustration-container:hover .hero-wave-2 {
                  animation: pulse-wave 1s ease-in-out infinite alternate 0.3s;
                }
                .hero-illustration-container:hover .hero-wave-3 {
                  animation: pulse-wave 1s ease-in-out infinite alternate 0.6s;
                }
                @keyframes bob-mic {
                  0% { transform: translateY(0); }
                  100% { transform: translateY(-6px); }
                }
                @keyframes pulse-wave {
                  0% { transform: scaleY(1); }
                  100% { transform: scaleY(1.5); }
                }
              `}
            </style>
            <svg className="hero-svg w-100 h-100" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="120" height="120" rx="24" fill="#f8f9fa"/>
              {/* Sound waves Left */}
              <rect className="hero-wave-1" x="25" y="55" width="4" height="10" rx="2" fill="#adb5bd" style={{ transformOrigin: 'center' }}/>
              <rect className="hero-wave-2" x="35" y="45" width="4" height="30" rx="2" fill="#ced4da" style={{ transformOrigin: 'center' }}/>
              <rect className="hero-wave-3" x="45" y="50" width="4" height="20" rx="2" fill="#adb5bd" style={{ transformOrigin: 'center' }}/>
              
              {/* Sound waves Right */}
              <rect className="hero-wave-3" x="71" y="50" width="4" height="20" rx="2" fill="#adb5bd" style={{ transformOrigin: 'center' }}/>
              <rect className="hero-wave-2" x="81" y="45" width="4" height="30" rx="2" fill="#ced4da" style={{ transformOrigin: 'center' }}/>
              <rect className="hero-wave-1" x="91" y="55" width="4" height="10" rx="2" fill="#adb5bd" style={{ transformOrigin: 'center' }}/>
              
              {/* Microphone */}
              <g className="hero-mic">
                {/* Stand */}
                <path d="M60 78 L60 95" stroke="#343a40" strokeWidth="4" strokeLinecap="round"/>
                <path d="M48 95 L72 95" stroke="#343a40" strokeWidth="4" strokeLinecap="round"/>
                <path d="M45 55 Q45 78 60 78 Q75 78 75 55" stroke="#343a40" strokeWidth="4" fill="none" strokeLinecap="round"/>
                {/* Mic Body */}
                <rect x="52" y="25" width="16" height="38" rx="8" fill="#343a40"/>
                <rect x="54" y="27" width="12" height="16" rx="6" fill="#e9ecef"/>
                <line x1="54" y1="33" x2="66" y2="33" stroke="#adb5bd" strokeWidth="2"/>
                <line x1="54" y1="38" x2="66" y2="38" stroke="#adb5bd" strokeWidth="2"/>
              </g>
            </svg>
          </div>
          <div>
            <h1 className="fw-bold mb-2 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '52px' }}>
              Speaking
            </h1>
            <p className="text-muted mb-0" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px', maxWidth: '600px' }}>
              Chọn đề thi để luyện nói. Chấm điểm chi tiết độ trôi chảy và phát âm bằng hệ thống AI tiên tiến.
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
                                  {diff.label || DIFFICULTY_LABEL[exam.difficulty] || exam.difficulty}
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
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                                {exam.parts ? exam.parts.length : (exam.questions || 0)} Parts
                              </span>
                              <span className="text-muted fw-medium d-flex align-items-center gap-1" style={{ fontSize: '13px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                {formatDuration(exam)} phút
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

export default SpeakingPage;
