/**
 * ListeningTestPage.jsx — Task 4.2.3 + Task 4.2.4
 * Trang thi Listening
 * 
 * Player âm thanh cố định trên cùng (position-sticky), bên dưới là câu hỏi.
 * Dùng sticky-top cho thanh audio, container cho danh sách câu hỏi.
 * Render MCQ (Radio btn) và Fill-in-blank (Text input).
 * 
 * Design: Uber-inspired — sticky audio player, clean question cards.
 */
import React, { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import TimerBar from '../../components/objective-testing/TimerBar';
import AutoSubmitModal from '../../components/objective-testing/AutoSubmitModal';
import '../../styles/objective-testing.css';

/* Mock listening questions */
const MOCK_QUESTIONS = [
  { id: 1, order: 1, section: 'Section 1', type: 'mcq', text: 'What is the purpose of the phone call?', options: [{ label: 'A', text: 'To book a hotel room' }, { label: 'B', text: 'To enquire about a course' }, { label: 'C', text: 'To arrange a meeting' }, { label: 'D', text: 'To make a complaint' }], correctAnswer: 'B' },
  { id: 2, order: 2, section: 'Section 1', type: 'fill', text: 'The course starts on the ________ of September.', correctAnswer: '15th' },
  { id: 3, order: 3, section: 'Section 1', type: 'mcq', text: 'How much does the course cost?', options: [{ label: 'A', text: '$200' }, { label: 'B', text: '$350' }, { label: 'C', text: '$500' }, { label: 'D', text: '$750' }], correctAnswer: 'C' },
  { id: 4, order: 4, section: 'Section 2', type: 'fill', text: 'The museum is located on ________ Street.', correctAnswer: 'Oxford' },
  { id: 5, order: 5, section: 'Section 2', type: 'mcq', text: 'What time does the museum close on Sundays?', options: [{ label: 'A', text: '4 PM' }, { label: 'B', text: '5 PM' }, { label: 'C', text: '6 PM' }, { label: 'D', text: '7 PM' }], correctAnswer: 'B' },
  { id: 6, order: 6, section: 'Section 3', type: 'fill', text: 'The research project focuses on ________ pollution.', correctAnswer: 'water' },
  { id: 7, order: 7, section: 'Section 3', type: 'mcq', text: 'The student needs to submit the report by:', options: [{ label: 'A', text: 'Friday' }, { label: 'B', text: 'Monday' }, { label: 'C', text: 'Wednesday' }, { label: 'D', text: 'Thursday' }], correctAnswer: 'A' },
  { id: 8, order: 8, section: 'Section 4', type: 'fill', text: 'The lecture discusses the impact of ________ on modern architecture.', correctAnswer: 'technology' },
];

function ListeningTestPage() {
  const location = useLocation();
  const practiceMode = location.state?.practiceMode || false;
  const customTimeLimit = location.state?.customTimeLimit || null;
  const selectedPartIds = location.state?.selectedPartIds || ['s1', 's2', 's3', 's4'];

  const allowedSections = practiceMode ? selectedPartIds.map(id => `Section ${id.replace('s', '')}`) : ['Section 1', 'Section 2', 'Section 3', 'Section 4'];
  const filteredQuestions = MOCK_QUESTIONS.filter(q => allowedSections.includes(q.section));

  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [activeSection, setActiveSection] = useState(allowedSections[0]);
  const [showAutoSubmit, setShowAutoSubmit] = useState(false);

  const handleAnswer = useCallback((qOrder, value) => {
    setAnswers((prev) => ({ ...prev, [qOrder]: value }));
  }, []);

  const answeredQuestions = Object.keys(answers)
    .filter((k) => answers[k] !== '')
    .map(Number);

  const handleTimeUp = useCallback(() => {
    setShowAutoSubmit(true);
  }, []);

  const handleSubmitEarly = useCallback(() => {
    if (window.confirm('Are you sure you want to submit?')) {
      setShowAutoSubmit(true);
    }
  }, []);

  const scrollToQuestion = useCallback((qNum) => {
    setCurrentQuestion(qNum);
    const el = document.getElementById(`lq-${qNum}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  /* Group by section */
  const sections = filteredQuestions.reduce((acc, q) => {
    if (!acc[q.section]) acc[q.section] = [];
    acc[q.section].push(q);
    return acc;
  }, {});

  return (
    <div id="listening-test-page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Timer */}
      <TimerBar durationMinutes={30} customTimeLimit={customTimeLimit} onTimeUp={handleTimeUp} onSubmitEarly={handleSubmitEarly} practiceMode={practiceMode} />

      {/* Sticky Audio Player */}
      <div className="audio-player-sticky" id="audio-player">
        <div className="container" style={{ maxWidth: 900 }}>
          <div className="d-flex align-items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--ink)" stroke="none">
              <path d="M12 3v18l-7-5H2V8h3l7-5zm10 9a8 8 0 01-2.3 5.7l-1.4-1.4A6 6 0 0020 12a6 6 0 00-1.7-4.3l1.4-1.4A8 8 0 0122 12zm-4 0a4 4 0 01-1.2 2.8l-1.4-1.4A2 2 0 0016 12a2 2 0 00-.6-1.4l1.4-1.4A4 4 0 0118 12z"/>
            </svg>
            <span className="body-sm-strong">Listening Audio — Section 1-4</span>
          </div>
          <audio
            controls
            id="audio-element"
            style={{ marginTop: 8 }}
          >
            <source src="/audio/sample-listening.mp3" type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
          <p className="caption mt-1 mb-0" style={{ color: 'var(--mute)' }}>
            Audio will play once. Listen carefully.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-4" style={{ maxWidth: 900, paddingBottom: '100px' }}>
        <div className="row g-4">
          {/* Main Question Column */}
          <div className="col-12">
            {sections[activeSection] && (
              <div className="mb-4 pb-5">
                <h5 className="display-sm mb-4" style={{ borderBottom: '2px solid var(--ink)', paddingBottom: 8, display: 'inline-block' }}>
                  {activeSection.replace('Section', 'Part')}
                </h5>
                {sections[activeSection].map((q) => (
                  <div
                    key={q.id}
                    id={`lq-${q.order}`}
                    className="card-content mb-3"
                    style={{
                      border: currentQuestion === q.order ? '2px solid var(--ink)' : '2px solid transparent',
                    }}
                    onClick={() => setCurrentQuestion(q.order)}
                  >
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <span style={{
                        width: 28, height: 28, borderRadius: 'var(--rounded-md)',
                        background: answeredQuestions.includes(q.order) ? 'var(--ink)' : 'var(--canvas-soft)',
                        color: answeredQuestions.includes(q.order) ? '#fff' : 'var(--ink)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700,
                      }}>
                        {q.order}
                      </span>
                      <span className="badge-difficulty" style={{ fontSize: 11 }}>
                        {q.type === 'mcq' ? 'Multiple Choice' : 'Fill in the blank'}
                      </span>
                    </div>
                    <p className="body-md-strong mb-3">{q.text}</p>

                    {q.type === 'mcq' ? (
                      <div className="d-flex flex-column gap-2">
                        {q.options.map((opt) => (
                          <label
                            key={opt.label}
                            className={`option-card ${answers[q.order] === opt.label ? 'selected' : ''}`}
                            id={`l-option-${q.order}-${opt.label}`}
                            style={{ margin: 0, padding: '12px 16px', alignItems: 'flex-start' }}
                          >
                            <input
                              type="radio"
                              name={`lq-${q.order}`}
                              className="form-check-input flex-shrink-0 mt-1"
                              value={opt.label}
                              checked={answers[q.order] === opt.label}
                              onChange={() => handleAnswer(q.order, opt.label)}
                              style={{ margin: 0 }}
                            />
                            <span className="body-md-strong flex-shrink-0 mt-1" style={{ minWidth: 24 }}>{opt.label}.</span>
                            <span className="body-md mt-1">{opt.text}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <input
                        type="text"
                        className="text-input w-100"
                        id={`l-input-${q.order}`}
                        placeholder="Type your answer..."
                        value={answers[q.order] || ''}
                        onChange={(e) => handleAnswer(q.order, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-nav-bar">
        <div className="bottom-nav-tabs">
          {allowedSections.map((sectionName, index) => {
            const partNum = index + 1;
            const isActive = activeSection === sectionName;
            const partQuestions = sections[sectionName] || [];
            
            return (
              <div 
                key={sectionName} 
                className={`bottom-nav-tab ${isActive ? 'active' : ''}`}
                onClick={() => setActiveSection(sectionName)}
              >
                <span className="fw-bold">Part {partNum}</span>
                {isActive ? (
                  <div className="d-flex gap-2 ms-2">
                    {partQuestions.map(q => (
                      <div 
                        key={q.id}
                        className={`q-circle ${answeredQuestions.includes(q.order) ? 'answered' : ''} ${currentQuestion === q.order ? 'current' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToQuestion(q.order);
                        }}
                      >
                        {q.order}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: 'var(--body)' }}>: {partQuestions.filter(q => answeredQuestions.includes(q.order)).length} of {partQuestions.length} questions</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Auto Submit Modal */}
      <AutoSubmitModal isOpen={showAutoSubmit} />
    </div>
  );
}

export default ListeningTestPage;
