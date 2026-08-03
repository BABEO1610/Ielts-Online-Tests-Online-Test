/**
 * ReadingTestPage.jsx — /tests/:id/reading
 *
 * Giao diện chia đôi màn hình: trái = nội dung đoạn văn, phải = câu hỏi.
 * Dữ liệu lấy từ GET /api/v1/tests/:id (testService.getTestById).
 * Nộp bài: POST /api/v1/tests/:id/attempts (attemptService.submitAttempt).
 *
 * Cấu trúc dữ liệu trả về từ backend (test.service.js getTestById):
 *   test.passages[]
 *     .passageNumber (int)
 *     .title (string)
 *     .content (text/html)
 *     .blocks[]
 *       .type  (loại câu hỏi: 'multiple_choice' | 'fill_blank' | ...)
 *       .range (string, ví dụ: "1-13")
 *       .questions[]
 *         .id
 *         .questionOrder (int)
 *         .options (JSONB — mảng { label, text } hoặc string[])
 *         .correctAnswer
 *         .correctAnswers
 * 
 * (ReadingTestPage là Container Component: trung tâm điều phối State & Layout.
 * Kết nối API để lấy đề thi, quản lý State (answers, activePassage) và nộp bài.
 * Data Parser: Dùng hàm flattenTestData để chuẩn hóa dữ liệu JSON từ backend.
 * Giao diện chia đôi: bên trái hiển thị nội dung đoạn văn, bên phải hiển thị câu hỏi.
 * Thanh điều hướng dưới: chuyển đổi Passage dựa trên trạng thái activePassage)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import TimerBar from '../../components/objective-testing/TimerBar';
import AutoSubmitModal from '../../components/objective-testing/AutoSubmitModal';
import ReviewModal from '../../components/objective-testing/ReviewModal';
import { testService } from '../../services/test.service';
import { attemptService } from '../../services/attempt.service';
import '../../styles/objective-testing.css';

// ─── Hàm tiện ích ────────────────────────────────────────────────────────────
/**
 * Parse JSON array câu hỏi legacy từ block.content hoặc q.text.
 * Format: [{"qNum":N, "qText":"..."}, ...] hoặc [{"questionNum":N, "questionText":"..."}]
 * Trả về Map<questionOrder, text> nếu là JSON legacy, null nếu là HTML thông thường.
 */
function parseJsonQArray(str) {
  if (!str) return null;
  const trimmed = str.trimStart();
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(str);
    if (!Array.isArray(parsed)) return null;
    // Kiểm tra có phải mảng câu hỏi không (có qNum/questionNum)
    const hasQNum = parsed.some((item) => item && (item.qNum != null || item.questionNum != null));
    if (!hasQNum) return null;
    const map = {};
    parsed.forEach((item) => {
      if (!item) return;
      const num = item.qNum ?? item.questionNum;
      if (num != null) map[num] = item.qText || item.questionText || item.text || '';
    });
    return map;
  } catch {
    return null;
  }
}
/**
 * Làm phẳng danh sách passages + questions từ cấu trúc dữ liệu API thực tế.
 * Trả về { passages (đã lọc), questions (phẳng, sắp xếp theo questionOrder) }
 * (Hàm flattenTestData: Data Parser để phân tách và chuẩn hóa dữ liệu JSON từ Backend)
 */
function flattenTestData(testData, allowedPassageNumbers) {
  const allPassages = testData.passages || [];
  const passages = allPassages.filter((p) =>
    allowedPassageNumbers.includes(p.passageNumber)
  );

  const questions = [];

  passages.forEach((passage) => {
    (passage.blocks || []).forEach((block) => {
      // question_type từ backend có thể lưu ở nhiều định dạng khác nhau (chuẩn hóa hoặc dạng đọc được).
      // Chuẩn hóa về dạng máy đọc, sau đó ánh xạ sang các kiểu dùng trong UI.
      const rawType = (block.type || '').toString();
      const normType = rawType.toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_').replace(/[^a-z_]/g, '');

      const mapToQType = (t) => {
        if (!t) return 'fill';
        if (['multiple_choice', 'multiplechoice', 'mcq', 'single_choice', 'singlechoice'].includes(t)) return 'mcq';
        if (['multiple_choice_multiple', 'multiple_choice_multipleanswer', 'multiple_choice_multiplechoice', 'multiplechoice_multiple'].includes(t)) return 'mcq_multi';
        if (['true_false', 'truefalse', 'true_false_ng', 'true_false_not_given'].includes(t)) return 'true_false';
        if (['yes_no', 'yesno', 'yes_no_not_given', 'yes_no_ng'].includes(t)) return 'yes_no';
        if (['fill_blank', 'fill_in_blank', 'fillblank', 'sentence_completion', 'summary_completion', 'note_table_flowchart_completion'].includes(t)) return 'fill';
        if (['matching_headings', 'matching_information', 'matching', 'match_the_following'].includes(t)) return 'matching';
        if (['short_answer', 'shortanswer', 'short', 'short_answer_questions'].includes(t)) return 'short';
        return 'fill';
      };

      const blockQType = mapToQType(normType);
      // Debug: hỗ trợ chẩn đoán lỗi ánh xạ kiểu câu hỏi trên browser console
      try {
        // eslint-disable-next-line no-console
        console.debug(`[ReadingTestPage] passage=${passage.passageNumber} rawType="${rawType}" normType="${normType}" mapped="${blockQType}"`);
      } catch (err) {
        // bỏ qua
      }

      // block.content: HTML hợp lệ thì dùng làm blockHtmlContent,
      // còn nếu là JSON array câu hỏi legacy → dùng làm legacyQTextMap, không render HTML
      const legacyFromBlock = parseJsonQArray(block.content);
      const blockHtmlContent = legacyFromBlock ? null : (block.content || null);
      const legacyQTextMap = legacyFromBlock || {};

      (block.questions || []).forEach((q, qIdx) => {
        // Chuẩn hóa options: backend lưu dạng JSONB (mảng {label,text} hoặc chuỗi thông thường)
        let options = [];
        if (Array.isArray(q.options)) {
          options = q.options;
        } else if (q.options && typeof q.options === 'string') {
          try { options = JSON.parse(q.options); } catch { options = []; }
        }

        // q.text có thể là JSON array (do backend getQuestionText fallback sang block.content)
        // → parse lấy text đúng theo questionOrder, fallback sang legacyQTextMap từ block.content
        const legacyFromQText = parseJsonQArray(q.text);
        const qText = legacyFromQText
          ? (legacyFromQText[q.questionOrder] || legacyQTextMap[q.questionOrder] || '')
          : (q.text || legacyQTextMap[q.questionOrder] || '');

        questions.push({
          id: q.id,
          order: q.questionOrder, // khớp với tên field từ backend
          passageNumber: passage.passageNumber,
          blockId: block.id,
          // blockContent chỉ được render phía trên câu hỏi đầu tiên của mỗi block (chỉ khi là HTML, không phải JSON)
          blockContent: qIdx === 0 ? blockHtmlContent : null,
          type: blockQType,
          text: qText,
          options,
        });
      });
    });
  });

  questions.sort((qa, qb) => qa.order - qb.order);
  return { passages, questions };
}

// ─── Skeleton tải trang ──────────────────────────────────────────────────────
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

// ─── Component chính ─────────────────────────────────────────────────────────
function ReadingTestPage() {
  const { id: testId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // State được truyền từ ReadingPage qua navigate()
  const practiceMode = location.state?.practiceMode || false;
  const customTimeLimit = location.state?.customTimeLimit || null;
  const selectedPartIds = location.state?.selectedPartIds || null; // ví dụ: ['p1','p2','p3']

  // Các số thứ tự passage sẽ hiển thị (selectedPartIds = ['p1','p2'] → [1,2])
  const allowedPassageNumbers = selectedPartIds
    ? selectedPartIds.map((pid) => parseInt(pid.replace('p', ''), 10))
    : [1, 2, 3];

  // ── Khai báo State ─────────────────────────────────────────────────────────
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [answers, setAnswers] = useState({});         // { [questionOrder]: string }
  const [currentQuestion, setCurrentQuestion] = useState(null);       // thứ tự câu hỏi đang được làm nổi bật
  const [activePassageNum, setActivePassageNum] = useState(allowedPassageNumbers[0]);
  const [mobileTab, setMobileTab] = useState('passage');  // 'passage' | 'questions'
  const [showAutoSubmit, setShowAutoSubmit] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [startTime] = useState(Date.now());


  // ── Lấy dữ liệu đề thi ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const fetchTest = async () => {
      try {
        setLoading(true);
        // ponytail: dùng endpoint /take để đáp án được loại bỏ ở phía server
        const res = await testService.getTestForStudent(testId);
        if (!cancelled) {
          if (res.success && res.data) {
            setTestData(res.data);
            // Đặt câu hỏi mặc định là câu đầu tiên
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

  // ── Làm phẳng dữ liệu ───────────────────────────────────────────────────────
  let passages = [], questions = [];
  try {
    if (testData) ({ passages, questions } = flattenTestData(testData, allowedPassageNumbers));
  } catch (e) {
    // ponytail: bắt tất cả lỗi để tránh trang trắng khi cấu trúc dữ liệu từ backend bất ngờ thay đổi
    console.error('[ReadingTestPage] flattenTestData failed:', e);
  }

  const activePassageContent = passages.find((p) => p.passageNumber === activePassageNum)?.content || '';
  const activeQuestions = questions.filter((q) => q.passageNumber === activePassageNum);
  const answeredOrders = Object.entries(answers)
    .filter(([, v]) => v !== '' && v !== null && v !== undefined)
    .map(([k]) => Number(k));

  const durationMinutes = testData?.duration || 60;

  // ── Các hàm xử lý sự kiện ──────────────────────────────────────────────────
  const handleAnswer = useCallback((qOrder, value) => {
    setAnswers((prev) => ({ ...prev, [qOrder]: value }));
  }, []);

  const handleToggleMulti = useCallback((qOrder, optionValue) => {
    setAnswers((prev) => {
      const existing = Array.isArray(prev[qOrder]) ? [...prev[qOrder]] : [];
      const idx = existing.indexOf(optionValue);
      if (idx === -1) existing.push(optionValue); else existing.splice(idx, 1);
      return { ...prev, [qOrder]: existing };
    });
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

  // ── Các trạng thái render ───────────────────────────────────────────────────
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
      {/* Thanh đếm thời gian */}
      <TimerBar
        durationMinutes={durationMinutes}
        customTimeLimit={customTimeLimit}
        onTimeUp={handleTimeUp}
        onSubmitEarly={handleSubmitEarly}
        onReview={() => setShowReview(true)}
        practiceMode={practiceMode}
      />

      {/* Mobile Tab Switcher */}
      <div className="d-flex d-md-none bg-white border-bottom p-2 gap-2 sticky-top" style={{ top: 56, zIndex: 1020 }}>
        <button
          className={`btn btn-sm flex-fill rounded-pill ${mobileTab === 'passage' ? 'btn-dark' : 'btn-outline-dark'}`}
          onClick={() => setMobileTab('passage')}
        >
          📖 Bài đọc (P{activePassageNum})
        </button>
        <button
          className={`btn btn-sm flex-fill rounded-pill ${mobileTab === 'questions' ? 'btn-dark' : 'btn-outline-dark'}`}
          onClick={() => setMobileTab('questions')}
        >
          ✍️ Câu hỏi ({activeQuestions.length})
        </button>
      </div>

      {/* Giao diện chia đôi màn hình */}
      <div className="split-view" style={{ paddingBottom: '80px' }}>
        {/* Bên trái — Nội dung đoạn văn */}
        <div className={`split-left ${mobileTab === 'passage' ? 'd-block' : 'd-none d-md-block'}`} id="reading-passage-panel">
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

        {/* Bên phải — Câu hỏi */}
        <div className={`split-right ${mobileTab === 'questions' ? 'd-block' : 'd-none d-md-block'}`} id="reading-questions-panel" style={{ paddingBottom: '80px' }}>
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
                  {/* Tiêu đề `câu hỏi */}
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
                      {(() => {
                        const typeLabels = {
                          'mcq': 'Multiple Choice',
                          'mcq_multi': 'Multiple Answer',
                          'true_false': 'True/False/Not Given',
                          'matching': 'Matching',
                          'short': 'Short Answer',
                          'fill': 'Fill in the blank'
                        };
                        return typeLabels[q.type] || 'Fill in the blank';
                      })()}
                    </span>
                  </div>

                  {/* Nội dung block: hình ảnh / biểu đồ được nhúng trong block này */}
                  {q.blockContent && (
                    <div
                      className="mb-3"
                      dangerouslySetInnerHTML={{ __html: q.blockContent }}
                    />
                  )}

                  {/* Nội dung câu hỏi */}
                  {q.text && <p className="body-md-strong mb-3">{q.text}</p>}

                  {/* Ô nhập đáp án */}
                  {q.type === 'mcq' && (
                    <div className="d-flex flex-column gap-2">
                      {q.options.map((opt, i) => {
                        // Options lưu dạng {label, text} hoặc chuỗi thông thường
                        const label = typeof opt === 'object' ? (opt.label ?? String.fromCharCode(65 + i)) : String.fromCharCode(65 + i);
                        const text = typeof opt === 'object' ? (opt.text ?? opt.label ?? String(opt)) : String(opt);
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
                  )}

                  {q.type === 'mcq_multi' && (
                    <div className="d-flex flex-column gap-2">
                      {q.options.map((opt, i) => {
                        const label = typeof opt === 'object' ? (opt.label ?? String.fromCharCode(65 + i)) : String.fromCharCode(65 + i);
                        const text = typeof opt === 'object' ? (opt.text ?? opt.label ?? String(opt)) : String(opt);
                        const selected = Array.isArray(answers[q.order]) && answers[q.order].includes(label);
                        return (
                          <label key={label} className={`option-card ${selected ? 'selected' : ''}`} style={{ margin: 0, padding: '12px 16px', alignItems: 'flex-start' }}>
                            <input type="checkbox" className="form-check-input flex-shrink-0 mt-1" value={label} checked={selected} onChange={() => handleToggleMulti(q.order, label)} />
                            <span className="body-md-strong flex-shrink-0 mt-1 mx-2">{label}.</span>
                            <span className="body-md mt-1">{text}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {q.type === 'true_false' && (
                    <div className="d-flex flex-column gap-2">
                      {(() => {
                        // Lưu giá trị thực tế ('TRUE', 'FALSE', 'NOT GIVEN') để khớp với correctAnswer trong DB
                        const opts = [
                          { label: 'A', text: 'True', value: 'TRUE' },
                          { label: 'B', text: 'False', value: 'FALSE' },
                          { label: 'C', text: 'Not Given', value: 'NOT GIVEN' },
                        ];
                        return opts.map(({ label, text, value }) => {
                          const selected = answers[q.order] === value;
                          return (
                            <label key={value} className={`option-card ${selected ? 'selected' : ''}`} style={{ margin: 0, padding: '12px 16px', alignItems: 'flex-start' }}>
                              <input type="radio" name={`q-${q.order}`} className="form-check-input flex-shrink-0 mt-1" value={value} checked={selected} onChange={() => handleAnswer(q.order, value)} />
                              <span className="body-md-strong flex-shrink-0 mt-1 mx-2">{label}.</span>
                              <span className="body-md mt-1">{text}</span>
                            </label>
                          );
                        });
                      })()}
                    </div>
                  )}

                  {q.type === 'yes_no' && (
                    <div className="d-flex flex-column gap-2">
                      {(() => {
                        // Lưu 'YES', 'NO', 'NOT GIVEN' để khớp với định dạng correctAnswer trong DB
                        const opts = [
                          { label: 'A', text: 'Yes', value: 'YES' },
                          { label: 'B', text: 'No', value: 'NO' },
                          { label: 'C', text: 'Not Given', value: 'NOT GIVEN' },
                        ];
                        return opts.map(({ label, text, value }) => {
                          const selected = answers[q.order] === value;
                          return (
                            <label key={value} className={`option-card ${selected ? 'selected' : ''}`} style={{ margin: 0, padding: '12px 16px', alignItems: 'flex-start' }}>
                              <input type="radio" name={`q-${q.order}`} className="form-check-input flex-shrink-0 mt-1" value={value} checked={selected} onChange={() => handleAnswer(q.order, value)} />
                              <span className="body-md-strong flex-shrink-0 mt-1 mx-2">{label}.</span>
                              <span className="body-md mt-1">{text}</span>
                            </label>
                          );
                        });
                      })()}
                    </div>
                  )}

                  {q.type === 'matching' && (
                    <div className="d-flex flex-column gap-2">
                      {/* Nếu options không có cấu trúc left/right, hiển thị dạng dropdown đơn giản */}
                      {!(Array.isArray(q.options) && q.options.length > 0 && typeof q.options[0] === 'object' && (q.options[0].left || q.options[0].right)) && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <select
                            value={answers[q.order] || ''}
                            onChange={(e) => handleAnswer(q.order, e.target.value)}
                            style={{ minWidth: 150 }}
                          >
                            <option value="">Chọn...</option>
                            {Array.isArray(q.options) && q.options.map((opt, i) => {
                              const text = typeof opt === 'object' ? (opt.text || opt.label || `Option ${i + 1}`) : String(opt);
                              return <option key={i} value={text}>{text}</option>;
                            })}
                          </select>
                        </div>
                      )}
                      {/* Nếu options có cấu trúc left/right, hiển thị dạng ghép cặp */}
                      {(Array.isArray(q.options) && q.options.length > 0 && typeof q.options[0] === 'object' && (q.options[0].left || q.options[0].right)) && (
                        <div className="d-flex flex-column gap-2">
                          {q.options.map((pair, idx) => {
                            const left = pair.left || pair.a || `Item ${idx + 1}`;
                            const rightOptions = q.options.map((p) => p.right || p.b || '');
                            const selected = answers[`${q.order}-${idx}`] || '';
                            return (
                              <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>{left}</div>
                                <select value={selected} onChange={(e) => handleAnswer(`${q.order}-${idx}`, e.target.value)}>
                                  <option value="">Chọn...</option>
                                  {rightOptions.map((ro, i) => <option key={i} value={ro}>{ro}</option>)}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {q.type === 'short' && (
                    <input type="text" className="text-input" placeholder="Short answer..." value={answers[q.order] || ''} onChange={(e) => handleAnswer(q.order, e.target.value)} />
                  )}

                  {/* Fallback về ô nhập văn bản tự do cho các kiểu câu hỏi còn lại */}
                  {['fill'].includes(q.type) && (
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

      {/* Thanh điều hướng dưới màn hình */}
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

          {/* Tổng số câu hỏi đã trả lời */}
          <div className="ms-auto d-flex align-items-center" style={{ color: 'var(--body)', fontSize: 13, paddingRight: 8 }}>
            {answeredOrders.length}/{questions.length} câu
          </div>
        </div>
      </div>

      {/* Modal tự động nộp bài (hiện khi đang nộp) */}
      <AutoSubmitModal isOpen={showAutoSubmit} />

      {/* Modal xem lại — tổng quan câu hỏi đã/chưa trả lời */}
      <ReviewModal
        isOpen={showReview}
        onClose={() => setShowReview(false)}
        questions={questions.map((q) => ({ ...q, passage: `Passage ${q.passageNumber}` }))}
        answers={answers}
        onNavigate={(qOrder) => {
          // Chuyển tab passage nếu câu hỏi thuộc passage khác
          const target = questions.find((q) => q.order === qOrder);
          if (target) setActivePassageNum(target.passageNumber);
          scrollToQuestion(qOrder);
        }}
      />
    </div>
  );
}

export default ReadingTestPage;
