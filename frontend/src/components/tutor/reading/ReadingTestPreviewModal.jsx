import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cleanInstructionText } from '../../../utils/questionParser';

// ─── Preview Question Renderers ─────────────────────────────────────────────

function PreviewMultipleChoice({ question, qNum, answers, onAnswer }) {
  const selected = answers[qNum] || [];
  const isMulti = question.correctAnswers && question.correctAnswers.length > 1;

  const toggle = (optId) => {
    if (isMulti) {
      const next = selected.includes(optId)
        ? selected.filter(x => x !== optId)
        : [...selected, optId];
      onAnswer(qNum, next);
    } else {
      onAnswer(qNum, [optId]);
    }
  };

  const optionsList = Array.isArray(question.options) ? question.options : (question.options?.choices || []);

  return (
    <div className="mb-4">
      <p className="fw-semibold mb-2" style={{ fontSize: '0.95rem' }}>
        <span className="me-2" style={{ background: '#111', color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{qNum}</span>
        {question.questionText || question.text || question.prompt || question.statement || ''}
      </p>
      {optionsList.map((opt, idx) => {
        const isSelected = selected.includes(opt.id || opt.label);
        const optLabel = opt.label || String.fromCharCode(65 + idx);
        return (
          <div key={opt.id || opt.label}
            className={`option-card ${isSelected ? 'selected' : ''}`}
            onClick={() => toggle(opt.id || opt.label)}
            style={{ cursor: 'pointer' }}
          >
            <span className="fw-bold me-2" style={{ minWidth: 20 }}>{optLabel}.</span>
            <span>{opt.text}</span>
          </div>
        );
      })}
    </div>
  );
}

function PreviewTrueFalse({ question, qNum, answers, onAnswer }) {
  const selected = answers[qNum] || '';
  const opts = ['TRUE', 'FALSE', 'NOT GIVEN'];

  return (
    <div className="mb-4 d-flex align-items-start">
      <span className="me-3 mt-1" style={{ background: '#111', color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{qNum}</span>
      <select 
        className="form-select form-select-sm me-3" 
        style={{ width: '130px', flexShrink: 0 }}
        value={selected}
        onChange={(e) => onAnswer(qNum, e.target.value)}
      >
        <option value="">-- Select --</option>
        {opts.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <div style={{ fontSize: '0.95rem', paddingTop: '2px' }}>
        {question.questionText || question.text || question.prompt || question.statement || ''}
      </div>
    </div>
  );
}

function PreviewYesNo({ question, qNum, answers, onAnswer }) {
  const selected = answers[qNum] || '';
  const opts = ['YES', 'NO', 'NOT GIVEN'];

  return (
    <div className="mb-4 d-flex align-items-start">
      <span className="me-3 mt-1" style={{ background: '#111', color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{qNum}</span>
      <select 
        className="form-select form-select-sm me-3" 
        style={{ width: '130px', flexShrink: 0 }}
        value={selected}
        onChange={(e) => onAnswer(qNum, e.target.value)}
      >
        <option value="">-- Select --</option>
        {opts.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <div style={{ fontSize: '0.95rem', paddingTop: '2px' }}>
        {question.questionText || question.text || question.prompt || question.statement || ''}
      </div>
    </div>
  );
}

function PreviewMatching({ question, qNum, answers, onAnswer, poolOptions, qType }) {
  const selected = answers[qNum] || '';
  
  let options = poolOptions || [];
  if (options.length === 0) {
    if (qType === 'MATCHING_HEADINGS') {
      options = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'].map(v => ({ id: v, text: `Heading ${v}` }));
    } else {
      options = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(v => ({ id: v, text: `Paragraph/Option ${v}` }));
    }
  }

  return (
    <div className="mb-4">
      <p className="fw-semibold mb-2" style={{ fontSize: '0.95rem' }}>
        <span className="me-2" style={{ background: '#111', color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{qNum}</span>
        {question.questionText || question.text || question.prompt || question.statement || ''}
      </p>
      <select
        className="form-select form-select-sm"
        style={{ maxWidth: 240 }}
        value={selected}
        onChange={e => onAnswer(qNum, e.target.value)}
      >
        <option value="">-- Select --</option>
        {options.map((opt, idx) => (
          <option key={opt.id || idx} value={opt.id || opt.text}>
            {poolOptions && poolOptions.length > 0 ? `${String.fromCharCode(65 + idx)}. ` : ''}{opt.text}
          </option>
        ))}
      </select>
    </div>
  );
}

function PreviewCompletion({ question, qNum, answers, onAnswer }) {
  const val = answers[qNum] || '';
  return (
    <div className="mb-4">
      <p className="fw-semibold mb-2" style={{ fontSize: '0.95rem' }}>
        <span className="me-2" style={{ background: '#111', color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{qNum}</span>
        {question.questionText || question.text || question.prompt || question.statement || <em>Answer:</em>}
      </p>
      <input
        type="text"
        className="form-control form-control-sm"
        style={{ maxWidth: 300 }}
        placeholder="Type your answer..."
        value={val}
        onChange={e => onAnswer(qNum, e.target.value)}
      />
    </div>
  );
}

function PreviewMultiSelectMulti({ block, startNum, answers, onAnswer }) {
  const questions = block.questions || [];
  const maxSelections = questions[0]?.options?.maxSelections || questions.length;
  const poolOptions = questions[0]?.options?.choices || [];
  
  // Collect answers for this group
  // To keep backend compatibility, we map them back to individual question orders.
  // The answer for question 18, 19, etc.
  const getQNum = (q, idx) => q.questionOrder || (startNum + idx);
  const selectedAnswers = questions.map((q, idx) => answers[getQNum(q, idx)]).filter(Boolean);

  const handleToggle = (val) => {
    let newSelected = [...selectedAnswers];
    if (newSelected.includes(val)) {
      newSelected = newSelected.filter(v => v !== val);
    } else {
      if (newSelected.length < maxSelections) {
        newSelected.push(val);
      } else {
        return; // Max reached
      }
    }
    
    // Sort selected answers to maintain order
    newSelected.sort();
    
    // Map them back to the individual questions
    questions.forEach((q, idx) => {
      onAnswer(getQNum(q, idx), newSelected[idx] || '');
    });
  };

  return (
    <div className="mb-4">
      <div className="mb-3 ps-3 border-start border-3 p-2 text-sm" style={{ background: '#fafafa', borderColor: '#ccc' }}>
        {poolOptions.map((choice, cIdx) => (
          <div key={cIdx} className="form-check mb-2">
            <input 
              className="form-check-input" 
              type="checkbox" 
              id={`preview_mc_multi_${block.rangeStart}_${choice.label}`}
              checked={selectedAnswers.includes(choice.label)}
              onChange={() => handleToggle(choice.label)}
              disabled={!selectedAnswers.includes(choice.label) && selectedAnswers.length >= maxSelections}
              style={{ cursor: 'pointer' }}
            />
            <label className="form-check-label" htmlFor={`preview_mc_multi_${block.rangeStart}_${choice.label}`} style={{ cursor: 'pointer' }}>
              <strong>{choice.label}.</strong> {choice.text}
            </label>
          </div>
        ))}
      </div>
      <div className="text-muted" style={{ fontSize: '0.8rem' }}>
        Selected: {selectedAnswers.length} / {maxSelections}
      </div>
    </div>
  );
}

// ─── Block Renderer ──────────────────────────────────────────────────────────

function PreviewBlock({ block, answers, onAnswer, startNum }) {
  const questions = block.questions || [];
  const qType = block.questionType || block.type;

  const MATCHING_TYPES = ['Matching Headings', 'Matching Information', 'Matching Features', 'Matching Sentence Endings', 'MATCHING_HEADINGS', 'MATCHING_INFORMATION', 'MATCHING_FEATURES', 'MATCHING_SENTENCE_ENDINGS'];
  const TRUE_FALSE_TYPES = ['True/False/Not Given', 'TRUE_FALSE_NOT_GIVEN'];
  const YES_NO_TYPES = ['Yes/No/Not Given', 'YES_NO_NOT_GIVEN'];
  const COMPLETION_TYPES = ['Sentence Completion', 'Summary Completion', 'Note/Table/Flow-chart Completion', 'Diagram Label Completion', 'Short-answer Questions', 'SENTENCE_COMPLETION', 'SUMMARY_COMPLETION', 'NOTE_COMPLETION', 'SHORT_ANSWER_QUESTIONS'];

  const rawInstruction = block.instruction || block.groupInstruction || questions[0]?.options?.groupInstruction || '';
  const instructionText = cleanInstructionText(rawInstruction, block.rangeStart);

  return (
    <div className="mb-5">
      {qType && (
        <div className="mb-3 p-2 rounded" style={{ background: '#f5f5f5', borderLeft: '3px solid #111' }}>
          <p className="mb-0 fw-semibold" style={{ fontSize: '0.85rem', color: '#333' }}>
            {qType} — Questions {block.range || '?'}
          </p>
        </div>
      )}
      {instructionText && (
        <div className="mb-4" style={{ fontSize: '0.95rem', fontStyle: 'italic', color: '#444', whiteSpace: 'pre-wrap' }}>
          {instructionText}
        </div>
      )}
      {questions[0]?.options?.tfngLegend && (
        <div className="mb-4 p-3 bg-light border rounded">
          {questions[0].options.tfngLegend.map((leg, i) => (
            <div key={i} className="d-flex mb-1" style={{ fontSize: '0.9rem' }}>
              <div className="fw-bold" style={{ width: '100px' }}>{leg.label}</div>
              <div>{leg.text}</div>
            </div>
          ))}
        </div>
      )}
      {qType === 'MULTIPLE_CHOICE_MULTI' ? (
        <PreviewMultiSelectMulti block={block} startNum={startNum} answers={answers} onAnswer={onAnswer} />
      ) : (
        questions.map((q, idx) => {
          const qNum = q.questionOrder || (startNum + idx);
          if (TRUE_FALSE_TYPES.includes(qType)) {
            return <PreviewTrueFalse key={q.id || idx} question={q} qNum={qNum} answers={answers} onAnswer={onAnswer} />;
          } else if (YES_NO_TYPES.includes(qType)) {
            return <PreviewYesNo key={q.id || idx} question={q} qNum={qNum} answers={answers} onAnswer={onAnswer} />;
          } else if (MATCHING_TYPES.includes(qType)) {
            return <PreviewMatching key={q.id || idx} question={q} qNum={qNum} answers={answers} onAnswer={onAnswer} poolOptions={q.options?.choices || block.options?.choices || block.options} qType={qType} />;
          } else if (COMPLETION_TYPES.includes(qType)) {
            return <PreviewCompletion key={q.id || idx} question={q} qNum={qNum} answers={answers} onAnswer={onAnswer} />;
          } else {
            // Default: multiple choice
            return <PreviewMultipleChoice key={q.id || idx} question={q} qNum={qNum} answers={answers} onAnswer={onAnswer} />;
          }
        })
      )}
    </div>
  );
}

// ─── Main Modal ──────────────────────────────────────────────────────────────

function ReadingTestPreviewModal({ formData, passages, onClose }) {
  const [activePassageIdx, setActivePassageIdx] = useState(0);
  const [answers, setAnswers] = useState({});

  const handleAnswer = (qNum, val) => {
    setAnswers(prev => ({ ...prev, [qNum]: val }));
  };

  // Compute starting question number for each passage & block
  const computeStartNums = () => {
    let counter = 1;
    return passages.map(p => {
      const passageStart = counter;
      const blockStarts = (p.blocks || []).map(b => {
        const bs = counter;
        counter += (b.questions || []).length;
        return bs;
      });
      return { passageStart, blockStarts };
    });
  };
  const startNums = computeStartNums();

  const activePassage = passages[activePassageIdx];
  const activeStartNums = startNums[activePassageIdx];

  // Count answered questions
  const totalQ = passages.reduce((sum, p) => sum + p.blocks.reduce((s, b) => s + (b.questions || []).length, 0), 0);
  const answeredQ = Object.keys(answers).length;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex', flexDirection: 'column'
      }}
    >
      {/* ── Header Bar ── */}
      <div style={{
        background: '#111', color: '#fff',
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1 }}>Preview Mode</span>
          <h5 className="mb-0 mt-1" style={{ fontWeight: 700 }}>{formData.title || 'Untitled Test'}</h5>
        </div>
        <div className="d-flex align-items-center gap-3">
          <span style={{ fontSize: 13, opacity: 0.7 }}>
            {answeredQ}/{totalQ} answered
          </span>
          <div style={{
            background: '#fff2', borderRadius: 20,
            padding: '4px 16px', fontSize: 13
          }}>
            {formData.duration || 60} min
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff', borderRadius: 8, padding: '6px 14px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13
            }}
          >
            <X size={14} /> Close Preview
          </button>
        </div>
      </div>

      {/* ── Passage Tabs ── */}
      <div style={{
        background: '#1a1a1a',
        padding: '0 24px',
        display: 'flex', gap: 4, flexShrink: 0
      }}>
        {passages.map((p, idx) => (
          <button
            key={p.id}
            onClick={() => setActivePassageIdx(idx)}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activePassageIdx === idx ? '3px solid #fff' : '3px solid transparent',
              color: activePassageIdx === idx ? '#fff' : 'rgba(255,255,255,0.5)',
              fontWeight: activePassageIdx === idx ? 700 : 400,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            Passage {idx + 1}
            {p.blocks.length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.6 }}>
                ({p.blocks.reduce((s, b) => s + (b.questions || []).length, 0)}Q)
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Split View Body ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: '#fafafa' }}>
        {/* LEFT: Passage */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '32px 40px',
          borderRight: '1px solid #e5e5e5',
          background: '#fff'
        }}>
          {activePassage ? (
            <>
              {activePassage.instruction && (
                <div className="mb-4 p-3 rounded" style={{ background: '#fffbe6', border: '1px solid #fde68a', fontSize: 14 }}>
                  {activePassage.instruction}
                </div>
              )}
              {activePassage.title && (
                <h2 style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: 16 }}>
                  {activePassage.title}
                </h2>
              )}
              {activePassage.content ? (
                <div style={{
                  fontSize: '1rem',
                  lineHeight: 1.85,
                  color: '#222',
                  whiteSpace: 'pre-wrap'
                }}>
                  {activePassage.content}
                </div>
              ) : (
                <div style={{
                  padding: 40, textAlign: 'center',
                  color: '#aaa', border: '2px dashed #ddd',
                  borderRadius: 12, marginTop: 24
                }}>
                  <p style={{ fontSize: 32, marginBottom: 8 }}>📄</p>
                  <p>Passage content not entered yet.</p>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* RIGHT: Questions */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '32px 40px',
          background: '#fafafa'
        }}>
          {activePassage && (activePassage.blocks || []).length > 0 ? (
            (activePassage.blocks).map((block, bIdx) => (
              <PreviewBlock
                key={block.id || bIdx}
                block={block}
                answers={answers}
                onAnswer={handleAnswer}
                startNum={activeStartNums.blockStarts[bIdx]}
              />
            ))
          ) : (
            <div style={{
              padding: 60, textAlign: 'center',
              color: '#aaa'
            }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>📝</p>
              <p>No question blocks added to this passage yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer Bar ── */}
      <div style={{
        background: '#fff',
        borderTop: '1px solid #e5e5e5',
        padding: '12px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <button
          disabled={activePassageIdx === 0}
          onClick={() => setActivePassageIdx(i => i - 1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 20px', border: '1px solid #ddd',
            borderRadius: 8, background: '#fff', cursor: activePassageIdx === 0 ? 'not-allowed' : 'pointer',
            opacity: activePassageIdx === 0 ? 0.4 : 1, fontSize: 14
          }}
        >
          <ChevronLeft size={16} /> Previous Passage
        </button>

        <span style={{ fontSize: 13, color: '#888' }}>
          Passage {activePassageIdx + 1} of {passages.length}
        </span>

        <button
          disabled={activePassageIdx === passages.length - 1}
          onClick={() => setActivePassageIdx(i => i + 1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 20px', border: '1px solid #ddd',
            borderRadius: 8, background: '#fff', cursor: activePassageIdx === passages.length - 1 ? 'not-allowed' : 'pointer',
            opacity: activePassageIdx === passages.length - 1 ? 0.4 : 1, fontSize: 14
          }}
        >
          Next Passage <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default ReadingTestPreviewModal;
