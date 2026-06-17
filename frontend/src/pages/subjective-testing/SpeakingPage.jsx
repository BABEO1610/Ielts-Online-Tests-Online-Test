import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StudentNavbar from '../../components/layout/StudentNavbar';
import ModeSelector from '../../components/objective-testing/ModeSelector';

export const MOCK_EXAMS = [
  {
    id: 1,
    title: 'Cambridge IELTS 18 - Speaking Test 1',
    topic: 'Daily Life, Travel, Reading',
    description: 'Đề thi chuẩn Cambridge với các câu hỏi bám sát format bài thi Speaking thực tế.',
    questions: 15,
    difficulty: 'Khó',
    duration: 15,
    parts: [
      {
        partName: 'Part 1: Introduction and Interview',
        description: 'You will answer questions about yourself and familiar topics.',
        questions: [
          { id: 'q1', text: 'Where are you from?' },
          { id: 'q2', text: 'What do you like about your hometown?' },
          { id: 'q3', text: 'Do you prefer living in a city or the countryside?' }
        ],
        duration: '4-5 phút'
      },
      {
        partName: 'Part 2: Long Turn',
        description: 'You will have 1 minute to prepare and 1-2 minutes to speak on a specific topic.',
        prompt: 'Describe a memorable journey you have made.\nYou should say:\n- where you went\n- how you traveled\n- why you went on this journey\n- and explain why it was memorable.',
        preparationTime: 60,
        speakingTime: 120,
        duration: '3-4 phút'
      },
      {
        partName: 'Part 3: Discussion',
        description: 'You will answer more abstract questions related to the topic in Part 2.',
        questions: [
          { id: 'q4', text: 'How have travel habits changed in your country over the last few decades?' },
          { id: 'q5', text: 'What impact does tourism have on local cultures?' },
          { id: 'q6', text: 'Do you think international travel will become more or less common in the future?' }
        ],
        duration: '4-5 phút'
      }
    ]
  },
  {
    id: 2,
    title: 'Recent Actual Test - Speaking Practice 2',
    topic: 'Hobbies, Books, Literature',
    description: 'Đề thi thật được thu thập gần đây, giúp bạn quen với các chủ đề đang phổ biến.',
    questions: 14,
    difficulty: 'Trung bình',
    duration: 14,
    parts: [
      {
        partName: 'Part 1: Introduction and Interview',
        description: 'Questions about hobbies, work, and daily life.',
        questions: [
          { id: 'q1', text: 'Do you have any hobbies?' },
          { id: 'q2', text: 'What do you usually do in your free time?' }
        ],
        duration: '4-5 phút'
      },
      {
        partName: 'Part 2: Long Turn',
        description: 'Describe a book you read recently.',
        prompt: 'Describe a book that you enjoyed reading.\nYou should say:\n- what the book is\n- what it is about\n- why you decided to read it\n- and explain why you enjoyed it.',
        preparationTime: 60,
        speakingTime: 120,
        duration: '3-4 phút'
      },
      {
        partName: 'Part 3: Discussion',
        description: 'Abstract questions about reading and literature.',
        questions: [
          { id: 'q3', text: 'Is reading still popular in your country?' },
          { id: 'q4', text: 'Do you think e-books will replace printed books?' }
        ],
        duration: '4-5 phút'
      }
    ]
  }
];

const DIFFICULTY_STYLE = {
  'Dễ': { bg: '#efefef', color: '#5e5e5e' },
  'Trung bình': { bg: '#000', color: '#fff' },
  'Khó': { bg: '#282828', color: '#afafaf' }
};

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
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleViewExam = (exam) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { message: 'Vui lòng đăng nhập để xem chi tiết đề thi' } });
      return;
    }
    setSelectedExam(exam);
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
    <div className="bg-white min-vh-100 pb-5">
      <StudentNavbar />
      <main className="container-fluid px-3 px-md-5 mt-4 mt-md-5" style={{ maxWidth: '1200px' }}>
        <div className="mb-5">
          <h1 className="fw-bold mb-2 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '52px' }}>
            Speaking
          </h1>
          <p className="text-muted" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '20px' }}>
            Chọn đề thi để luyện nói. Chấm điểm chi tiết độ trôi chảy và phát âm bằng AI.
          </p>
        </div>

        <div className="row g-4">
          {MOCK_EXAMS.map((exam) => {
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
                        {exam.parts.length} phần · {exam.duration} phút
                      </span>
                    </div>
                    <h3 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '24px' }}>
                      {exam.title}
                    </h3>
                    <p className="fw-medium mb-3" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', color: '#5e5e5e' }}>
                      Chủ đề: {exam.topic || 'Tổng hợp'}
                    </p>
                    <p className="text-muted mb-4" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', lineHeight: '1.6' }}>
                      {exam.description || `Đề thi luyện tập Speaking mô phỏng format IELTS thực tế.`}
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

export default SpeakingPage;
