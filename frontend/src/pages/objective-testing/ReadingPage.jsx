import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StudentNavbar from '../../components/layout/StudentNavbar';
import ModeSelector from '../../components/objective-testing/ModeSelector';
import { testService } from '../../services/test.service';
import { attemptService } from '../../services/attempt.service';

/**
 * ReadingPage.jsx — /reading
 * Level 1: Danh sách đề Reading lấy từ API (skill=reading)
 * Level 2: Passages của đề đó (3 passages chuẩn IELTS Academic)
 * Level 3: Redirect vào ReadingTestPage (/tests/:id/reading)
 *
 * DESIGN: Uber-inspired — black/white duet, pill shapes, UberMove/UberMoveText fonts.
 */

const DIFFICULTY_STYLE = {
  'easy':         { bg: '#efefef', color: '#5e5e5e', label: 'Dễ' },
  'intermediate': { bg: '#000',    color: '#fff',     label: 'Trung bình' },
  'advanced':     { bg: '#282828', color: '#afafaf',  label: 'Khó' },
  'Dễ':           { bg: '#efefef', color: '#5e5e5e',  label: 'Dễ' },
  'Trung bình':   { bg: '#000',    color: '#fff',     label: 'Trung bình' },
  'Khó':          { bg: '#282828', color: '#afafaf',  label: 'Khó' },
};

/** Map passage blocks to a display-friendly format */
function mapPassageToDisplay(passage, idx) {
  const questionCount = (passage.blocks || []).reduce(
    (sum, b) => sum + (b.questions?.length || 0), 0
  );

  // Map question_type values (stored in question_blocks.question_type) to labels
  const typeLabels = {
    multiple_choice:      'Multiple Choice',
    true_false:           'True/False/NG',
    fill_blank:           'Fill in the Blank',
    sentence_completion:  'Sentence Completion',
    matching_headings:    'Matching Headings',
    matching_information: 'Matching',
    short_answer:         'Short Answer',
  };
  const distinctTypes = [
    ...new Set((passage.blocks || []).map((b) => typeLabels[b.type] || b.type).filter(Boolean)),
  ].join(' · ');

  return {
    label: `Passage ${passage.passageNumber || idx + 1}`,
    title: passage.title || `Passage ${idx + 1}`,
    questions: questionCount,
    type: distinctTypes,
  };
}


// ─── Skeleton Card ─────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="col-md-6">
    <div className="p-4 rounded-4 h-100" style={{ border: '1px solid #e2e2e2' }}>
      <div style={{ height: 24, width: 80, backgroundColor: '#efefef', borderRadius: 999, marginBottom: 16 }} />
      <div style={{ height: 28, width: '60%', backgroundColor: '#efefef', borderRadius: 8, marginBottom: 10 }} />
      <div style={{ height: 16, width: '40%', backgroundColor: '#f5f5f5', borderRadius: 8, marginBottom: 8 }} />
      <div style={{ height: 14, width: '80%', backgroundColor: '#f5f5f5', borderRadius: 8, marginBottom: 6 }} />
      <div style={{ height: 14, width: '65%', backgroundColor: '#f5f5f5', borderRadius: 8, marginBottom: 24 }} />
      <div style={{ height: 40, width: 120, backgroundColor: '#000', borderRadius: 999 }} />
    </div>
  </div>
);

// ─── Level 2: Passages của một đề ──────────────────────────────────────────────
const PassageList = ({ exam, onBack }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [showModeModal, setShowModeModal] = useState(false);

  const handleStartTest = (modeConfig) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { message: 'Vui lòng đăng nhập để bắt đầu làm bài thi' } });
      return;
    }
    setShowModeModal(false);
    navigate(`/tests/${exam.id}/reading`, {
      state: {
        practiceMode: modeConfig.isPractice,
        selectedPartIds: modeConfig.selectedPartIds,
        customTimeLimit: modeConfig.customTimeLimit,
      },
    });
  };

  const partsForMode = exam.displayPassages.map((p, idx) => ({
    id: `p${idx + 1}`,
    label: p.label,
  }));

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
            {exam.skill?.toUpperCase()} · {exam.difficulty}
          </p>
          <h1 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '40px' }}>
            {exam.title}
          </h1>
          <p className="text-muted mb-0" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px' }}>
            {exam.displayPassages.length} passages · {exam.questions} câu hỏi · {exam.duration || 60} phút
          </p>
        </div>

        {/* Passages */}
        <div className="d-flex flex-column gap-3 mb-5">
          {exam.displayPassages.map((p, idx) => (
            <div
              key={idx}
              className="rounded-4 overflow-hidden"
              style={{ border: '1px solid #e2e2e2', backgroundColor: '#fff', transition: 'box-shadow 0.15s ease' }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'rgba(0,0,0,0.12) 0px 4px 16px')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div className="d-flex align-items-center justify-content-between p-4 gap-4 flex-wrap">
                <div className="d-flex align-items-center gap-4">
                  <div
                    className="d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                    style={{ width: '56px', height: '56px', borderRadius: '999px', backgroundColor: '#000', color: '#fff', fontSize: '18px', fontFamily: 'UberMove, system-ui, sans-serif' }}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <p className="mb-1 fw-bold" style={{ fontSize: '13px', fontFamily: 'UberMoveText, system-ui, sans-serif', color: '#5e5e5e', textTransform: 'uppercase' }}>
                      {p.label}
                    </p>
                    <h4 className="fw-bold mb-1" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '20px', color: '#000' }}>
                      {p.title}
                    </h4>
                    <p className="mb-0" style={{ fontSize: '14px', color: '#5e5e5e', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                      {p.questions > 0 ? `${p.questions} câu` : ''}{p.type ? ` · ${p.type}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Start Full Test CTA */}
        <div className="p-5 rounded-4 text-center" style={{ backgroundColor: '#000' }}>
          <h3 className="fw-bold mb-2" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '32px', color: '#fff' }}>
            Sẵn sàng chưa?
          </h3>
          <p className="mb-4" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px', color: '#afafaf' }}>
            Làm toàn bộ đề trong {exam.duration || 60} phút. Kết quả sẽ được chấm tự động ngay sau khi nộp.
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
          examType="Reading"
          parts={partsForMode}
          fullDuration={exam.duration || 60}
        />
      </main>
    </div>
  );
};

// ─── Level 1: Danh sách đề thi ─────────────────────────────────────────────────
const ReadingPage = () => {
  const [selectedExam, setSelectedExam] = useState(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [exams, setExams] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [attemptStats, setAttemptStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [testRes, attemptRes] = await Promise.all([
          testService.getTests({ skill: 'reading', isPublished: true }),
          isAuthenticated ? attemptService.getAttemptHistory('reading') : Promise.resolve({ data: [] })
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
    try {
      const res = await testService.getTestById(exam.id);
      if (res.success && res.data) {
        const fullExam = res.data;
        const displayPassages = (fullExam.passages || []).map((p, idx) =>
          mapPassageToDisplay(p, idx)
        );
        setSelectedExam({
          ...exam,
          displayPassages,
          passages: fullExam.passages,
        });
      }
    } catch {
      setError('Không thể tải chi tiết đề thi.');
    }
  };

  if (selectedExam) {
    return <PassageList exam={selectedExam} onBack={() => setSelectedExam(null)} />;
  }

  return (
    <div className="bg-white min-vh-100 pb-5">
      <StudentNavbar />
      <main className="container-fluid px-3 px-md-5 mt-4 mt-md-5" style={{ maxWidth: '1200px' }}>

        {/* Hero Section */}
        <div className="mb-5 d-flex align-items-center gap-4 bg-white p-4 rounded-4" style={{ border: '1px solid #e2e2e2' }}>
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
                .hero-illustration-container:hover .hero-book-page {
                  animation: flip-page 1.5s ease-in-out infinite alternate;
                }
                .hero-illustration-container:hover .hero-glasses {
                  animation: float-glasses 2s ease-in-out infinite alternate;
                }
                @keyframes float-glasses {
                  0% { transform: translateY(0) scale(1); }
                  100% { transform: translateY(-8px) scale(1.05); }
                }
                @keyframes flip-page {
                  0% { transform: skewY(0); }
                  100% { transform: skewY(-5deg); }
                }
              `}
            </style>
            <svg className="hero-svg w-100 h-100" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="120" height="120" rx="24" fill="#f8f9fa"/>
              {/* Open Book */}
              <path d="M20 75 Q60 65 60 85 L60 45 Q60 25 20 35 Z" fill="#e9ecef" stroke="#adb5bd" strokeWidth="2" strokeLinejoin="round"/>
              <path className="hero-book-page" d="M60 85 Q60 65 100 75 L100 35 Q60 25 60 45 Z" fill="#fff" stroke="#adb5bd" strokeWidth="2" strokeLinejoin="round" style={{ transformOrigin: '60px 85px' }}/>
              <path d="M60 45 L60 85" stroke="#adb5bd" strokeWidth="3" strokeLinecap="round"/>
              {/* Text lines */}
              <path d="M28 48 L52 45 M28 55 L52 52 M28 62 L52 59" stroke="#ced4da" strokeWidth="2" strokeLinecap="round"/>
              <path className="hero-book-page" d="M68 45 L92 48 M68 52 L92 55 M68 59 L92 62" stroke="#e9ecef" strokeWidth="2" strokeLinecap="round" style={{ transformOrigin: '60px 85px' }}/>
              {/* Glasses */}
              <g className="hero-glasses">
                <circle cx="45" cy="65" r="12" fill="#fff" fillOpacity="0.8" stroke="#343a40" strokeWidth="3"/>
                <circle cx="75" cy="65" r="12" fill="#fff" fillOpacity="0.8" stroke="#343a40" strokeWidth="3"/>
                <path d="M57 65 Q60 60 63 65" stroke="#343a40" strokeWidth="3" fill="none"/>
                <path d="M33 65 L25 55" stroke="#343a40" strokeWidth="3" strokeLinecap="round"/>
                <path d="M87 65 L95 55" stroke="#343a40" strokeWidth="3" strokeLinecap="round"/>
              </g>
            </svg>
          </div>
          <div>
            <h1 className="fw-bold mb-2 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '52px' }}>
              Reading
            </h1>
            <p className="text-muted mb-0" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px', maxWidth: '600px' }}>
              Chọn đề thi để luyện đọc. 40 câu hỏi · 60 phút. Nâng cao kỹ năng với hệ thống chấm tự động ngay lập tức.
            </p>
          </div>
        </div>

        {/* Main Content Layout: Sidebar + Grid */}
        <div className="row">
          {/* Sidebar Filter */}
          <div className="col-lg-3 mb-4">
            <div className="p-4 rounded-4 bg-white" style={{ border: '1px solid #e2e2e2', position: 'sticky', top: '20px' }}>
              <h5 className="fw-bold mb-4" style={{ fontFamily: 'UberMove, system-ui, sans-serif' }}>Lọc đề thi</h5>
              
              <div className="mb-4">
                <label className="form-label fw-medium text-muted mb-2" style={{ fontSize: '14px' }}>TÌM KIẾM</label>
                <input
                  type="text"
                  className="form-control rounded-pill px-3 py-2"
                  placeholder="Nhập tên đề thi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ fontSize: '14px', border: '1px solid #d1d1d1' }}
                />
              </div>

              <div className="mb-4">
                <label className="form-label fw-medium text-muted mb-2" style={{ fontSize: '14px' }}>ĐỘ KHÓ</label>
                <select 
                  className="form-select rounded-pill px-3 py-2"
                  value={difficultyFilter} 
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  style={{ fontSize: '14px', border: '1px solid #d1d1d1' }}
                >
                  <option value="">Tất cả độ khó</option>
                  <option value="beginner">Dễ (Beginner)</option>
                  <option value="intermediate">Trung bình (Intermediate)</option>
                  <option value="advanced">Khó (Advanced)</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label fw-medium text-muted mb-2" style={{ fontSize: '14px' }}>TRẠNG THÁI</label>
                <select 
                  className="form-select rounded-pill px-3 py-2"
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ fontSize: '14px', border: '1px solid #d1d1d1' }}
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
            ) : exams.filter(exam => {
                const matchSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase());
                const matchDiff = difficultyFilter === '' || exam.difficulty === difficultyFilter;
                const isCompleted = attemptStats[exam.id] !== undefined;
                const matchStatus = statusFilter === 'all' || 
                                    (statusFilter === 'completed' && isCompleted) || 
                                    (statusFilter === 'incomplete' && !isCompleted);
                return matchSearch && matchDiff && matchStatus;
              }).length === 0 ? (
              <div className="text-center py-5 text-muted bg-white rounded-4 border">Không tìm thấy bài thi phù hợp với bộ lọc hiện tại.</div>
            ) : (
              <div className="row g-4">
                {exams.filter(exam => {
                  const matchSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchDiff = difficultyFilter === '' || exam.difficulty === difficultyFilter;
                  const isCompleted = attemptStats[exam.id] !== undefined;
                  const matchStatus = statusFilter === 'all' || 
                                      (statusFilter === 'completed' && isCompleted) || 
                                      (statusFilter === 'incomplete' && !isCompleted);
                  return matchSearch && matchDiff && matchStatus;
                }).map((exam) => {
                  const diff = DIFFICULTY_STYLE[exam.difficulty || 'intermediate'] || DIFFICULTY_STYLE['intermediate'];
                  const bestBandScore = attemptStats[exam.id];
                  const isCompleted = bestBandScore !== undefined;

                  return (
                  <div key={exam.id} className="col-md-6">
                    <div
                      className="p-3 rounded-4 h-100 d-flex flex-column justify-content-between position-relative overflow-hidden"
                      style={{ 
                        border: isCompleted ? '2px solid #86efac' : '1px solid #e2e2e2', 
                        backgroundColor: isCompleted ? '#f0fdf4' : '#fff',
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
                              {exam.difficulty}
                            </span>
                            {isCompleted && (
                              <span className="rounded-pill px-2 py-1 fw-bold d-inline-flex align-items-center gap-1" style={{ backgroundColor: '#dcfce7', color: '#166534', fontSize: '12px' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Band {bestBandScore.toFixed(1)}
                              </span>
                            )}
                            {exam.participantCount > 0 && (
                              <span className="rounded-pill px-2 py-1 fw-medium" style={{ backgroundColor: '#fff3cd', color: '#856404', fontSize: '12px' }}>
                                🔥 Trending
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
                            {exam.duration_minutes || 60} phút
                          </span>
                          <span className="text-muted fw-medium d-flex align-items-center gap-1" style={{ fontSize: '13px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            {exam.participantCount || 0} lượt thi
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-2 pt-2 border-top position-relative d-flex justify-content-between align-items-center">
                        <span className="text-muted" style={{ fontSize: '12px' }}>
                          Cập nhật: {new Date(exam.created_at || Date.now()).toLocaleDateString('vi-VN')}
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
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReadingPage;
