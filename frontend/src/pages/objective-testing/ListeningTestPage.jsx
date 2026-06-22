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
import React, { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import TimerBar from '../../components/objective-testing/TimerBar';
import AutoSubmitModal from '../../components/objective-testing/AutoSubmitModal';
import ReviewModal from '../../components/objective-testing/ReviewModal';
import { testService } from '../../services/test.service';
import '../../styles/objective-testing.css';

function renderBlockContent(content) {
  if (!content) return null;
  const isImageUrl = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(content.trim());
  if (isImageUrl) {
    return <img src={content.trim()} alt="Diagram / Map" className="img-fluid rounded border mb-2" style={{ maxHeight: '400px', display: 'block', margin: '10px auto' }} />;
  }
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}

function ListeningTestPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const practiceMode = location.state?.practiceMode || false;
  const customTimeLimit = location.state?.customTimeLimit || null;
  const selectedPartIds = location.state?.selectedPartIds || ['s1', 's2', 's3', 's4'];

  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [activeSection, setActiveSection] = useState('Section 1');
  const [showAutoSubmit, setShowAutoSubmit] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Fetch test data
  useEffect(() => {
    let mounted = true;
    const fetchTest = async () => {
      setLoading(true);
      setError(null); // Clear previous errors
      try {
        const response = await testService.getTestForStudent(id);
        if (!mounted) return; // Prevent StrictMode race condition

        if (response && response.data) {
          setTestData(response.data);
          // Set first active section
          if (response.data.sections && response.data.sections.length > 0) {
            setActiveSection(`Section ${response.data.sections[0].sectionNumber || 1}`);
          }
        } else {
          setError('Không thể tải dữ liệu bài thi');
        }
      } catch (err) {
        if (mounted) setError('Đã có lỗi xảy ra');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (id) fetchTest();
    return () => { mounted = false; };
  }, [id]);

  const handleAnswer = useCallback((qOrder, value) => {
    setAnswers((prev) => ({ ...prev, [qOrder]: value }));
  }, []);

  const answeredQuestions = Object.keys(answers)
    .filter((k) => answers[k] !== '')
    .map(Number);

  const submitTest = useCallback(async (isAutoSubmit = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    // In real app, calculate time spent
    const timeSpentSeconds = customTimeLimit ? customTimeLimit * 60 : 30 * 60; // Mock calculation

    try {
      const result = await testService.submitObjectiveTest(id, { answers, timeSpentSeconds });
      if (result && result.success) {
        navigate(`/results/${result.data.attemptId}`, { replace: true });
      } else {
        alert('Có lỗi xảy ra khi nộp bài');
        setIsSubmitting(false);
        if (isAutoSubmit) setShowAutoSubmit(false); // allow retry
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi nộp bài');
      setIsSubmitting(false);
      if (isAutoSubmit) setShowAutoSubmit(false);
    }
  }, [answers, id, navigate, isSubmitting, customTimeLimit]);

  const handleTimeUp = useCallback(() => {
    setShowAutoSubmit(true);
    // Wait briefly for modal to show, then submit
    setTimeout(() => submitTest(true), 2000);
  }, [submitTest]);

  const handleSubmitEarly = useCallback(() => {
    if (window.confirm('Bạn có chắc chắn muốn nộp bài?')) {
      submitTest(false);
    }
  }, [submitTest]);

  const scrollToQuestion = useCallback((qNum) => {
    if (!testData || !testData.sections) return;
    
    // Find which section this question belongs to
    let targetSectionName = null;
    for (const s of testData.sections) {
      const hasQ = (s.blocks || []).some(b => 
        (b.questions || []).some(q => q.questionOrder === qNum)
      );
      if (hasQ) {
        targetSectionName = `Section ${s.sectionNumber}`;
        break;
      }
    }

    if (targetSectionName) {
      setActiveSection(targetSectionName);
      setCurrentQuestion(qNum);
      
      // Delay slightly to let React render the new active section
      setTimeout(() => {
        const el = document.getElementById(`lq-${qNum}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }, [testData]);

  /* Format questions from testData */
  const allQuestions = [];
  if (testData && testData.sections) {
    testData.sections.forEach(s => {
      const sName = `Section ${s.sectionNumber}`;
      (s.blocks || []).forEach(b => {
        (b.questions || []).forEach(q => {
          allQuestions.push({
            id: q.id,
            order: q.questionOrder,
            section: sName,
            type: b.type || 'Question',
            text: q.text,
            options: q.options || [],
            blockType: b.type,
            blockOptions: b.options || []
          });
        });
      });
    });
  }

  const allowedSections = practiceMode ? selectedPartIds.map(partId => `Section ${partId.replace('s', '')}`) : ['Section 1', 'Section 2', 'Section 3', 'Section 4'];
  const filteredQuestions = allQuestions.filter(q => allowedSections.includes(q.section));

  /* Group by section */
  const sections = filteredQuestions.reduce((acc, q) => {
    if (!acc[q.section]) acc[q.section] = [];
    acc[q.section].push(q);
    return acc;
  }, {});

  if (loading) return <div className="text-center py-5">Đang tải bài thi...</div>;
  if (error) return <div className="text-center py-5 text-danger">{error}</div>;

  return (
    <div id="listening-test-page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Timer */}
      <TimerBar durationMinutes={30} customTimeLimit={customTimeLimit} onTimeUp={handleTimeUp} onSubmitEarly={handleSubmitEarly} practiceMode={practiceMode} onReview={() => setIsReviewOpen(true)} />

      {/* Sticky Audio Player */}
      <div className="audio-player-sticky" id="audio-player">
        <div className="container" style={{ maxWidth: 900 }}>
          <div className="d-flex align-items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--ink)" stroke="none">
              <path d="M12 3v18l-7-5H2V8h3l7-5zm10 9a8 8 0 01-2.3 5.7l-1.4-1.4A6 6 0 0020 12a6 6 0 00-1.7-4.3l1.4-1.4A8 8 0 0122 12zm-4 0a4 4 0 01-1.2 2.8l-1.4-1.4A2 2 0 0016 12a2 2 0 00-.6-1.4l1.4-1.4A4 4 0 0118 12z"/>
            </svg>
            <span className="body-sm-strong">Listening Audio — {testData?.title}</span>
          </div>
          <audio
            controls
            id="audio-element"
            style={{ marginTop: 8 }}
            src={testData?.audioUrl || "/audio/sample-listening.mp3"}
          >
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
            {testData && testData.sections && testData.sections.find(s => `Section ${s.sectionNumber}` === activeSection) && (
              <div className="mb-4 pb-5">
                <h5 className="display-sm mb-4" style={{ borderBottom: '2px solid var(--ink)', paddingBottom: 8, display: 'inline-block' }}>
                  {activeSection.replace('Section', 'Part')}
                </h5>
                {testData.sections.find(s => `Section ${s.sectionNumber}` === activeSection).blocks.map((b, blockIdx) => {
                  const blockQuestions = b.questions || [];
                  if (blockQuestions.length === 0) return null;

                  return (
                    <div key={b.id || blockIdx} className="test-block mb-5">
                      {b.content && (
                        <div className="block-content mb-4 p-3 bg-light rounded shadow-sm">
                          {renderBlockContent(b.content)}
                        </div>
                      )}

                      {b.type === 'Matching' && blockQuestions[0]?.options && blockQuestions[0].options.length > 0 && (
                        <div className="matching-options mb-4 p-3 border rounded bg-white shadow-sm">
                          <h6 className="mb-3 text-muted">Options:</h6>
                          <ul className="list-unstyled mb-0 d-flex flex-wrap gap-3">
                            {blockQuestions[0].options.map((opt, i) => (
                              <li key={opt.id || i} className="p-2 border rounded" style={{ minWidth: '120px', background: 'var(--canvas-soft)' }}>
                                <strong>{String.fromCharCode(65 + i)}</strong>. {typeof opt === 'object' ? opt.text : opt}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {blockQuestions.map((q) => {
                        const qOrder = q.questionOrder;
                        const isMcq = (b.type === 'multiple_choice' || b.type === 'Multiple Choice');
                        const isMatching = (b.type === 'Matching');

                        return (
                          <div
                            key={q.id}
                            id={`lq-${qOrder}`}
                            className="card-content mb-3"
                            style={{
                              border: currentQuestion === qOrder ? '2px solid var(--ink)' : '2px solid transparent',
                            }}
                            onClick={() => setCurrentQuestion(qOrder)}
                          >
                            <div className="d-flex align-items-center gap-2 mb-3">
                              <span style={{
                                width: 28, height: 28, borderRadius: 'var(--rounded-md)',
                                background: answeredQuestions.includes(qOrder) ? 'var(--ink)' : 'var(--canvas-soft)',
                                color: answeredQuestions.includes(qOrder) ? '#fff' : 'var(--ink)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 12, fontWeight: 700,
                              }}>
                                {qOrder}
                              </span>
                              <span className="badge-difficulty" style={{ fontSize: 11 }}>
                                {b.type || 'Question'}
                              </span>
                            </div>
                            <p className="body-md-strong mb-3">{q.text}</p>

                            {isMcq ? (
                              <div className="d-flex flex-column gap-2">
                                {(q.options || []).map((opt, i) => {
                                  const val = opt.label || String.fromCharCode(65 + i);
                                  return (
                                  <label
                                    key={val}
                                    className={`option-card ${answers[qOrder] === val ? 'selected' : ''}`}
                                    id={`l-option-${qOrder}-${val}`}
                                    style={{ margin: 0, padding: '12px 16px', alignItems: 'flex-start' }}
                                  >
                                    <input
                                      type="radio"
                                      name={`lq-${qOrder}`}
                                      className="form-check-input flex-shrink-0 mt-1"
                                      value={val}
                                      checked={answers[qOrder] === val}
                                      onChange={() => handleAnswer(qOrder, val)}
                                      style={{ margin: 0 }}
                                    />
                                    <span className="body-md-strong flex-shrink-0 mt-1" style={{ minWidth: 24 }}>{val}.</span>
                                    <span className="body-md mt-1">{typeof opt === 'object' ? opt.text : opt}</span>
                                  </label>
                                )})}
                              </div>
                            ) : isMatching ? (
                              <select
                                className="form-select w-100"
                                id={`l-input-${qOrder}`}
                                value={answers[qOrder] || ''}
                                onChange={(e) => handleAnswer(qOrder, e.target.value)}
                                style={{ maxWidth: '300px' }}
                              >
                                <option value="">-- Select an option --</option>
                                {(q.options || []).map((opt, i) => {
                                  const val = String.fromCharCode(65 + i);
                                  return (
                                    <option key={val} value={val}>{val}. {typeof opt === 'object' ? opt.text : opt}</option>
                                  );
                                })}
                              </select>
                            ) : (
                              <input
                                type="text"
                                className="text-input w-100"
                                id={`l-input-${qOrder}`}
                                placeholder="Type your answer..."
                                value={answers[qOrder] || ''}
                                onChange={(e) => handleAnswer(qOrder, e.target.value)}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
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

      {/* Review Modal */}
      <ReviewModal 
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        questions={allQuestions}
        answers={answers}
        currentQuestion={currentQuestion}
        onNavigate={scrollToQuestion}
      />
    </div>
  );
}

export default ListeningTestPage;
