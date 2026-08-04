/**
 * ListeningReviewPage.jsx
 * Giao diện xem lại đáp án bài thi Listening, chuẩn format IELTS.
 * - Audio Player sticky ở trên cùng (không khóa tua, phục vụ review)
 * - Câu hỏi theo từng Section, Read-only
 * - Highlight Đúng / Sai / Bỏ trống cho từng câu
 * - Không timer, không submit
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { testService } from '../../services/test.service';
import ReviewQuestionRenderer from '../../components/objective-testing/ReviewQuestionRenderer';
import '../../styles/objective-testing.css';

function ListeningReviewPage({ attemptDetail }) {
  const navigate = useNavigate();
  const { testId, testTitle, rawScore, totalQuestions, bandScore, answers } = attemptDetail;

  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState(null);

  // Map: questionId → answerDetail
  const answerMap = {};
  (answers || []).forEach((a) => { answerMap[a.questionId] = a; });

  useEffect(() => {
    let cancelled = false;
    const fetchTest = async () => {
      try {
        const res = await testService.getTestById(testId);
        if (!cancelled) {
          if (res.success && res.data) {
            setTestData(res.data);
            const firstSection = (res.data.sections || [])[0];
            if (firstSection) setActiveSection(`Section ${firstSection.sectionNumber || 1}`);
          } else {
            setError('Không thể tải nội dung đề thi.');
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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner-border text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <p style={{ color: '#c0392b', fontSize: 18 }}>{error}</p>
        <button className="btn btn-dark rounded-pill px-4" onClick={() => navigate(-1)}>← Quay lại</button>
      </div>
    );
  }

  const sections = testData?.sections || [];

  // Flatten all questions for stats
  const allQuestions = [];
  sections.forEach(s => {
    (s.blocks || []).forEach(b => {
      (b.questions || []).forEach(q => {
        const rawType = (b.type || '').toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_').replace(/[^a-z_]/g, '');
        let type = 'fill';
        if (['multiple_choice', 'multiplechoice', 'mcq'].includes(rawType)) type = 'mcq';
        else if (['true_false', 'truefalse', 'true_false_ng', 'yes_no_not_given'].includes(rawType)) type = 'true_false';
        else if (['short_answer', 'shortanswer'].includes(rawType)) type = 'short';

        let options = [];
        if (Array.isArray(q.options)) options = q.options;
        else if (q.options && typeof q.options === 'string') {
          try { options = JSON.parse(q.options); } catch { options = []; }
        }

        allQuestions.push({
          id: q.id,
          order: q.questionOrder,
          section: `Section ${s.sectionNumber}`,
          type,
          text: q.text || '',
          options,
          blockContent: b.content || null,
        });
      });
    });
  });

  const correctCount = (answers || []).filter(a => a.isCorrect).length;
  const incorrectCount = (answers || []).filter(a => !a.isCorrect && a.userAnswer).length;
  const unansweredCount = (answers || []).filter(a => !a.userAnswer).length;

  const activeSectionData = sections.find(s => `Section ${s.sectionNumber}` === activeSection);
  const activeQuestions = allQuestions.filter(q => q.section === activeSection);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: '#000', color: '#fff', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button className="btn btn-sm btn-outline-light rounded-pill" onClick={() => navigate(-1)}>
          ← Kết quả
        </button>
        <span className="body-md-strong" style={{ color: '#fff' }}>Xem lại đáp án — {testTitle}</span>
        <div className="ms-auto d-flex gap-3" style={{ fontSize: 13 }}>
          <span style={{ color: '#86efac' }}>✓ {correctCount} Đúng</span>
          <span style={{ color: '#fca5a5' }}>✗ {incorrectCount} Sai</span>
          {unansweredCount > 0 && <span style={{ color: '#d1d5db' }}>— {unansweredCount} Bỏ trống</span>}
          {bandScore != null && !isNaN(bandScore) && (
            <span style={{ color: '#fde68a', fontWeight: 700 }}>Band {bandScore.toFixed(1)}</span>
          )}
        </div>
      </div>

      {/* Audio Player sticky — review mode, no restrictions */}
      <div className="audio-player-sticky" id="review-audio-player">
        <div className="container" style={{ maxWidth: 900 }}>
          <div className="d-flex align-items-center gap-3 mb-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--ink)">
              <path d="M12 3v18l-7-5H2V8h3l7-5zm10 9a8 8 0 01-2.3 5.7l-1.4-1.4A6 6 0 0020 12a6 6 0 00-1.7-4.3l1.4-1.4A8 8 0 0122 12zm-4 0a4 4 0 01-1.2 2.8l-1.4-1.4A2 2 0 0016 12a2 2 0 00-.6-1.4l1.4-1.4A4 4 0 0118 12z" />
            </svg>
            <span className="body-sm-strong">Nghe lại Audio — {testData?.title}</span>
            <span className="badge bg-secondary ms-1" style={{ fontSize: 10 }}>Review Mode</span>
          </div>
          <audio
            controls
            id="review-audio-element"
            src={testData?.audioUrl || ''}
            style={{ width: '100%' }}
          >
            Your browser does not support the audio element.
          </audio>
        </div>
      </div>

      {/* Questions */}
      <div className="container py-4" style={{ maxWidth: 900, paddingBottom: 100 }}>
        {activeQuestions.length === 0 ? (
          <p className="text-muted fst-italic">Không có câu hỏi cho section này.</p>
        ) : (
          <>
            <h5 className="display-sm mb-4" style={{ borderBottom: '2px solid var(--ink)', paddingBottom: 8, display: 'inline-block' }}>
              {activeSection?.replace('Section', 'Part')}
            </h5>

            {/* Block-level content (diagrams, notes) */}
            {activeSectionData?.blocks?.map((b, bIdx) => {
              const blockQs = allQuestions.filter(q => q.section === activeSection && (b.questions || []).some(bq => bq.id === q.id));
              
              // Check if content is actually a JSON array (sometimes wrapped in <p> tags by the DB/scraper)
              let isRawJson = false;
              if (b.content) {
                const textOnly = b.content.replace(/<[^>]*>?/gm, '').trim();
                // If it starts with [ and contains "type", it's the raw JSON question payload.
                // We avoid JSON.parse because HTML entities (like &nbsp;) might cause it to throw.
                if (textOnly.startsWith('[') && textOnly.includes('"type"')) {
                  isRawJson = true;
                }
              }

              return (
                <div key={b.id || bIdx} className="mb-5">
                  {b.content && !isRawJson && (
                    <div className="mb-4 p-3 bg-light rounded shadow-sm">
                      <div dangerouslySetInnerHTML={{ __html: b.content }} />
                    </div>
                  )}
                  {blockQs.map((q) => (
                    <ReviewQuestionRenderer
                      key={q.id}
                      question={q}
                      answerDetail={answerMap[q.id]}
                    />
                  ))}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Bottom Section tabs */}
      <div className="bottom-nav-bar">
        <div className="bottom-nav-tabs">
          {sections.map((s) => {
            const sName = `Section ${s.sectionNumber}`;
            const isActive = activeSection === sName;
            const sQs = allQuestions.filter(q => q.section === sName);
            const correct = sQs.filter(q => answerMap[q.id]?.isCorrect).length;
            return (
              <div
                key={sName}
                className={`bottom-nav-tab ${isActive ? 'active' : ''}`}
                onClick={() => setActiveSection(sName)}
              >
                <span className="fw-bold">Part {s.sectionNumber}</span>
                <span style={{ marginLeft: 6, fontSize: 12, color: isActive ? '#fff' : 'var(--body)' }}>
                  {correct}/{sQs.length} đúng
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ListeningReviewPage;
