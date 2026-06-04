/**
 * TestDetailPage.jsx — Task 4.1.2
 * Trang chi tiết đề thi (Student View)
 * 
 * Hiển thị thông tin chi tiết: số câu, thời gian, quy định.
 * Nút "Bắt đầu thi" lớn ở trung tâm.
 * 
 * Bootstrap 5: container, jumbotron-like div, btn btn-primary btn-lg.
 * Design: Uber-inspired — dark hero band, pill CTA.
 */
import React from 'react';
import '../../styles/objective-testing.css';

/* Mock data — sẽ thay bằng API call useParams().id */
const MOCK_TEST = {
  id: '1',
  title: 'Cambridge IELTS 18 — Reading Test 1',
  skill: 'reading',
  difficulty: 'intermediate',
  questionCount: 40,
  duration: 60,
  description: 'This test consists of 3 reading passages with a total of 40 questions. You will have 60 minutes to complete. Practice with authentic IELTS Academic reading materials.',
  rules: [
    'You will have 60 minutes to answer all 40 questions.',
    'The timer starts immediately once you begin.',
    'You can navigate between questions using the question palette.',
    'Your answers are auto-saved every 60 seconds.',
    'The test will be auto-submitted when time runs out.',
    'Each correct answer is worth 1 mark. There is no negative marking.',
  ],
};

function TestDetailPage() {
  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      {/* Dark Hero Band */}
      <div className="exam-detail-hero mb-4" id="exam-detail-hero">
        <div className="d-flex justify-content-center gap-2 mb-3">
          <span className="badge-skill">{MOCK_TEST.skill}</span>
          <span className="badge-difficulty" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
            {MOCK_TEST.difficulty}
          </span>
        </div>
        <h1 className="hero-title">{MOCK_TEST.title}</h1>
        <p className="body-md" style={{ color: 'var(--mute)', maxWidth: 600, margin: '0 auto' }}>
          {MOCK_TEST.description}
        </p>
      </div>

      {/* Info Cards Row */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card-content text-center" id="info-questions">
            <div className="display-md mb-1">{MOCK_TEST.questionCount}</div>
            <div className="body-sm" style={{ color: 'var(--body)' }}>Questions</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card-content text-center" id="info-duration">
            <div className="display-md mb-1">{MOCK_TEST.duration} min</div>
            <div className="body-sm" style={{ color: 'var(--body)' }}>Duration</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card-content text-center" id="info-mode">
            <div className="display-md mb-1">Timed</div>
            <div className="body-sm" style={{ color: 'var(--body)' }}>Mode</div>
          </div>
        </div>
      </div>

      {/* Rules Card */}
      <div className="card-content mb-4" id="test-rules-card">
        <h2 className="display-sm mb-3">Test rules</h2>
        <ul className="list-unstyled mb-0">
          {MOCK_TEST.rules.map((rule, idx) => (
            <li key={idx} className="d-flex align-items-start gap-2 mb-2">
              <span style={{ minWidth: 24, height: 24, borderRadius: 'var(--rounded-full)', background: 'var(--canvas-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                {idx + 1}
              </span>
              <span className="body-md">{rule}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA Button */}
      <div className="text-center">
        <button
          className="button-primary"
          id="btn-start-test"
          style={{ width: 'auto', padding: '16px 48px', fontSize: 18, fontWeight: 500 }}
          data-bs-toggle="modal"
          data-bs-target="#instructionModal"
        >
          Bắt đầu thi
        </button>
      </div>
    </div>
  );
}

export default TestDetailPage;
