/**
 * ReadingTestPage.jsx — Task 4.2.2 + Task 4.2.4
 * Trang thi Reading (Split View) + Bộ 40 câu hỏi & Đáp án
 * 
 * Chia màn hình 50-50: Trái đọc bài văn, phải làm câu hỏi.
 * Cuộn độc lập. Render Multiple Choice (Radio) + Fill-in-blank (Text input).
 * 
 * Bootstrap 5: row với 2 cột col-md-6, class vh-100 overflow-auto.
 * Design: Uber-inspired split view, form-check, form-control.
 */
import React, { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import TimerBar from '../../components/objective-testing/TimerBar';
import QuestionNavigation from '../../components/objective-testing/QuestionNavigation';
import AutoSubmitModal from '../../components/objective-testing/AutoSubmitModal';
import '../../styles/objective-testing.css';

/* Mock passage */
const MOCK_PASSAGE = `
<h3 style="margin-bottom: 16px">The History of Glass</h3>
<p>When people think of glass, they usually think of a transparent substance used primarily for windows. Glass, however, has a history stretching back thousands of years and has been utilised in a remarkable variety of ways.</p>

<p>The earliest known man-made glass objects are beads dating from around 3500 BC, found in Egypt and Eastern Mesopotamia. These first glass-making techniques were closely guarded secrets. Glass production flourished in Egypt and Mesopotamia and later spread to the Levant and the Mediterranean coast.</p>

<p>The invention of glassblowing around the 1st century BC was a major breakthrough in glass technology. This technique made glass production faster, easier, and cheaper than older methods. Glass could now be shaped into a wider variety of forms and began to be used as a household item.</p>

<p>During the Middle Ages, glass-making centres developed throughout Europe. The Venetians, in particular, became famous for their high-quality glass and by the 13th century had established a flourishing glass industry on the island of Murano. Venetian glass was renowned for its exceptional clarity and the artistry of its designs.</p>

<p>In the 17th century, an Englishman named George Ravenscroft discovered that adding lead oxide to the glass formula produced a type of glass with a particularly brilliant lustre and a slightly softer quality that made it ideal for cutting and engraving. This 'lead crystal' glass became highly prized for drinking vessels, chandeliers, and decorative objects.</p>

<p>The Industrial Revolution brought mechanised production methods that greatly reduced the cost of glass and made it widely available. Float glass, invented in the 1950s by Sir Alastair Pilkington, revolutionised the manufacture of flat glass. In this process, molten glass is poured onto a bath of molten tin, where it spreads out and forms a flat, uniform sheet.</p>
`;

/* Mock questions — mix of MCQ and Fill-in-blank */
const MOCK_QUESTIONS = [
  { id: 1, order: 1, passage: 'Passage 1', type: 'mcq', text: 'The earliest known glass objects were:', options: [{ label: 'A', text: 'Windows' }, { label: 'B', text: 'Beads' }, { label: 'C', text: 'Bottles' }, { label: 'D', text: 'Mirrors' }], correctAnswer: 'B' },
  { id: 2, order: 2, passage: 'Passage 1', type: 'mcq', text: 'Glassblowing was invented around:', options: [{ label: 'A', text: '3500 BC' }, { label: 'B', text: '13th century' }, { label: 'C', text: '1st century BC' }, { label: 'D', text: '17th century' }], correctAnswer: 'C' },
  { id: 3, order: 3, passage: 'Passage 1', type: 'fill', text: 'The Venetians established their glass industry on the island of ________.', correctAnswer: 'Murano' },
  { id: 4, order: 4, passage: 'Passage 1', type: 'mcq', text: 'George Ravenscroft added ________ to the glass formula.', options: [{ label: 'A', text: 'Silver oxide' }, { label: 'B', text: 'Lead oxide' }, { label: 'C', text: 'Iron oxide' }, { label: 'D', text: 'Copper oxide' }], correctAnswer: 'B' },
  { id: 5, order: 5, passage: 'Passage 2', type: 'fill', text: 'Float glass was invented by Sir Alastair ________.', correctAnswer: 'Pilkington' },
  { id: 6, order: 6, passage: 'Passage 2', type: 'mcq', text: 'Early glass-making techniques were:', options: [{ label: 'A', text: 'Widely shared' }, { label: 'B', text: 'Well documented' }, { label: 'C', text: 'Closely guarded' }, { label: 'D', text: 'Easily learned' }], correctAnswer: 'C' },
  { id: 7, order: 7, passage: 'Passage 2', type: 'fill', text: 'In the float glass process, molten glass is poured onto ________.', correctAnswer: 'molten tin' },
  { id: 8, order: 8, passage: 'Passage 2', type: 'mcq', text: 'Lead crystal glass is ideal for:', options: [{ label: 'A', text: 'Windows only' }, { label: 'B', text: 'Cutting and engraving' }, { label: 'C', text: 'Industrial use' }, { label: 'D', text: 'Scientific instruments' }], correctAnswer: 'B' },
];

function ReadingTestPage() {
  const location = useLocation();
  const practiceMode = location.state?.practiceMode || false;
  const customTimeLimit = location.state?.customTimeLimit || null;
  const selectedPartIds = location.state?.selectedPartIds || ['p1', 'p2', 'p3'];

  const allowedPassages = practiceMode ? selectedPartIds.map(id => `Passage ${id.replace('p', '')}`) : ['Passage 1', 'Passage 2', 'Passage 3'];
  const filteredQuestions = MOCK_QUESTIONS.filter(q => allowedPassages.includes(q.passage));

  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(1);
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
    if (window.confirm('Are you sure you want to submit? You cannot undo this action.')) {
      setShowAutoSubmit(true);
    }
  }, []);

  const scrollToQuestion = useCallback((qNum) => {
    setCurrentQuestion(qNum);
    const el = document.getElementById(`question-${qNum}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  return (
    <div id="reading-test-page" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Timer */}
      <TimerBar durationMinutes={60} customTimeLimit={customTimeLimit} onTimeUp={handleTimeUp} onSubmitEarly={handleSubmitEarly} practiceMode={practiceMode} />

      {/* Split View */}
      <div className="split-view">
        {/* Left — Passage */}
        <div className="split-left" id="reading-passage-panel">
          <div className="body-sm-strong mb-2" style={{ color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Reading Passage
          </div>
          <div
            className="body-md"
            style={{ lineHeight: '28px' }}
            dangerouslySetInnerHTML={{ __html: MOCK_PASSAGE }}
          />
        </div>

        {/* Right — Questions + Nav */}
        <div className="split-right" id="reading-questions-panel">
          <div className="mb-4">
            <QuestionNavigation
              totalQuestions={filteredQuestions.length}
              currentQuestion={currentQuestion}
              answeredQuestions={answeredQuestions}
              onNavigate={scrollToQuestion}
            />
          </div>

          {/* Questions List */}
          <div>
            {filteredQuestions.map((q) => (
              <div
                key={q.id}
                id={`question-${q.order}`}
                className="card-content mb-3"
                style={{
                  border: currentQuestion === q.order ? '2px solid var(--ink)' : '2px solid transparent',
                }}
                onClick={() => setCurrentQuestion(q.order)}
              >
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span
                    className="body-sm-strong"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--rounded-md)',
                      background: answeredQuestions.includes(q.order) ? 'var(--ink)' : 'var(--canvas-soft)',
                      color: answeredQuestions.includes(q.order) ? '#fff' : 'var(--ink)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                    }}
                  >
                    {q.order}
                  </span>
                  <span className="badge-difficulty" style={{ fontSize: 11 }}>
                    {q.type === 'mcq' ? 'Multiple Choice' : 'Fill in the blank'}
                  </span>
                </div>
                <p className="body-md-strong mb-3">{q.text}</p>

                {q.type === 'mcq' ? (
                  /* MCQ Options */
                  <div>
                    {q.options.map((opt) => (
                      <label
                        key={opt.label}
                        className={`option-card ${answers[q.order] === opt.label ? 'selected' : ''}`}
                        id={`option-${q.order}-${opt.label}`}
                      >
                        <input
                          type="radio"
                          name={`q-${q.order}`}
                          className="form-check-input"
                          value={opt.label}
                          checked={answers[q.order] === opt.label}
                          onChange={() => handleAnswer(q.order, opt.label)}
                          style={{ margin: 0 }}
                        />
                        <span className="body-md-strong" style={{ minWidth: 20 }}>{opt.label}.</span>
                        <span className="body-md">{opt.text}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  /* Fill-in-blank */
                  <input
                    type="text"
                    className="text-input"
                    id={`input-fill-${q.order}`}
                    placeholder="Type your answer..."
                    value={answers[q.order] || ''}
                    onChange={(e) => handleAnswer(q.order, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Auto Submit Modal */}
      <AutoSubmitModal isOpen={showAutoSubmit} />
    </div>
  );
}

export default ReadingTestPage;
