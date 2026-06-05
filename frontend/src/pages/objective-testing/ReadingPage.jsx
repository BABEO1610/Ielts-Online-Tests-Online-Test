import React, { useState } from 'react';
import StudentNavbar from '../../components/layout/StudentNavbar';

/**
 * ReadingPage.jsx — /reading
 * Level 1: Danh sách đề Reading theo tháng
 * Level 2: Passages của đề đó (3 passages chuẩn IELTS Academic)
 * Level 3: Redirect vào ReadingTestPage (/tests/:id/reading)
 *
 * DESIGN: Uber-inspired — black/white duet, pill shapes (rounded.pill = 999px),
 *         cards (rounded.xl = 16px), UberMove/UberMoveText fonts, sentence-case.
 */

const MOCK_EXAMS = [
  {
    id: '1',
    title: 'Đề thi tháng 6/2025',
    date: 'Tháng 6, 2025',
    difficulty: 'Trung bình',
    topic: 'Science & Technology',
    passages: [
      { label: 'Passage 1', title: 'The History of Glass', questions: 13, type: 'Multiple choice, True/False/Not Given' },
      { label: 'Passage 2', title: 'Urban Farming Revolution', questions: 13, type: 'Matching headings, Short answer' },
      { label: 'Passage 3', title: 'The Future of Artificial Intelligence', questions: 14, type: 'Summary completion, Multiple choice' },
    ],
    totalQuestions: 40,
    duration: 60,
    description: 'Ba đoạn văn học thuật từ các tạp chí khoa học và công nghệ uy tín.'
  },
  {
    id: '3',
    title: 'Đề thi tháng 5/2025',
    date: 'Tháng 5, 2025',
    difficulty: 'Khó',
    topic: 'Environment & Society',
    passages: [
      { label: 'Passage 1', title: 'Coral Reef Ecosystems', questions: 13, type: 'True/False/Not Given, Matching features' },
      { label: 'Passage 2', title: 'The Economics of Recycling', questions: 13, type: 'Multiple choice, Sentence completion' },
      { label: 'Passage 3', title: 'Behavioural Economics and Climate Policy', questions: 14, type: 'Matching information, Summary completion' },
    ],
    totalQuestions: 40,
    duration: 60,
    description: 'Các đoạn văn thách thức về môi trường và chính sách xã hội — phù hợp band 7+.'
  },
  {
    id: '5',
    title: 'Đề thi tháng 4/2025',
    date: 'Tháng 4, 2025',
    difficulty: 'Dễ',
    topic: 'Culture & History',
    passages: [
      { label: 'Passage 1', title: 'The Origins of Writing', questions: 13, type: 'Multiple choice, True/False/Not Given' },
      { label: 'Passage 2', title: 'Traditional Music Around the World', questions: 13, type: 'Matching headings, Gap fill' },
      { label: 'Passage 3', title: 'Architecture of Ancient Rome', questions: 14, type: 'Multiple choice, Short answer' },
    ],
    totalQuestions: 40,
    duration: 60,
    description: 'Đề ở mức độ cơ bản — lý tưởng để luyện cấu trúc câu hỏi và kỹ thuật skimming/scanning.'
  },
  {
    id: 'r4',
    title: 'Đề thi tháng 3/2025',
    date: 'Tháng 3, 2025',
    difficulty: 'Trung bình',
    topic: 'Health & Medicine',
    passages: [
      { label: 'Passage 1', title: 'Sleep and Human Performance', questions: 13, type: 'True/False/Not Given, Multiple choice' },
      { label: 'Passage 2', title: 'The Development of Modern Vaccines', questions: 13, type: 'Matching features, Short answer' },
      { label: 'Passage 3', title: 'Mental Health in the Digital Age', questions: 14, type: 'Summary completion, Multiple choice' },
    ],
    totalQuestions: 40,
    duration: 60,
    description: 'Ba đoạn văn về y tế và sức khoẻ với từ vựng học thuật chuyên ngành.'
  }
];

const DIFFICULTY_STYLE = {
  'Dễ':        { bg: '#efefef', color: '#5e5e5e' },
  'Trung bình':{ bg: '#000',    color: '#fff'     },
  'Khó':       { bg: '#282828', color: '#afafaf'  }
};

// ─── Level 2: Passages của một đề ─────────────────────────────────────────────
const PassageList = ({ exam, onBack }) => (
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
          {exam.passages.length} passages · {exam.totalQuestions} câu hỏi · {exam.duration} phút
        </p>
      </div>

      {/* Passages */}
      <div className="d-flex flex-column gap-3 mb-5">
        {exam.passages.map((p, idx) => (
          <div
            key={idx}
            className="rounded-4 overflow-hidden"
            style={{
              border: '1px solid #e2e2e2',
              backgroundColor: idx === 1 ? '#000' : '#fff',
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
                    backgroundColor: idx === 1 ? '#fff' : '#000',
                    color: idx === 1 ? '#000' : '#fff',
                    fontSize: '18px', fontFamily: 'UberMove, system-ui, sans-serif'
                  }}
                >
                  {idx + 1}
                </div>
                <div>
                  <p className="mb-1 fw-bold" style={{ fontSize: '13px', fontFamily: 'UberMoveText, system-ui, sans-serif', color: idx === 1 ? '#afafaf' : '#5e5e5e', textTransform: 'uppercase' }}>
                    {p.label}
                  </p>
                  <h4 className="fw-bold mb-1" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '20px', color: idx === 1 ? '#fff' : '#000' }}>
                    {p.title}
                  </h4>
                  <p className="mb-0" style={{ fontSize: '14px', color: idx === 1 ? '#afafaf' : '#5e5e5e', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                    {p.questions} câu · {p.type}
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
          Làm toàn bộ đề trong {exam.duration} phút. Kết quả sẽ được chấm tự động ngay sau khi nộp.
        </p>
        <a
          href={`/tests/${exam.id}/reading`}
          className="btn rounded-pill px-5 py-3 fw-bold"
          style={{ backgroundColor: '#fff', color: '#000', fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px', textDecoration: 'none' }}
        >
          Bắt đầu làm bài →
        </a>
      </div>
    </main>
  </div>
);

// ─── Level 1: Danh sách đề thi Reading ────────────────────────────────────────
const ReadingPage = () => {
  const [selectedExam, setSelectedExam] = useState(null);

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
                  onClick={() => setSelectedExam(exam)}
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
                      {exam.passages.map(p => p.label).join(' · ')}
                    </p>
                  </div>
                  <button
                    className="btn btn-dark rounded-pill px-4 py-2 fw-medium align-self-start"
                    style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '15px' }}
                    onClick={(e) => { e.stopPropagation(); setSelectedExam(exam); }}
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

export default ReadingPage;
