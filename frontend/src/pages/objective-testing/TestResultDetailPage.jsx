/**
 * TestResultDetailPage.jsx — Task 4.3.2
 * Lưới Chi tiết từng câu hỏi
 * 
 * 40 câu: Trạng thái Đúng/Sai, đáp án của bạn, đáp án đúng.
 * Mở rộng (Accordion) để xem giải thích.
 * Bootstrap Accordion, text-success (đúng), text-danger (sai).
 */
import React from 'react';
import '../../styles/objective-testing.css';

const MOCK_ANSWERS = [
  { order: 1, text: 'The earliest known glass objects were:', yourAnswer: 'B', correctAnswer: 'B', isCorrect: true, explanation: 'The passage states that "the earliest known man-made glass objects are beads" — option B.' },
  { order: 2, text: 'Glassblowing was invented around:', yourAnswer: 'A', correctAnswer: 'C', isCorrect: false, explanation: 'The 1st century BC is mentioned as the time of invention.' },
  { order: 3, text: 'The Venetians established their glass industry on the island of ________.', yourAnswer: 'Murano', correctAnswer: 'Murano', isCorrect: true, explanation: 'Paragraph 4 mentions the island of Murano.' },
  { order: 4, text: 'George Ravenscroft added ________ to the glass formula.', yourAnswer: 'B', correctAnswer: 'B', isCorrect: true, explanation: 'Lead oxide was added to create lead crystal glass.' },
  { order: 5, text: 'Float glass was invented by Sir Alastair ________.', yourAnswer: 'Pilkington', correctAnswer: 'Pilkington', isCorrect: true, explanation: 'Sir Alastair Pilkington invented float glass in the 1950s.' },
  { order: 6, text: 'Early glass-making techniques were:', yourAnswer: 'A', correctAnswer: 'C', isCorrect: false, explanation: 'The passage says they were "closely guarded secrets".' },
  { order: 7, text: 'Molten glass is poured onto ________.', yourAnswer: '', correctAnswer: 'molten tin', isCorrect: false, explanation: 'The float glass process uses a bath of molten tin.' },
  { order: 8, text: 'Lead crystal glass is ideal for:', yourAnswer: 'B', correctAnswer: 'B', isCorrect: true, explanation: 'It was ideal for cutting and engraving.' },
];

function TestResultDetailPage() {
  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      <div className="page-heading">
        <h1>Answer review</h1>
        <p>Cambridge IELTS 18 — Reading Test 1 · Band 7.0 · 30/40 correct</p>
      </div>

      {/* Summary Bar */}
      <div className="d-flex gap-3 mb-4 flex-wrap">
        <div className="badge-status published" style={{ fontSize: 14, padding: '6px 16px' }}>
          ✓ {MOCK_ANSWERS.filter(a => a.isCorrect).length} Correct
        </div>
        <div className="badge-status draft" style={{ fontSize: 14, padding: '6px 16px', background: '#fdf2f2', color: '#e02424' }}>
          ✗ {MOCK_ANSWERS.filter(a => !a.isCorrect).length} Incorrect
        </div>
      </div>

      {/* Accordion */}
      <div className="accordion" id="resultsAccordion">
        {MOCK_ANSWERS.map((item) => (
          <div className="accordion-item" key={item.order} id={`result-q-${item.order}`} style={{ border: 'none', borderBottom: '1px solid var(--surface-pressed)', borderRadius: 0 }}>
            <h2 className="accordion-header">
              <button
                className="accordion-button collapsed"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target={`#collapse-${item.order}`}
                aria-expanded="false"
                aria-controls={`collapse-${item.order}`}
                style={{ background: 'var(--canvas)', boxShadow: 'none', padding: 'var(--spacing-lg)' }}
              >
                <div className="d-flex align-items-center gap-3 w-100">
                  <span
                    className={`q-number ${item.isCorrect ? 'correct' : 'incorrect'}`}
                    style={{
                      minWidth: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 'var(--rounded-md)', fontWeight: 700, fontSize: 14,
                      background: item.isCorrect ? '#edf7ed' : '#fdf2f2',
                      color: item.isCorrect ? '#1e4620' : '#e02424',
                    }}
                  >
                    {item.order}
                  </span>
                  <div className="flex-fill">
                    <span className="body-sm" style={{ color: 'var(--body)' }}>{item.text}</span>
                  </div>
                  <div className="d-flex gap-2 me-3">
                    <span className="body-sm">Yours: <strong style={{ color: item.isCorrect ? '#1e4620' : '#e02424' }}>{item.yourAnswer || '—'}</strong></span>
                    {!item.isCorrect && <span className="body-sm">Correct: <strong style={{ color: '#1e4620' }}>{item.correctAnswer}</strong></span>}
                  </div>
                </div>
              </button>
            </h2>
            <div id={`collapse-${item.order}`} className="accordion-collapse collapse" data-bs-parent="#resultsAccordion">
              <div className="accordion-body" style={{ background: 'var(--canvas-soft)', padding: 'var(--spacing-2xl)' }}>
                <p className="body-md mb-0" style={{ color: 'var(--body)' }}>{item.explanation}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TestResultDetailPage;
