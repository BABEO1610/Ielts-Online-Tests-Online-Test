/**
 * ListeningTestPage.jsx — Task 4.2.3 + Task 4.2.4
 * Trang thi Listening
 * 
 * Player âm thanh cố định trên cùng (position-sticky), bên dưới là câu hỏi.
 * Dùng sticky-top cho thanh audio, container cho danh sách câu hỏi.
 * Render MCQ (Radio btn) và Fill-in-blank (Text input).
 * 
 * Design: Uber-inspired — sticky audio player, clean question cards.
 * 
 * (ListeningTestPage là Container Component: Trái tim điều phối State.
 * Nắm giữ Global State của bài thi (answers, testData, activeSection).
 * Audio Sticky: Gắn chặt Component AudioPlayer lên đỉnh màn hình.
 * Bottom Navigation: Hiển thị 4 Part.
 * Submit Flow: Tính thời gian thực tế bằng Math.round((Date.now() - startTime) / 1000).)
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import TimerBar from '../../components/objective-testing/TimerBar';
import AutoSubmitModal from '../../components/objective-testing/AutoSubmitModal';
import ReviewModal from '../../components/objective-testing/ReviewModal';
import ListeningBlockRenderer from '../../components/tutor/listening/ListeningBlockRenderer';
import { testService } from '../../services/test.service';
import { attemptService } from '../../services/attempt.service';
import '../../styles/objective-testing.css';

function renderBlockContent(content) {
  if (!content) return null;
  const isImageUrl = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(content.trim());
  if (isImageUrl) {
    return <img src={content.trim()} alt="Diagram / Map" className="img-fluid rounded border mb-2" style={{ maxHeight: '400px', display: 'block', margin: '10px auto' }} />;
  }
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}

// ─── AudioPlayer ──────────────────────────────────────────────────────────────────────────────
/**
 * Mode-aware audio player.
 * Simulation (practiceMode=false): auto-play on mount, no controls at all.
 *   Guards: seeking → revert to lastTime; pause → force resume.
 * Practice (practiceMode=true): play/pause + rewind 10s + seek bar.
 */
function AudioPlayer({ src, practiceMode }) {
  const audioRef = useRef(null);
  const lastTimeRef = useRef(0); // ponytail: track last safe time to guard seek
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Cơ chế "Chống tua" (Anti-Seeking): Lưu lại cái neo thời gian hợp lệ cuối cùng mỗi khi file chạy bình thường
    const onTimeUpdate = () => { lastTimeRef.current = audio.currentTime; setCurrentTime(audio.currentTime); };
    const onLoaded = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);

    // Lớp phòng thủ 1: Cơ chế "Chống dừng" (Anti-Pause)
    // Bắt tín hiệu pause. Nếu đang thi thật, lập tức gọi play() ép chạy tiếp, phá mánh khóe dừng băng.
    const onPause = () => {
      setIsPlaying(false);
      // Simulation guard: resume immediately if paused (tab-switch, devtools, etc.)
      if (!practiceMode) audio.play().catch(() => { });
    };

    // Lớp phòng thủ 2: Cơ chế "Chống tua" (Anti-Seeking)
    // Bắt tín hiệu tua. Nếu đang thi thật, lấy mỏ neo (lastTimeRef) gán ngược lại, ép file giật ngược về vị trí cũ.
    const onSeeking = () => {
      // Simulation guard: revert any seek attempt
      if (!practiceMode) audio.currentTime = lastTimeRef.current;
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('seeking', onSeeking);

    // Chế độ thi thật (Simulation Mode): Bắt đầu chạy ngay lập tức khi vào phòng thi
    if (!practiceMode) audio.play().catch(() => { }); // auto-play for simulation

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('seeking', onSeeking);
    };
  }, [practiceMode]);

  return (
    <div style={{ marginTop: 8 }}>
      <audio ref={audioRef} src={src} style={{ display: 'none' }} />
      {practiceMode ? (
        // Practice: full controls
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <button
            className="btn btn-sm btn-outline-secondary rounded-pill px-3"
            onClick={() => { const a = audioRef.current; if (a) a.currentTime = Math.max(0, a.currentTime - 10); }}
            title="Rewind 10 seconds"
          >
            ⏮ 10s
          </button>
          <button
            className="btn btn-sm btn-dark rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: 36, height: 36, padding: 0, fontSize: 16 }}
            onClick={() => { const a = audioRef.current; if (!a) return; isPlaying ? a.pause() : a.play(); }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <input
            type="range" min={0} max={duration || 0} step={0.5} value={currentTime}
            onChange={(e) => { const a = audioRef.current; if (a) a.currentTime = Number(e.target.value); }}
            style={{ flex: 1, minWidth: 120, accentColor: '#000' }}
          />
          <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: 'var(--mute)' }}>
            {fmt(currentTime)} / {fmt(duration)}
          </span>
        </div>
      ) : (
        // Lớp phòng thủ 3: Thiết kế theo dạng "Vỏ bọc tàng hình" (Display-only UI)
        // Trong chế độ thi thật, thẻ audio bị giấu hoàn toàn, chỉ hiển thị HTML giả (dấu chấm đỏ nhấp nháy chữ Playing).
        // Simulation: display-only — no controls whatsoever
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <span
            className="d-inline-flex align-items-center gap-2 rounded-pill px-3 py-1"
            style={{ background: '#fee2e2', color: '#991b1b', fontSize: 13, fontWeight: 600 }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block',
              animation: 'audioPulse 1.5s ease-in-out infinite'
            }} />
            Playing
          </span>
          <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', color: 'var(--mute)' }}>
            {fmt(currentTime)}{duration > 0 ? ` / ${fmt(duration)}` : ''}
          </span>
          <span style={{ fontSize: 12, color: 'var(--mute)', fontStyle: 'italic' }}>
            Audio will play once — listen carefully
          </span>
          <style>{`@keyframes audioPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }`}</style>
        </div>
      )}
    </div>
  );
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
  const [startTime] = useState(Date.now());

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

    // Tính thời gian thực tế user đã làm bài
    const timeSpentSeconds = Math.round((Date.now() - startTime) / 1000);

    try {
      const result = await attemptService.submitAttempt(id, { answers, timeSpent: timeSpentSeconds, practiceMode });
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
              <path d="M12 3v18l-7-5H2V8h3l7-5zm10 9a8 8 0 01-2.3 5.7l-1.4-1.4A6 6 0 0020 12a6 6 0 00-1.7-4.3l1.4-1.4A8 8 0 0122 12zm-4 0a4 4 0 01-1.2 2.8l-1.4-1.4A2 2 0 0016 12a2 2 0 00-.6-1.4l1.4-1.4A4 4 0 0118 12z" />
            </svg>
            <span className="body-sm-strong">Listening Audio — {testData?.title}</span>
          </div>
          <AudioPlayer
            src={testData?.audioUrl || "/audio/sample-listening.mp3"}
            practiceMode={practiceMode}
          />
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
                    <ListeningBlockRenderer
                      key={b.id || blockIdx}
                      block={b}
                      answers={answers}
                      onAnswer={handleAnswer}
                      answeredQuestions={answeredQuestions}
                      currentQuestion={currentQuestion}
                      onQuestionClick={setCurrentQuestion}
                    />
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
