import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StudentNavbar from '../components/layout/StudentNavbar';
import AudioRecorder from '../components/grading/AudioRecorder';
import FeedbackReport from '../components/grading/FeedbackReport';
import ModeSelector from '../components/objective-testing/ModeSelector';
import TimerBar from '../components/objective-testing/TimerBar';
import AutoSubmitModal from '../components/objective-testing/AutoSubmitModal';

// ─── MOCK DATA — Danh sách đề thi Speaking ───────────────────────────────────
// Mỗi exam có 3 parts đúng chuẩn IELTS Speaking format
const MOCK_EXAMS = [
  {
    id: 'speaking-2025-06',
    title: 'Đề thi tháng 6/2025',
    date: 'Tháng 6, 2025',
    difficulty: 'Trung bình',
    topic: 'Technology & Society',
    parts: [
      {
        id: 'speaking-2025-06-p1',
        part_number: 1,
        title: 'Part 1 — Introduction & Interview',
        duration: 120,
        description: 'The examiner asks general questions about yourself and familiar topics.',
        questions: [
          'Do you use technology a lot in your daily life? How?',
          'What is your favourite app or digital tool? Why?',
          'Do you think young people use technology too much?',
          'How has technology changed the way you communicate with friends and family?',
          'Do you prefer reading physical books or e-books?'
        ],
        tip: 'Trả lời tự nhiên, dùng câu hoàn chỉnh. Không cần trả lời quá dài cho Part 1.'
      },
      {
        id: 'speaking-2025-06-p2',
        part_number: 2,
        title: 'Part 2 — Individual Long Turn',
        duration: 180,
        description: 'You have 1 minute to prepare, then speak for 1–2 minutes on the topic card.',
        questions: [
          'Describe a piece of technology that you find useful.',
          '— You should say:',
          '   • What it is',
          '   • How often you use it',
          '   • What you use it for',
          '   • And explain why you find it so useful.'
        ],
        tip: 'Chuẩn bị trước 1 phút, ghi chú các điểm chính. Nói đủ 2 phút. Dùng cấu trúc: mở đầu → thân bài → kết luận.'
      },
      {
        id: 'speaking-2025-06-p3',
        part_number: 3,
        title: 'Part 3 — Two-way Discussion',
        duration: 240,
        description: 'The examiner asks further questions related to Part 2 for a deeper discussion.',
        questions: [
          'How has technology changed the workplace in recent years?',
          'Do you think technology has made people more or less productive? Why?',
          'What are the risks of society becoming too dependent on technology?',
          'How might artificial intelligence affect employment in the future?',
          'Should there be limits on the development of new technologies? Why or why not?'
        ],
        tip: 'Part 3 cần thể hiện khả năng phân tích và lập luận. Dùng cấu trúc: Opinion + Reason + Example.'
      }
    ]
  },
  {
    id: 'speaking-2025-05',
    title: 'Đề thi tháng 5/2025',
    date: 'Tháng 5, 2025',
    difficulty: 'Khó',
    topic: 'Environment & Climate',
    parts: [
      {
        id: 'speaking-2025-05-p1',
        part_number: 1,
        title: 'Part 1 — Introduction & Interview',
        duration: 120,
        description: 'The examiner asks general questions about yourself and familiar topics.',
        questions: [
          'Do you care about environmental issues? Why?',
          'What do you do in your daily life to help the environment?',
          'Have you ever participated in any environmental activities?',
          'Is the environment better or worse in your hometown compared to years ago?',
          'Do you think individuals can make a difference to the environment?'
        ],
        tip: 'Dùng từ vựng liên quan đến môi trường: renewable energy, carbon footprint, sustainable, recycle.'
      },
      {
        id: 'speaking-2025-05-p2',
        part_number: 2,
        title: 'Part 2 — Individual Long Turn',
        duration: 180,
        description: 'You have 1 minute to prepare, then speak for 1–2 minutes on the topic card.',
        questions: [
          'Describe an environmental problem in your area.',
          '— You should say:',
          '   • What the problem is',
          '   • What the causes of the problem are',
          '   • What effects it has had on the local community',
          '   • And explain what you think should be done about it.'
        ],
        tip: 'Liên kết nguyên nhân-hậu quả-giải pháp một cách rõ ràng. Sử dụng ví dụ cụ thể từ địa phương của bạn.'
      },
      {
        id: 'speaking-2025-05-p3',
        part_number: 3,
        title: 'Part 3 — Two-way Discussion',
        duration: 240,
        description: 'The examiner asks further questions related to Part 2 for a deeper discussion.',
        questions: [
          'Do you think governments are doing enough to address climate change?',
          'Should big corporations be held more responsible for environmental damage?',
          'How can education help promote environmental awareness?',
          'Is it realistic to expect people to significantly reduce their carbon footprint?',
          'What role should international cooperation play in solving global environmental problems?'
        ],
        tip: 'Thể hiện khả năng nhìn nhận vấn đề đa chiều. Dùng hedging language: "It could be argued that...", "From one perspective..."'
      }
    ]
  },
  {
    id: 'speaking-2025-04',
    title: 'Đề thi tháng 4/2025',
    date: 'Tháng 4, 2025',
    difficulty: 'Dễ',
    topic: 'Travel & Tourism',
    parts: [
      {
        id: 'speaking-2025-04-p1',
        part_number: 1,
        title: 'Part 1 — Introduction & Interview',
        duration: 120,
        description: 'The examiner asks general questions about yourself and familiar topics.',
        questions: [
          'Do you enjoy travelling? Why or why not?',
          'Where is the most interesting place you have ever visited?',
          'Do you prefer travelling alone or with others?',
          'How do you usually plan your trips?',
          'Do you think travelling abroad is important? Why?'
        ],
        tip: 'Đây là chủ đề quen thuộc và dễ nói. Hãy chia sẻ những trải nghiệm du lịch thực tế của bạn.'
      },
      {
        id: 'speaking-2025-04-p2',
        part_number: 2,
        title: 'Part 2 — Individual Long Turn',
        duration: 180,
        description: 'You have 1 minute to prepare, then speak for 1–2 minutes on the topic card.',
        questions: [
          'Describe a memorable trip you have taken.',
          '— You should say:',
          '   • Where you went',
          '   • Who you went with',
          '   • What you did there',
          '   • And explain why this trip was memorable for you.'
        ],
        tip: 'Kể chuyện theo trình tự thời gian. Thêm cảm xúc và chi tiết cụ thể để bài nói thêm sinh động.'
      },
      {
        id: 'speaking-2025-04-p3',
        part_number: 3,
        title: 'Part 3 — Two-way Discussion',
        duration: 240,
        description: 'The examiner asks further questions related to Part 2 for a deeper discussion.',
        questions: [
          'How has tourism changed in your country over the past decade?',
          'What are the economic benefits and drawbacks of tourism for a country?',
          'Do you think mass tourism has a negative impact on local cultures?',
          'How might travel habits change in the future due to environmental concerns?',
          'Should governments limit the number of tourists visiting popular destinations?'
        ],
        tip: 'Mở rộng quan điểm cá nhân ra bức tranh xã hội rộng hơn. Trích dẫn số liệu hoặc ví dụ cụ thể nếu có thể.'
      }
    ]
  },
  {
    id: 'speaking-2025-03',
    title: 'Đề thi tháng 3/2025',
    date: 'Tháng 3, 2025',
    difficulty: 'Trung bình',
    topic: 'Education & Learning',
    parts: [
      {
        id: 'speaking-2025-03-p1',
        part_number: 1,
        title: 'Part 1 — Introduction & Interview',
        duration: 120,
        description: 'The examiner asks general questions about yourself and familiar topics.',
        questions: [
          'Are you a student or do you work?',
          'What subject do you enjoy most? Why?',
          'Did you enjoy school when you were younger?',
          'Do you think it is important to continue learning after leaving school?',
          'How do you prefer to learn new things — in a class or by yourself?'
        ],
        tip: 'Chủ đề Education rất phổ biến trong IELTS. Chuẩn bị sẵn từ vựng: curriculum, extracurricular, lifelong learning.'
      },
      {
        id: 'speaking-2025-03-p2',
        part_number: 2,
        title: 'Part 2 — Individual Long Turn',
        duration: 180,
        description: 'You have 1 minute to prepare, then speak for 1–2 minutes on the topic card.',
        questions: [
          'Describe a teacher who has had a positive influence on you.',
          '— You should say:',
          '   • Who this person is / was',
          '   • What subject they taught',
          '   • How they taught',
          '   • And explain why this teacher was so influential.'
        ],
        tip: 'Mô tả cụ thể phong cách dạy, tính cách và những điều mà người thầy/cô đó đã truyền cảm hứng cho bạn.'
      },
      {
        id: 'speaking-2025-03-p3',
        part_number: 3,
        title: 'Part 3 — Two-way Discussion',
        duration: 240,
        description: 'The examiner asks further questions related to Part 2 for a deeper discussion.',
        questions: [
          'What qualities make a good teacher?',
          'How important is it for schools to teach life skills, not just academic subjects?',
          'Do you think online education can replace traditional classroom learning?',
          'Should education be free for everyone at all levels?',
          'How can countries improve their education systems?'
        ],
        tip: 'Thể hiện tư duy phê phán. Không chỉ đồng ý/phản đối — hãy phân tích ưu nhược điểm của mỗi quan điểm.'
      }
    ]
  }
];

const DIFFICULTY_STYLE = {
  'Dễ':        { bg: '#efefef', color: '#5e5e5e' },
  'Trung bình':{ bg: '#000',    color: '#fff'     },
  'Khó':       { bg: '#282828', color: '#afafaf'  }
};

// ─── Level 3: Giao diện thu âm ───────────────────────────────────────────────
const SpeakingTestScreen = ({ exam, onBack, onSubmitSuccess, practiceMode, customTimeLimit }) => {
  const recorderRefs = useRef([]);
  const [showAutoSubmit, setShowAutoSubmit] = useState(false);
  const [activePartIndex, setActivePartIndex] = useState(0);

  const totalDurationSeconds = exam.parts.reduce((total, p) => total + (parseInt(p.duration) || 0), 0);
  const durationMinutes = Math.ceil(totalDurationSeconds / 60);

  const handleTimeUp = useCallback(() => {
    setShowAutoSubmit(true);
    recorderRefs.current.forEach(ref => {
      if (ref && ref.stopRecording) ref.stopRecording();
    });
  }, []);

  const handleSubmitEarly = useCallback(() => {
    if (window.confirm('Bạn có chắc chắn muốn kết thúc bài thi? (Hệ thống sẽ nộp toàn bộ 3 phần)')) {
      setShowAutoSubmit(true);
      recorderRefs.current.forEach(ref => {
        if (ref && ref.stopRecording) ref.stopRecording();
      });
    }
  }, []);

  const handleSuccess = (res) => {
    setShowAutoSubmit(false);
    if (onSubmitSuccess) onSubmitSuccess(res);
  };

  const activePart = exam.parts[activePartIndex];
  const examinerImage = "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=800&auto=format&fit=crop";

  return (
  <div className="bg-white min-vh-100 d-flex flex-column" style={{ overflowX: 'hidden' }}>
    <TimerBar durationMinutes={durationMinutes} customTimeLimit={customTimeLimit} onTimeUp={handleTimeUp} onSubmitEarly={handleSubmitEarly} practiceMode={practiceMode} />
    
    <div style={{ flex: 1, paddingBottom: '80px', display: 'flex', flexDirection: 'column' }}>
      <main className="container-fluid px-3 px-md-5 mt-4" style={{ maxWidth: '1000px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
          <p className="mb-0 text-muted text-uppercase fw-bold" style={{ fontSize: '13px', fontFamily: 'UberMoveText, system-ui, sans-serif', letterSpacing: 1 }}>
            {exam.title} · {exam.topic}
          </p>
        </div>

        <div className="text-center mb-4">
           <h2 className="fw-bold text-dark text-uppercase" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '24px', letterSpacing: 1 }}>
             PART {activePart.part_number}: <span style={{ color: '#5e5e5e' }}>{activePart.title.split('—')[1]?.trim() || 'Topic'}</span>
           </h2>
        </div>

        {/* Content Layout */}
        <div className="row g-4 mb-4 flex-grow-1">
          {/* Left: Examiner Image */}
          <div className="col-md-5 col-lg-6 d-flex align-items-center justify-content-center">
            <div className="rounded-4 overflow-hidden w-100 position-relative" style={{ backgroundColor: '#000', aspectRatio: '16/9' }}>
               <img src={examinerImage} alt="Examiner" className="img-fluid w-100 h-100" style={{ objectFit: 'cover', opacity: 0.9 }} />
               <div className="position-absolute bottom-0 start-0 p-3 w-100" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
                 <span className="badge bg-danger">IELTS Examiner</span>
               </div>
            </div>
          </div>

          {/* Right: Prompt & Questions */}
          <div className="col-md-7 col-lg-6 d-flex flex-column">
            <div className="p-4 rounded-4 h-100 d-flex flex-column" style={{ backgroundColor: '#efefef' }}>
              <div className="d-flex gap-3 mb-3 flex-wrap">
                <span className="rounded-pill px-3 py-1 fw-medium" style={{ backgroundColor: '#000', color: '#fff', fontSize: '13px' }}>
                  ⏱ Tối đa {Math.floor(activePart.duration / 60)} phút
                </span>
              </div>
              <p className="fw-bold mb-3 text-dark" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                CÂU HỎI
              </p>
              <ul className="mb-4 ps-3">
                {activePart.questions.map((q, i) => (
                  <li key={i} className="mb-2 text-dark" style={{ fontSize: '16px', fontFamily: 'UberMoveText, system-ui, sans-serif', lineHeight: '1.8', listStyle: q.startsWith('—') || q.startsWith('  ') ? 'none' : 'disc' }}>
                    {q}
                  </li>
                ))}
              </ul>
              <div className="p-3 rounded-3 mt-auto" style={{ backgroundColor: '#e2e2e2', borderLeft: '3px solid #000' }}>
                <p className="mb-0 fw-medium text-dark" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                  💡 {activePart.tip}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Audio Recorders */}
        <div className="d-flex justify-content-center mt-3">
          {exam.parts.map((part, idx) => (
             <div key={part.id} style={{ display: idx === activePartIndex ? 'block' : 'none', width: '100%' }}>
               <AudioRecorder
                  ref={el => recorderRefs.current[idx] = el}
                  testId={part.id}
                  partNumber={part.part_number}
                  maxDuration={customTimeLimit ? customTimeLimit * 60 : part.duration}
                  practiceMode={practiceMode}
                  onSubmitSuccess={handleSuccess}
               />
             </div>
          ))}
        </div>
        
        <AutoSubmitModal isOpen={showAutoSubmit} />
      </main>
    </div>

    {/* Bottom Nav */}
    <div className="bottom-nav-bar">
      <div className="bottom-nav-tabs justify-content-center">
        {exam.parts.map((part, idx) => {
          const isActive = activePartIndex === idx;
          return (
            <div 
              key={part.id}
              className={`bottom-nav-tab ${isActive ? 'active' : ''}`}
              style={{ minWidth: '150px', justifyContent: 'center' }}
              onClick={() => setActivePartIndex(idx)}
            >
              <span className="fw-bold">Part {part.part_number}</span>
            </div>
          );
        })}
      </div>
    </div>
  </div>
  );
};

// ─── Level 2: Parts của một đề ───────────────────────────────────────────────
const SpeakingPartList = ({ exam, onStartExam, onBack }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showModeModal, setShowModeModal] = useState(false);

  const handleStartClick = () => {
    // EARS[Event]: WHEN user tries to start exam
    if (!isAuthenticated) {
      // EARS[Unwanted]: IF user is not authenticated THEN redirect to login
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
        <p className="text-muted mb-1 fw-medium" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '1px' }}>
          CHỦ ĐỀ: {exam.topic}
        </p>
        <h1 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '40px' }}>
          {exam.title}
        </h1>
        <div className="d-flex justify-content-between align-items-center mb-0 mt-4">
          <p className="text-muted mb-0" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px' }}>
            {exam.parts.length} phần · Hoàn thành toàn bộ để nhận phản hồi đánh giá
          </p>
          <button className="btn btn-dark rounded-pill px-5 py-3 fw-bold" style={{ fontSize: '16px' }} onClick={handleStartClick}>
            Bắt đầu làm bài thi
          </button>
        </div>
      </div>

      <div className="d-flex flex-column gap-3">
        {exam.parts.map((part, idx) => (
          <div
            key={part.id}
            className="rounded-4 overflow-hidden bg-white"
            style={{ border: '1px solid #e2e2e2' }}
          >
            <div className="d-flex align-items-center justify-content-between p-4 gap-4 flex-wrap">
              <div className="d-flex align-items-center gap-4">
                {/* Part Badge */}
                <div
                  className="d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                  style={{
                    width: '56px', height: '56px', borderRadius: '999px',
                    backgroundColor: '#000',
                    color: '#fff',
                    fontSize: '20px', fontFamily: 'UberMove, system-ui, sans-serif'
                  }}
                >
                  {idx + 1}
                </div>
                <div>
                  <h4
                    className="fw-bold mb-1"
                    style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '20px', color: '#000' }}
                  >
                    {part.title}
                  </h4>
                  <p
                    className="mb-1"
                    style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', color: '#5e5e5e' }}
                  >
                    {part.description}
                  </p>
                  <span
                    className="fw-medium"
                    style={{ fontSize: '13px', color: '#5e5e5e' }}
                  >
                    ⏱ Tối đa {Math.floor(part.duration / 60)} phút · {part.questions.length} câu hỏi
                  </span>
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
        fullDuration={Math.ceil(exam.parts.reduce((total, p) => total + (parseInt(p.duration) || 0), 0) / 60)}
      />
    </main>
  </div>
  );
};

// ─── Level 1: Danh sách đề thi ───────────────────────────────────────────────
const SpeakingPage = () => {
  const [selectedExam, setSelectedExam] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);
  const [customTimeLimit, setCustomTimeLimit] = useState(null);
  const [submittedId, setSubmittedId] = useState(null);
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

  const handleStartExam = (modeConfig) => {
    setPracticeMode(modeConfig.isPractice);
    setCustomTimeLimit(modeConfig.customTimeLimit);
    setIsTesting(true);
  };

  const handleSubmitSuccess = (response) => {
    const id = response?.data?.submission_id || 'mock-speak-demo';
    setSubmittedId(id);
    setIsTesting(false);
  };

  // Level 3: Đang làm bài
  if (isTesting && selectedExam) {
    return (
      <SpeakingTestScreen
        exam={selectedExam}
        practiceMode={practiceMode}
        customTimeLimit={customTimeLimit}
        onBack={() => setIsTesting(false)}
        onSubmitSuccess={handleSubmitSuccess}
      />
    );
  }

  // Level 3.1: Sau khi nộp bài → xem kết quả
  if (submittedId) {
    return (
      <div className="bg-white min-vh-100 pb-5">
        <StudentNavbar />
        <main className="container-fluid px-3 px-md-5 mt-4" style={{ maxWidth: '900px' }}>
          <div className="d-flex align-items-center gap-3 mb-4">
            <button
              className="btn btn-light rounded-pill px-4 py-2 fw-medium border-0"
              style={{ backgroundColor: '#efefef' }}
              onClick={() => { setSubmittedId(null); setSelectedExam(null); }}
            >
              ← Trở về trang chủ
            </button>
            <h2 className="fw-bold mb-0" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '28px' }}>
              Kết quả chấm điểm
            </h2>
          </div>
          <FeedbackReport submissionId={submittedId} type="speaking" />
        </main>
      </div>
    );
  }

  // Level 2: Danh sách parts của một đề
  if (selectedExam) {
    return (
      <SpeakingPartList
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
            Speaking
          </h1>
          <p className="text-muted" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '20px' }}>
            Chọn đề thi để luyện nói. Nộp bài để nhận phản hồi từ AI hoặc giáo viên.
          </p>
        </div>

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
                        {exam.parts.length} Parts
                      </span>
                    </div>
                    <h3 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '24px' }}>
                      {exam.title}
                    </h3>
                    <p className="fw-medium mb-3" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', color: '#5e5e5e' }}>
                      Chủ đề: {exam.topic}
                    </p>
                    <p className="text-muted mb-4" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', lineHeight: '1.6' }}>
                      {exam.parts.map(p => p.title.split('—')[0].trim()).join(' · ')}
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
