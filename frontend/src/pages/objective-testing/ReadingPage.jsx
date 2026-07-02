import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StudentNavbar from '../../components/layout/StudentNavbar';
import ModeSelector from '../../components/objective-testing/ModeSelector';
import { testService } from '../../services/test.service';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        setLoading(true);
        const res = await testService.getTests({ skill: 'reading', isPublished: true });
        if (res.success && Array.isArray(res.data)) {
          setExams(res.data);
        } else {
          setError('Không thể tải danh sách đề thi.');
        }
      } catch (err) {
        setError('Lỗi kết nối đến server.');
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

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

        {/* Hero */}
        <div className="mb-5">
          <h1 className="fw-bold mb-2 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '52px' }}>
            Reading
          </h1>
          <p className="text-muted" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '20px' }}>
            Chọn đề thi để luyện đọc. 40 câu hỏi · 60 phút · Chấm tự động ngay lập tức.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="alert rounded-4" style={{ backgroundColor: '#fdf2f2', color: '#c0392b', border: 'none', marginBottom: 32 }}>
            {error}
          </div>
        )}

        {/* Exam Cards */}
        <div className="row g-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : exams.length === 0 ? (
            <div className="col-12 text-center py-5">
              <p style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px', color: '#5e5e5e' }}>
                Chưa có đề Reading nào. Vui lòng quay lại sau.
              </p>
            </div>
          ) : (
            exams.map((exam) => {
              const diffInfo = DIFFICULTY_STYLE[exam.difficulty] || DIFFICULTY_STYLE['intermediate'];
              return (
                <div key={exam.id} className="col-md-6">
                  <div
                    className="p-4 rounded-4 h-100 d-flex flex-column justify-content-between"
                    style={{ border: '1px solid #e2e2e2', cursor: 'pointer', transition: 'box-shadow 0.2s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'rgba(0,0,0,0.12) 0px 4px 16px 0px')}
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
                    onClick={() => handleViewExam(exam)}
                  >
                    <div>
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <span
                          className="rounded-pill px-3 py-1 fw-medium"
                          style={{ backgroundColor: diffInfo.bg, color: diffInfo.color, fontSize: '13px', fontFamily: 'UberMoveText, system-ui, sans-serif' }}
                        >
                          {diffInfo.label}
                        </span>
                        <span className="text-muted fw-medium" style={{ fontSize: '13px' }}>
                          {exam.questions} câu · {exam.duration || 60} phút
                        </span>
                      </div>
                      <h3 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '24px' }}>
                        {exam.title}
                      </h3>
                      {exam.description && (
                        <p className="text-muted mb-4" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', lineHeight: '1.6' }}>
                          {exam.description}
                        </p>
                      )}
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
            })
          )}
        </div>
      </main>
    </div>
  );
};

export default ReadingPage;
