/**
 * ReadingTestPage.jsx — /tests/:id/reading
 *
 * Split view: trái = passage content, phải = câu hỏi.
 * Dữ liệu lấy từ GET /api/v1/tests/:id (testService.getTestById).
 * Nộp bài: POST /api/v1/tests/:id/attempts (attemptService.submitAttempt).
 *
 * Response shape từ backend (test.service.js getTestById):
 *   test.passages[]
 *     .passageNumber (int)
 *     .title (string)
 *     .content (text/html)
 *     .blocks[]
 *       .type  (question_type: 'multiple_choice' | 'fill_blank' | ...)
 *       .range (string e.g. "1-13")
 *       .questions[]
 *         .id
 *         .questionOrder (int)
 *         .text (question_text)
 *         .options (JSONB — array of { label, text } or string[])
 *         .correctAnswer
 *         .correctAnswers
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import TimerBar from '../../components/objective-testing/TimerBar';
import AutoSubmitModal from '../../components/objective-testing/AutoSubmitModal';
import { testService } from '../../services/test.service';
import { attemptService } from '../../services/attempt.service';
import '../../styles/objective-testing.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────
/**
 * Flatten passages + questions from the actual API response shape.
 * Returns { passages (filtered), questions (flat, sorted by questionOrder) }
 */
function flattenTestData(testData, allowedPassageNumbers) {
  const allPassages = testData.passages || [];
  const passages = allPassages.filter((p) =>
    allowedPassageNumbers.includes(p.passageNumber)
  );

  const questions = [];

  passages.forEach((passage) => {
    (passage.blocks || []).forEach((block) => {
      // question_type from backend: 'multiple_choice', 'true_false', 'fill_blank',
      // 'matching_headings', 'sentence_completion', etc.
      const isMcq = ['multiple_choice', 'true_false', 'multiple_choice_multiple'].includes(block.type);

      (block.questions || []).forEach((q) => {
        // Normalise options: backend stores as JSONB (array of {label,text} or plain strings)
        let options = [];
        if (Array.isArray(q.options)) {
          options = q.options;
        } else if (q.options && typeof q.options === 'string') {
          try { options = JSON.parse(q.options); } catch { options = []; }
        }

        questions.push({
          id: q.id,
          order: q.questionOrder,  // matches backend field name
          passageNumber: passage.passageNumber,
          type: isMcq ? 'mcq' : 'fill',
          text: q.text || '',
          options,
        });
      });
    });
  });

  questions.sort((a, b) => a.order - b.order);
  return { passages, questions };
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div id="reading-test-page" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ height: 56, backgroundColor: '#000' }} />
      <div className="split-view">
        <div className="split-left">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{ height: 16, backgroundColor: '#efefef', borderRadius: 4, marginBottom: 12, width: `${55 + (i % 4) * 12}%` }} />
          ))}
        </div>
        <div className="split-right">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-content mb-3" style={{ padding: 20 }}>
              <div style={{ height: 14, backgroundColor: '#efefef', borderRadius: 4, marginBottom: 12, width: '70%' }} />
              <div style={{ height: 14, backgroundColor: '#f5f5f5', borderRadius: 4, width: '50%' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function ReadingTestPage() {
  const { id: testId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // State passed from ReadingPage via navigate()
  const practiceMode      = location.state?.practiceMode      || false;
  const customTimeLimit   = location.state?.customTimeLimit   || null;
  const selectedPartIds   = location.state?.selectedPartIds   || null; // e.g. ['p1','p2','p3']

  // Which passage numbers to show (selectedPartIds = ['p1','p2'] → [1,2])
  const allowedPassageNumbers = selectedPartIds
    ? selectedPartIds.map((pid) => parseInt(pid.replace('p', ''), 10))
    : [1, 2, 3];

  // ── State ───────────────────────────────────────────────────────────────────
  const [testData,    setTestData]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [submitting,  setSubmitting]  = useState(false);

  const [answers,          setAnswers]          = useState({});         // { [questionOrder]: string }
  const [currentQuestion,  setCurrentQuestion]  = useState(null);       // highlighted question order
  const [activePassageNum, setActivePassageNum] = useState(allowedPassageNumbers[0]);
  const [showAutoSubmit,   setShowAutoSubmit]   = useState(false);
  const [startTime]                             = useState(Date.now());

  // ── Fetch test data ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const fetchTest = async () => {
      try {
        setLoading(true);
        const res = await testService.getTestById(testId);
        if (!cancelled) {
          if (res.success && res.data) {
            setTestData(res.data);
            // Set initial question to first question order
            const firstPassage = (res.data.passages || []).find(
              (p) => allowedPassageNumbers.includes(p.passageNumber)
            );
            const firstBlock = firstPassage?.blocks?.[0];
            const firstQ = firstBlock?.questions?.[0];
            if (firstQ) setCurrentQuestion(firstQ.questionOrder);
          } else {
            setError('Không tìm thấy đề thi.');
          }
        }
      } catch {
        if (!cancelled) setError('Lỗi kết nối đến server.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchTest();
    return () => { cancelled = true; };
  }, [testId]);

  // ── Flatten data ────────────────────────────────────────────────────────────
  const { passages, questions } = testData
    ? flattenTestData(testData, allowedPassageNumbers)
    : { passages: [], questions: [] };

  const activePassageContent = passages.find((p) => p.passageNumber === activePassageNum)?.content || '';
  const activeQuestions = questions.filter((q) => q.passageNumber === activePassageNum);
  const answeredOrders = Object.entries(answers)
    .filter(([, v]) => v !== '' && v !== null && v !== undefined)
    .map(([k]) => Number(k));

  const durationMinutes = testData?.duration || 60;

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleAnswer = useCallback((qOrder, value) => {
    setAnswers((prev) => ({ ...prev, [qOrder]: value }));
  }, []);

  const doSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      const res = await attemptService.submitAttempt(testId, {
        answers,
        timeSpent,
        practiceMode,
      });
      if (res.success && res.data?.attemptId) {
        navigate(`/results/${res.data.attemptId}`, { replace: true });
      } else {
        alert('Có lỗi khi nộp bài. Vui lòng thử lại.');
        setSubmitting(false);
        setShowAutoSubmit(false);
      }
    } catch {
      alert('Có lỗi khi nộp bài. Vui lòng thử lại.');
      setSubmitting(false);
      setShowAutoSubmit(false);
    }
  }, [answers, testId, practiceMode, startTime, submitting, navigate]);

  const handleTimeUp = useCallback(() => {
    setShowAutoSubmit(true);
    doSubmit();
  }, [doSubmit]);

  const handleSubmitEarly = useCallback(() => {
    const unanswered = questions.length - answeredOrders.length;
    const msg = unanswered > 0
      ? `Bạn còn ${unanswered} câu chưa trả lời. Bạn có chắc muốn nộp bài?`
      : 'Bạn có chắc muốn nộp bài? Hành động này không thể hoàn tác.';
    if (window.confirm(msg)) {
      setShowAutoSubmit(true);
      doSubmit();
    }
  }, [doSubmit, questions.length, answeredOrders.length]);

  const scrollToQuestion = useCallback((qOrder) => {
    setCurrentQuestion(qOrder);
    const el = document.getElementById(`question-${qOrder}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // ── Render states ───────────────────────────────────────────────────────────
  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 18, color: '#c0392b' }}>{error}</p>
        <button className="btn btn-dark rounded-pill px-4" onClick={() => navigate(-1)}>← Quay lại</button>
      </div>
    );
  }

  return (
    <div id="reading-test-page" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Timer Bar */}
      <TimerBar
        durationMinutes={durationMinutes}
        customTimeLimit={customTimeLimit}
        onTimeUp={handleTimeUp}
        onSubmitEarly={handleSubmitEarly}
        practiceMode={practiceMode}
      />

      {/* Split View */}
      <div className="split-view" style={{ paddingBottom: '80px' }}>
        {/* Left — Passage */}
        <div className="split-left" id="reading-passage-panel">
          <p className="body-sm-strong mb-2" style={{ color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Passage {activePassageNum}
            {passages.find((p) => p.passageNumber === activePassageNum)?.title
              ? ` — ${passages.find((p) => p.passageNumber === activePassageNum).title}` : ''}
          </p>
          {activePassageContent ? (
            <div
              className="body-md"
              style={{ lineHeight: '28px' }}
              dangerouslySetInnerHTML={{ __html: activePassageContent }}
            />
          ) : (
            <p style={{ color: 'var(--mute)', fontStyle: 'italic' }}>Passage chưa có nội dung.</p>
          )}
        </div>

        {/* Right — Questions */}
        <div className="split-right" id="reading-questions-panel" style={{ paddingBottom: '80px' }}>
          {activeQuestions.length === 0 ? (
            <p style={{ color: 'var(--mute)', fontStyle: 'italic' }}>Không có câu hỏi cho passage này.</p>
          ) : (
            activeQuestions.map((q) => {
              const isAnswered = answeredOrders.includes(q.order);
              const isActive = currentQuestion === q.order;

              return (
                <div
                  key={q.id}
                  id={`question-${q.order}`}
                  className="card-content mb-3"
                  style={{
                    border: isActive ? '2px solid var(--ink)' : '2px solid transparent',
                    cursor: 'default',
                  }}
                  onClick={() => setCurrentQuestion(q.order)}
                >
                  {/* Question header */}
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <span
                      className="body-sm-strong d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: 28, height: 28, borderRadius: 'var(--rounded-md)',
                        background: isAnswered ? 'var(--ink)' : 'var(--canvas-soft)',
                        color: isAnswered ? '#fff' : 'var(--ink)',
                        fontSize: 12,
                      }}
                    >
                      {q.order}
                    </span>
                    <span className="badge-difficulty" style={{ fontSize: 11 }}>
                      {q.type === 'mcq' ? 'Multiple Choice' : 'Fill in the blank'}
                    </span>
                  </div>

                  {/* Question text */}
                  {q.text && <p className="body-md-strong mb-3">{q.text}</p>}

                  {/* Answer input */}
                  {q.type === 'mcq' ? (
                    <div className="d-flex flex-column gap-2">
                      {q.options.map((opt) => {
                        // Options stored as {label, text} or plain string
                        const label = typeof opt === 'object' ? (opt.label ?? opt.value ?? '') : String(opt);
                        const text  = typeof opt === 'object' ? (opt.text  ?? opt.label ?? '') : String(opt);
                        const selected = answers[q.order] === label;
                        return (
                          <label
                            key={label}
                            id={`option-${q.order}-${label}`}
                            className={`option-card ${selected ? 'selected' : ''}`}
                            style={{ margin: 0, padding: '12px 16px', alignItems: 'flex-start' }}
                          >
                            <input
                              type="radio"
                              name={`q-${q.order}`}
                              className="form-check-input flex-shrink-0 mt-1"
                              value={label}
                              checked={selected}
                              onChange={() => handleAnswer(q.order, label)}
                            />
                            <span className="body-md-strong flex-shrink-0 mt-1 mx-2">{label}.</span>
                            <span className="body-md mt-1">{text}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      type="text"
                      className="text-input"
                      id={`input-fill-${q.order}`}
                      placeholder="Nhập đáp án..."
                      value={answers[q.order] || ''}
                      onChange={(e) => handleAnswer(q.order, e.target.value)}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="bottom-nav-bar">
        <div className="bottom-nav-tabs">
          {passages.map((passage) => {
            const passNum = passage.passageNumber;
            const isActive = activePassageNum === passNum;
            const partQuestions = questions.filter((q) => q.passageNumber === passNum);
            const answeredInPart = partQuestions.filter((q) => answeredOrders.includes(q.order));

            return (
              <div
                key={passNum}
                className={`bottom-nav-tab ${isActive ? 'active' : ''}`}
                onClick={() => setActivePassageNum(passNum)}
              >
                <span className="fw-bold">Passage {passNum}</span>
                {isActive ? (
                  <div className="d-flex flex-wrap gap-1 ms-2">
                    {partQuestions.map((q) => (
                      <div
                        key={q.id}
                        className={`q-circle ${answeredOrders.includes(q.order) ? 'answered' : ''} ${currentQuestion === q.order ? 'current' : ''}`}
                        title={`Câu ${q.order}`}
                        onClick={(e) => { e.stopPropagation(); scrollToQuestion(q.order); }}
                      >
                        {q.order}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: 'var(--body)', marginLeft: 4, fontSize: 13 }}>
                    : {answeredInPart.length}/{partQuestions.length}
                  </span>
                )}
              </div>
            );
          })}

          {/* Global question count */}
          <div className="ms-auto d-flex align-items-center" style={{ color: 'var(--body)', fontSize: 13, paddingRight: 8 }}>
            {answeredOrders.length}/{questions.length} câu
          </div>
        </div>
      </div>

      {/* Auto Submit Modal (shows during submit) */}
      <AutoSubmitModal isOpen={showAutoSubmit} />
    </div>
  );
}

export default ReadingTestPage;
