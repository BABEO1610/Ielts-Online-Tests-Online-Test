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
const SpeakingTestScreen = ({ part, exam, onBack, onSubmitSuccess, practiceMode, customTimeLimit }) => {
  const recorderRef = useRef(null);
  const [showAutoSubmit, setShowAutoSubmit] = useState(false);

  const durationMinutes = Math.ceil(part.duration / 60);
  const audioMaxDuration = customTimeLimit ? customTimeLimit * 60 : part.duration;

  const handleTimeUp = useCallback(() => {
    setShowAutoSubmit(true);
    if (recorderRef.current) {
      recorderRef.current.stopRecording();
    }
  }, []);

  const handleSubmitEarly = useCallback(() => {
    if (window.confirm('Bạn có chắc chắn muốn kết thúc bài thi?')) {
      setShowAutoSubmit(true);
      if (recorderRef.current) {
        recorderRef.current.stopRecording();
      }
    }
  }, []);

  const handleSuccess = (res) => {
    setShowAutoSubmit(false);
    if (onSubmitSuccess) onSubmitSuccess(res);
  };

  return (
  <div className="bg-white min-vh-100 pb-5">
    <TimerBar durationMinutes={durationMinutes} customTimeLimit={customTimeLimit} onTimeUp={handleTimeUp} onSubmitEarly={handleSubmitEarly} practiceMode={practiceMode} />
    <main className="container-fluid px-3 px-md-5 mt-4" style={{ maxWidth: '900px' }}>
      <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
        <button
          className="btn btn-light rounded-pill px-4 py-2 fw-medium border-0"
          style={{ backgroundColor: '#efefef', fontSize: '14px' }}
          onClick={onBack}
        >
          ← Quay lại
        </button>
        <div>
          <p className="mb-0 text-muted" style={{ fontSize: '13px', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
            {exam.title} · {exam.topic}
          </p>
          <h2 className="fw-bold mb-0 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '24px' }}>
            {part.title}
          </h2>
        </div>
      </div>

      {/* Question Card */}
      <div className="p-4 rounded-4 mb-4" style={{ backgroundColor: '#efefef' }}>
        <div className="d-flex gap-3 mb-3 flex-wrap">
          <span className="rounded-pill px-3 py-1 fw-medium" style={{ backgroundColor: '#000', color: '#fff', fontSize: '13px' }}>
            ⏱ Tối đa {Math.floor(part.duration / 60)} phút
          </span>
        </div>
        <p className="fw-bold mb-3 text-dark" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          CÂU HỎI
        </p>
        <ul className="mb-4 ps-3">
          {part.questions.map((q, i) => (
            <li key={i} className="mb-2 text-dark" style={{ fontSize: '16px', fontFamily: 'UberMoveText, system-ui, sans-serif', lineHeight: '1.8', listStyle: q.startsWith('—') || q.startsWith('  ') ? 'none' : 'disc' }}>
              {q}
            </li>
          ))}
        </ul>
        <div className="p-3 rounded-3" style={{ backgroundColor: '#e2e2e2', borderLeft: '3px solid #000' }}>
          <p className="mb-0 fw-medium text-dark" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
            💡 {part.tip}
          </p>
        </div>
      </div>

      {/* Instruction Banner */}
      <div className="p-3 rounded-3 mb-4" style={{ backgroundColor: '#282828', color: '#fff' }}>
        <p className="mb-0 fw-medium" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
          📢 Đọc kỹ câu hỏi, chuẩn bị câu trả lời, sau đó nhấn <strong>"Start Recording"</strong> để bắt đầu.
          Thời gian tối đa: <strong>{Math.floor(part.duration / 60)} phút {part.duration % 60 > 0 ? part.duration % 60 + ' giây' : ''}</strong>.
        </p>
      </div>

      <AudioRecorder
        ref={recorderRef}
        testId={part.id}
        partNumber={part.part_number}
        maxDuration={audioMaxDuration}
        practiceMode={practiceMode}
        onSubmitSuccess={handleSuccess}
      />
      <AutoSubmitModal isOpen={showAutoSubmit} />
    </main>
  </div>
  );
};

// ─── Level 2: Parts của một đề ───────────────────────────────────────────────
const SpeakingPartList = ({ exam, onSelectPart, onBack }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showModeModal, setShowModeModal] = useState(false);
  const [partToStart, setPartToStart] = useState(null);

  const handlePartClick = (part) => {
    // EARS[Event]: WHEN user tries to start part
    if (!isAuthenticated) {
      // EARS[Unwanted]: IF user is not authenticated THEN redirect to login
      navigate('/login', { state: { message: 'Vui lòng đăng nhập để bắt đầu làm bài' } });
      return;
    }
    setPartToStart(part);
    setShowModeModal(true);
  };

  const handleModeSelect = (modeConfig) => {
    setShowModeModal(false);
    onSelectPart(partToStart, modeConfig);
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
        <p className="text-muted mb-0" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px' }}>
          {exam.parts.length} phần · Luyện từng Part theo thứ tự để chuẩn bị tốt nhất
        </p>
      </div>

      <div className="d-flex flex-column gap-3">
        {exam.parts.map((part, idx) => (
          <div
            key={part.id}
            className="rounded-4 overflow-hidden"
            style={{ border: '1px solid #e2e2e2', cursor: 'pointer', transition: 'all 0.15s ease', backgroundColor: '#fff' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = 'rgba(0,0,0,0.15) 0px 4px 16px'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
            onClick={() => onSelectPart(part)}
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
              <button
                className="btn rounded-pill px-4 py-2 fw-medium flex-shrink-0"
                style={{
                  backgroundColor: '#000',
                  color: '#fff',
                  fontFamily: 'UberMoveText, system-ui, sans-serif',
                  fontSize: '15px',
                  border: 'none'
                }}
                onClick={(e) => { e.stopPropagation(); handlePartClick(part); }}
              >
                Vào phòng thi →
              </button>
            </div>
          </div>
        ))}
      </div>

      <ModeSelector
        show={showModeModal}
        onHide={() => setShowModeModal(false)}
        onSelectMode={handleModeSelect}
        examType="Speaking"
        fullDuration={partToStart ? Math.ceil(partToStart.duration / 60) : null}
      />
    </main>
  </div>
  );
};

// ─── Level 1: Danh sách đề thi ───────────────────────────────────────────────
const SpeakingPage = () => {
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);
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

  const handleSelectPart = (part, modeConfig) => {
    setPracticeMode(modeConfig.isPractice);
    setCustomTimeLimit(modeConfig.customTimeLimit);
    setSelectedPart(part);
  };

  const handleSubmitSuccess = (response) => {
    const id = response?.data?.submission_id || 'mock-speak-demo';
    setSubmittedId(id);
  };

  // Level 3: Sau khi nộp bài → xem kết quả
  if (selectedPart && selectedExam) {
    if (submittedId) {
      return (
        <div className="bg-white min-vh-100 pb-5">
          <StudentNavbar />
          <main className="container-fluid px-3 px-md-5 mt-4" style={{ maxWidth: '900px' }}>
            <div className="d-flex align-items-center gap-3 mb-4">
              <button
                className="btn btn-light rounded-pill px-4 py-2 fw-medium border-0"
                style={{ backgroundColor: '#efefef' }}
                onClick={() => { setSubmittedId(null); setSelectedPart(null); }}
              >
                ← Quay lại đề
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
    return (
      <SpeakingTestScreen
        part={selectedPart}
        exam={selectedExam}
        practiceMode={practiceMode}
        customTimeLimit={customTimeLimit}
        onBack={() => setSelectedPart(null)}
        onSubmitSuccess={handleSubmitSuccess}
      />
    );
  }

  // Level 2: Danh sách parts của một đề
  if (selectedExam) {
    return (
      <SpeakingPartList
        exam={selectedExam}
        onSelectPart={handleSelectPart}
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
