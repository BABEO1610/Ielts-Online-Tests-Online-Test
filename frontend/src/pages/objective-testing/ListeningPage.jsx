import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StudentNavbar from '../../components/layout/StudentNavbar';
import ModeSelector from '../../components/objective-testing/ModeSelector';

/**
 * ListeningPage.jsx — /listening
 * Level 1: Danh sách đề Listening theo tháng
 * Level 2: Sections của đề đó (4 sections chuẩn IELTS Listening)
 * Level 3: Redirect vào ListeningTestPage (/tests/:id/listening)
 *
 * DESIGN: Uber-inspired — black/white duet, pill shapes (rounded.pill = 999px),
 *         cards (rounded.xl = 16px), UberMove/UberMoveText fonts, sentence-case.
 */

const MOCK_EXAMS = [
  {
    id: '2',
    title: 'Đề thi tháng 6/2025',
    date: 'Tháng 6, 2025',
    difficulty: 'Trung bình',
    topic: 'Daily Life & Education',
    sections: [
      { label: 'Section 1', title: 'Conversation about Renting an Apartment', questions: 10, type: 'Multiple choice, Form completion', audio: 'Two speakers — daily life context' },
      { label: 'Section 2', title: 'Campus Orientation Tour', questions: 10, type: 'Map labelling, Multiple choice', audio: 'Monologue — non-academic context' },
      { label: 'Section 3', title: 'Group Discussion on Research Methods', questions: 10, type: 'Multiple choice, Note completion', audio: 'Up to 4 speakers — academic context' },
      { label: 'Section 4', title: 'Lecture on Urban Planning', questions: 10, type: 'Note completion, Summary completion', audio: 'Monologue — academic lecture' },
    ],
    totalQuestions: 40,
    duration: 30,
    description: 'Bốn phần nghe đa dạng từ hội thoại hằng ngày đến bài giảng học thuật.'
  },
  {
    id: '4',
    title: 'Đề thi tháng 5/2025',
    date: 'Tháng 5, 2025',
    difficulty: 'Khó',
    topic: 'Work & Technology',
    sections: [
      { label: 'Section 1', title: 'Booking a Hotel Room', questions: 10, type: 'Form completion, Multiple choice', audio: 'Two speakers — service encounter' },
      { label: 'Section 2', title: 'Radio Programme on Local History', questions: 10, type: 'Multiple choice, Short answer', audio: 'Monologue — public broadcast' },
      { label: 'Section 3', title: 'Seminar on Digital Marketing', questions: 10, type: 'Multiple choice, Note completion', audio: 'Three speakers — academic seminar' },
      { label: 'Section 4', title: 'Lecture on Robotics and Future Employment', questions: 10, type: 'Table completion, Multiple choice', audio: 'Monologue — university lecture' },
    ],
    totalQuestions: 40,
    duration: 30,
    description: 'Đề ở mức độ khó với từ vựng chuyên ngành và tốc độ nói nhanh — phù hợp band 7.5+.'
  },
  {
    id: '6',
    title: 'Đề thi tháng 4/2025',
    date: 'Tháng 4, 2025',
    difficulty: 'Dễ',
    topic: 'Travel & Community',
    sections: [
      { label: 'Section 1', title: 'Enquiry about a Holiday Package', questions: 10, type: 'Form completion, Multiple choice', audio: 'Two speakers — travel agency' },
      { label: 'Section 2', title: 'Community Centre Activities', questions: 10, type: 'Multiple choice, Matching', audio: 'Monologue — community notice' },
      { label: 'Section 3', title: 'Tutoring Session on Essay Writing', questions: 10, type: 'Note completion, Short answer', audio: 'Two speakers — student & tutor' },
      { label: 'Section 4', title: 'Lecture on Migration Patterns of Birds', questions: 10, type: 'Note completion, Multiple choice', audio: 'Monologue — biology lecture' },
    ],
    totalQuestions: 40,
    duration: 30,
    description: 'Đề ở mức căn bản — lý tưởng để làm quen cấu trúc 4 sections và kỹ năng nghe ghi chú.'
  },
  {
    id: 'l4',
    title: 'Đề thi tháng 3/2025',
    date: 'Tháng 3, 2025',
    difficulty: 'Trung bình',
    topic: 'Health & Science',
    sections: [
      { label: 'Section 1', title: 'Registering at a Medical Clinic', questions: 10, type: 'Form completion, Multiple choice', audio: 'Two speakers — healthcare' },
      { label: 'Section 2', title: 'Public Lecture on Food Safety', questions: 10, type: 'Multiple choice, Map labelling', audio: 'Monologue — public information' },
      { label: 'Section 3', title: 'Project Discussion on Climate Change', questions: 10, type: 'Multiple choice, Note completion', audio: 'Three speakers — academic group work' },
      { label: 'Section 4', title: 'Lecture on Epidemiology', questions: 10, type: 'Summary completion, Multiple choice', audio: 'Monologue — science lecture' },
    ],
    totalQuestions: 40,
    duration: 30,
    description: 'Các tình huống nghe về y tế và khoa học với từ vựng chuyên ngành ở mức vừa.'
  }
];

const DIFFICULTY_STYLE = {
  'Dễ':        { bg: '#efefef', color: '#5e5e5e' },
  'Trung bình':{ bg: '#000',    color: '#fff'     },
  'Khó':       { bg: '#282828', color: '#afafaf'  }
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

  const partsForMode = exam.sections.map((s, idx) => ({ id: `s${idx + 1}`, label: s.label }));

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
          CHỦ ĐỀ: {exam.topic}
        </p>
        <h1 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '40px' }}>
          {exam.title}
        </h1>
        <p className="text-muted mb-0" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px' }}>
          {exam.sections.length} sections · {exam.totalQuestions} câu hỏi · {exam.duration} phút
        </p>
      </div>

      {/* Sections */}
      <div className="d-flex flex-column gap-3 mb-5">
        {exam.sections.map((s, idx) => (
          <div
            key={idx}
            className="rounded-4 overflow-hidden"
            style={{
              border: '1px solid #e2e2e2',
              backgroundColor: '#fff',
              transition: 'box-shadow 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = 'rgba(0,0,0,0.12) 0px 4px 16px'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div className="d-flex align-items-center justify-content-between p-4 gap-4 flex-wrap">
              <div className="d-flex align-items-center gap-4">
                <div
                  className="d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                  style={{
                    width: '56px', height: '56px', borderRadius: '999px',
                    backgroundColor: '#000',
                    color: '#fff',
                    fontSize: '18px', fontFamily: 'UberMove, system-ui, sans-serif'
                  }}
                >
                  {idx + 1}
                </div>
                <div>
                  <p className="mb-1 fw-bold" style={{ fontSize: '13px', fontFamily: 'UberMoveText, system-ui, sans-serif', color: '#5e5e5e', textTransform: 'uppercase' }}>
                    {s.label}
                  </p>
                  <h4 className="fw-bold mb-1" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '20px', color: '#000' }}>
                    {s.title}
                  </h4>
                  <p className="mb-1" style={{ fontSize: '14px', color: '#5e5e5e', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                    {s.questions} câu · {s.type}
                  </p>
                  <p className="mb-0" style={{ fontSize: '13px', color: '#afafaf', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                    🎧 {s.audio}
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
          Làm toàn bộ đề trong {exam.duration} phút. Nghe audio chỉ một lần — đúng như thi thật.
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
        fullDuration={exam.duration}
      />
    </main>
  </div>
  );
};

const ListeningPage = () => {
  const [selectedExam, setSelectedExam] = useState(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

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
        <div className="row g-4">
          {MOCK_EXAMS.map((exam) => {
            const diff = DIFFICULTY_STYLE[exam.difficulty];
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
                        {exam.totalQuestions} câu · {exam.duration} phút
                      </span>
                    </div>
                    <h3 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '24px' }}>
                      {exam.title}
                    </h3>
                    <p className="fw-medium mb-3" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', color: '#5e5e5e' }}>
                      Chủ đề: {exam.topic}
                    </p>
                    <p className="text-muted mb-4" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', lineHeight: '1.6' }}>
                      {exam.description}
                    </p>
                    <p className="text-muted mb-4" style={{ fontSize: '13px' }}>
                      {exam.sections.map(s => s.label).join(' · ')}
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
      </main>
    </div>
  );
};

export default ListeningPage;
