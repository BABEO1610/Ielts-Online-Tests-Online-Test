/**
 * ReadingReviewPage.jsx
 * Giao diện xem lại đáp án bài thi Reading, chuẩn format IELTS.
 * - Split-view: Passage bên trái, câu hỏi bên phải (giống lúc làm bài)
 * - Read-only hoàn toàn, không timer, không submit
 * - Highlight Đúng / Sai / Bỏ trống cho từng câu hỏi
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { testService } from '../../services/test.service';
import ReviewQuestionRenderer from '../../components/objective-testing/ReviewQuestionRenderer';
import '../../styles/objective-testing.css';

function flattenTestData(testData) {
  const passages = testData.passages || [];
  const questions = [];

  passages.forEach((passage) => {
    (passage.blocks || []).forEach((block) => {
      const rawType = (block.type || '').toString();
      const normType = rawType.toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_').replace(/[^a-z_]/g, '');

      const mapType = (t) => {
        if (['multiple_choice', 'multiplechoice', 'mcq'].includes(t)) return 'mcq';
        if (['true_false', 'truefalse', 'true_false_ng', 'true_false_not_given'].includes(t)) return 'true_false';
        if (['yes_no', 'yesno', 'yes_no_not_given', 'yes_no_ng'].includes(t)) return 'yes_no';
        if (['fill_blank', 'fill_in_blank', 'sentence_completion', 'summary_completion', 'note_table_flowchart_completion'].includes(t)) return 'fill';
        if (['short_answer', 'shortanswer', 'short_answer_questions'].includes(t)) return 'short';
        return 'fill';
      };

      const blockQType = mapType(normType);

      (block.questions || []).forEach((q) => {
        let options = [];
        if (Array.isArray(q.options)) options = q.options;
        else if (q.options && typeof q.options === 'string') {
          try { options = JSON.parse(q.options); } catch { options = []; }
        }

        questions.push({
          id: q.id,
          order: q.questionOrder,
          passageNumber: passage.passageNumber,
          passageTitle: passage.title || '',
          type: blockQType,
          text: q.text || '',
          options,
        });
      });
    });
  });

  questions.sort((a, b) => a.order - b.order);
  return { passages, questions };
}

function ReadingReviewPage({ attemptDetail }) {
  const navigate = useNavigate();
  const { testId, testTitle, rawScore, totalQuestions, bandScore, answers } = attemptDetail;

  const [testData, setTestData]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activePassageNum, setActivePassageNum] = useState(1);

  // Build a map: questionId → answerDetail for O(1) lookup
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
            const firstPassage = (res.data.passages || [])[0];
            if (firstPassage) setActivePassageNum(firstPassage.passageNumber);
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

  const { passages, questions } = testData ? flattenTestData(testData) : { passages: [], questions: [] };
  const activePassageContent = passages.find((p) => p.passageNumber === activePassageNum)?.content || '';
  const activePassageTitle   = passages.find((p) => p.passageNumber === activePassageNum)?.title || '';
  const activeQuestions = questions.filter((q) => q.passageNumber === activePassageNum);

  const correctCount   = (answers || []).filter(a => a.isCorrect).length;
  const incorrectCount = (answers || []).filter(a => !a.isCorrect && a.userAnswer).length;
  const unansweredCount = (answers || []).filter(a => !a.userAnswer).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: '#000', color: '#fff', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          className="btn btn-sm btn-outline-light rounded-pill"
          onClick={() => navigate(-1)}
        >
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

      {/* Split View */}
      <div className="split-view" style={{ flex: 1, overflow: 'hidden' }}>
        {/* Left — Passage */}
        <div className="split-left" id="review-passage-panel">
          <p className="body-sm-strong mb-2" style={{ color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Passage {activePassageNum}{activePassageTitle ? ` — ${activePassageTitle}` : ''}
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

        {/* Right — Questions (Read-only) */}
        <div className="split-right" id="review-questions-panel" style={{ paddingBottom: 80 }}>
          {activeQuestions.length === 0 ? (
            <p style={{ color: 'var(--mute)', fontStyle: 'italic' }}>Không có câu hỏi cho passage này.</p>
          ) : (
            activeQuestions.map((q) => (
              <ReviewQuestionRenderer
                key={q.id}
                question={q}
                answerDetail={answerMap[q.id]}
              />
            ))
          )}
        </div>
      </div>

      {/* Bottom passage tabs */}
      <div className="bottom-nav-bar">
        <div className="bottom-nav-tabs">
          {passages.map((passage) => {
            const pNum = passage.passageNumber;
            const isActive = activePassageNum === pNum;
            const pQuestions = questions.filter(q => q.passageNumber === pNum);
            const correct = pQuestions.filter(q => answerMap[q.id]?.isCorrect).length;
            return (
              <div
                key={pNum}
                className={`bottom-nav-tab ${isActive ? 'active' : ''}`}
                onClick={() => setActivePassageNum(pNum)}
              >
                <span className="fw-bold">Passage {pNum}</span>
                <span style={{ marginLeft: 6, fontSize: 12, color: isActive ? '#fff' : 'var(--body)' }}>
                  {correct}/{pQuestions.length} đúng
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ReadingReviewPage;
