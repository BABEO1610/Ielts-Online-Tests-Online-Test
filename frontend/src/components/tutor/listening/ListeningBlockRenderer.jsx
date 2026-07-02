import React from 'react';

// Normalizes type to handle both backend constants and UI labels
const normalizeType = (type) => {
  const t = String(type || '').toUpperCase();
  if (t.includes('MULTIPLE_CHOICE_MULTI')) return 'MULTIPLE_CHOICE_MULTI';
  if (t.includes('MULTIPLE CHOICE')) return 'MULTIPLE_CHOICE';
  if (t.includes('SENTENCE COMPLETION') || t.includes('SENTENCE_COMPLETION')) return 'SENTENCE_COMPLETION';
  if (t.includes('FORM COMPLETION') || t.includes('FORM_COMPLETION')) return 'FORM_COMPLETION';
  if (t.includes('NOTES_COMPLETION')) return 'NOTES_COMPLETION';
  if (t.includes('NOTE') || t.includes('TABLE') || t.includes('FLOW-CHART')) return 'NOTE_COMPLETION';
  if (t.includes('MATCHING')) return 'MATCHING';
  if (t.includes('TRUE_FALSE') || t.includes('YES_NO')) return 'TRUE_FALSE';
  return 'UNKNOWN';
};

const renderHtmlContent = (content) => {
  if (!content) return null;
  const isImageUrl = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(content.trim());
  if (isImageUrl) {
    return <img src={content.trim()} alt="Listening Context" className="img-fluid rounded border mb-2" style={{ maxHeight: '400px', display: 'block', margin: '10px auto' }} />;
  }
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
};

function splitInlineText(text) {
  if (!text) return { parts: [], hasBlank: false };
  // Search for 5 or more underscores or [1], [2] patterns
  const blankRegex = /(_{3,}|\[\d+\])/;
  const parts = text.split(blankRegex);
  const hasBlank = parts.length > 1;
  return { parts, hasBlank, regex: blankRegex };
}

function ListeningBlockRenderer({ block, answers, onAnswer, answeredQuestions = [], currentQuestion = null, onQuestionClick = null }) {
  const questions = block.questions || [];
  if (questions.length === 0) return null;

  const nType = normalizeType(block.type);
  const instruction = block.instruction || block.groupInstruction || (questions[0] && questions[0].options && questions[0].options.groupInstruction) || '';
  const range = block.groupRange || block.range || (questions.length > 1 ? `${questions[0].questionOrder}-${questions[questions.length - 1].questionOrder}` : `${questions[0].questionOrder}`);
  const title = block.blockTitle || block.type || 'Questions';

  const isForm = nType === 'FORM_COMPLETION' || (block.content && block.content.toUpperCase().includes('DETAILS'));

  const renderInstruction = () => {
    if (!instruction) return null;
    return (
      <div className="mb-4" style={{ fontSize: '0.95rem', fontStyle: 'italic', color: '#444', whiteSpace: 'pre-wrap' }}>
        {instruction}
      </div>
    );
  };

  const renderHeader = () => (
    <div className="mb-3 p-2 rounded" style={{ background: '#f5f5f5', borderLeft: '3px solid #111' }}>
      <p className="mb-0 fw-semibold" style={{ fontSize: '0.85rem', color: '#333' }}>
        {title.replace(/_/g, ' ')} — Questions {range}
      </p>
    </div>
  );

  const getQNum = (q) => q.questionOrder || q.id;

  const getHighlightStyle = (qNum) => {
    if (currentQuestion === qNum) {
      return { border: '2px solid var(--ink, #111)', borderRadius: '8px', padding: '12px', background: '#fff' };
    }
    return { border: '2px solid transparent', borderRadius: '8px', padding: '12px', background: '#fff' };
  };

  const handleWrapperClick = (qNum) => {
    if (onQuestionClick) onQuestionClick(qNum);
  };

  const renderMultipleChoiceMulti = () => {
    // Determine max selections
    const q0 = questions[0];
    let maxSelections = questions.length;
    if (q0?.options && !Array.isArray(q0.options) && q0.options.maxSelections) {
      maxSelections = q0.options.maxSelections;
    } else if (q0?.questionNumbers && q0.questionNumbers.length > 0) {
      maxSelections = q0.questionNumbers.length;
    }
    const choices = Array.isArray(q0?.options) ? q0.options : (q0?.options?.choices || []);
    
    // Aggregate selected values
    const selectedAnswers = [];
    let qNums = questions[0].questionNumbers;
    if (!qNums || qNums.length === 0) {
      if (maxSelections > 1) {
        qNums = Array.from({ length: maxSelections }, (_, i) => getQNum(questions[0]) + i);
      } else {
        qNums = questions.map(getQNum);
      }
    }
    
    qNums.forEach(qNum => {
      const val = answers[qNum];
      if (val) {
        if (val.includes(',')) {
          selectedAnswers.push(...val.split(',').map(s => s.trim()).filter(Boolean));
        } else {
          selectedAnswers.push(val);
        }
      }
    });

    const handleToggle = (val) => {
      let newSelected = [...selectedAnswers];
      if (newSelected.includes(val)) {
        newSelected = newSelected.filter(v => v !== val);
      } else {
        if (newSelected.length < maxSelections) {
          newSelected.push(val);
        } else {
          return; // max reached
        }
      }
      newSelected.sort();
      
      // Map back to questions sequentially
      qNums.forEach((qNum, idx) => {
        onAnswer(qNum, newSelected[idx] || '');
      });
    };

    // For multi-choice, the block itself acts as the question group
    const firstQNum = getQNum(questions[0]);
    return (
      <div className="mb-4" style={getHighlightStyle(firstQNum)} onClick={() => handleWrapperClick(firstQNum)}>
        {questions[0]?.questionText && (
          <p className="fw-semibold mb-3">{questions[0].questionText}</p>
        )}
        <div className="ps-3 border-start border-3 p-2 text-sm" style={{ background: '#fafafa', borderColor: '#ccc' }}>
          {choices.map((choice, cIdx) => (
            <div key={cIdx} className="form-check mb-2">
              <input 
                className="form-check-input" 
                type="checkbox" 
                id={`mc_multi_${block.id}_${choice.label}`}
                checked={selectedAnswers.includes(choice.label)}
                onChange={() => handleToggle(choice.label)}
                disabled={!selectedAnswers.includes(choice.label) && selectedAnswers.length >= maxSelections}
                style={{ cursor: 'pointer' }}
              />
              <label className="form-check-label" htmlFor={`mc_multi_${block.id}_${choice.label}`} style={{ cursor: 'pointer' }}>
                <strong>{choice.label}.</strong> {choice.text}
              </label>
            </div>
          ))}
        </div>
        <div className="text-muted mt-2" style={{ fontSize: '0.8rem' }}>
          Selected: {selectedAnswers.length} / {maxSelections}
        </div>
      </div>
    );
  };

  const renderSentenceCompletion = () => {
    const renderQuestionLine = (qNum, qText, qId) => {
      const { parts, hasBlank, regex } = splitInlineText(qText);
      const val = answers[qNum] || '';
      return (
        <div key={qId || qNum} className="mb-3 d-flex align-items-start gap-2" id={`lq-${qNum}`} style={getHighlightStyle(qNum)} onClick={() => handleWrapperClick(qNum)}>
          <span className="badge rounded-pill mt-1 flex-shrink-0" style={{
              width: 24, height: 24, 
              background: answeredQuestions.includes(qNum) ? 'var(--ink, #111)' : 'var(--canvas-soft, #f8f9fa)',
              color: answeredQuestions.includes(qNum) ? '#fff' : 'var(--ink, #111)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid #dee2e6'
            }}>
            {qNum}
          </span>
          <div style={{ fontSize: '0.95rem', lineHeight: '1.8' }}>
            {!hasBlank ? (
              <>
                <span className="me-2">{qText}</span>
                <input
                  type="text"
                  className="form-control form-control-sm d-inline-block"
                  style={{ width: 'auto', minWidth: '150px' }}
                  value={val}
                  onChange={(e) => onAnswer(qNum, e.target.value)}
                />
              </>
            ) : (
              parts.map((part, idx) => {
                if (part.match(regex)) {
                  return (
                    <input
                      key={idx}
                      type="text"
                      className="form-control form-control-sm d-inline-block mx-2"
                      style={{ width: 'auto', minWidth: '150px', textAlign: 'center' }}
                      value={val}
                      onChange={(e) => onAnswer(qNum, e.target.value)}
                    />
                  );
                }
                return <span key={idx}>{part}</span>;
              })
            )}
          </div>
        </div>
      );
    };

    let contentRows = block.contentRows;
    if (!contentRows && block.content && block.content.startsWith('[')) {
      try {
        contentRows = JSON.parse(block.content);
      } catch(e) {}
    }

    if (contentRows && contentRows.length > 0) {
      return (
        <div className="mb-4 p-4 border rounded shadow-sm bg-white">
          <div className="d-flex flex-column">
            {contentRows.map((row, idx) => {
              if (row.type === 'text') {
                 const isTitle = row.text.toUpperCase() === row.text && row.text.length > 3 && !row.text.includes('.');
                 if (isTitle) {
                    return <div key={idx} className="mb-3 mt-2 fw-bold" style={{ textTransform: 'uppercase', fontSize: '1rem', color: '#333' }}>{row.text}</div>;
                 }
                 return <div key={idx} className="mb-2" style={{ lineHeight: '1.6', fontSize: '0.95rem' }}>{row.text}</div>;
              } else if (row.type === 'question') {
                 return renderQuestionLine(row.qNum, row.qText || '', `content-${idx}`);
              }
              return null;
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="mb-4">
        {questions.map((q) => {
          const qNum = getQNum(q);
          const qText = q.text || q.questionText || '';
          return renderQuestionLine(qNum, qText, q.id);
        })}
      </div>
    );
  };

  const renderFormCompletion = () => {
    return (
      <div className="mb-4 p-4 border rounded shadow-sm bg-white" style={{ fontFamily: 'monospace' }}>
        {block.formRows ? (
          <div className="d-flex flex-column gap-3">
            {block.formRows.map((row, idx) => {
              if (row.isTitle) {
                return (
                  <div key={idx} className="mb-3 mt-2 text-center fw-bold" style={{ textTransform: 'uppercase', borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>
                    {row.text}
                  </div>
                );
              }
              if (row.questionNumber) {
                const qNum = row.questionNumber;
                const val = answers[qNum] || '';
                return (
                  <div key={idx} className="d-flex align-items-center gap-3 pb-2" id={`lq-${qNum}`} style={getHighlightStyle(qNum)} onClick={() => handleWrapperClick(qNum)}>
                    <div className="col-sm-4 fw-bold p-0">{row.label}</div>
                    <div className="col-sm-8 p-0 d-flex align-items-center gap-2">
                      <span className="badge rounded-pill flex-shrink-0" style={{
                          width: 24, height: 24, 
                          background: answeredQuestions.includes(qNum) ? 'var(--ink, #111)' : 'var(--canvas-soft, #f8f9fa)',
                          color: answeredQuestions.includes(qNum) ? '#fff' : 'var(--ink, #111)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid #dee2e6'
                        }}>
                        {qNum}
                      </span>
                      <input
                        type="text"
                        className="form-control flex-grow-1"
                        style={{ background: '#f5f5f5', border: 'none', borderBottom: '2px solid #333', borderRadius: 0 }}
                        value={val}
                        onChange={(e) => onAnswer(qNum, e.target.value)}
                      />
                    </div>
                  </div>
                );
              }
              return (
                <div key={idx} className="d-flex align-items-center gap-3 pb-2" style={{ padding: '12px', border: '2px solid transparent', borderRadius: '8px' }}>
                  <div className="col-sm-4 fw-bold p-0">{row.label}</div>
                  <div className="col-sm-8 p-0">
                    <span>{row.value || ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {block.content && (
              <div className="mb-4 text-center fw-bold" style={{ textTransform: 'uppercase', borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>
                {renderHtmlContent(block.content)}
              </div>
            )}
            {questions.map(q => {
              const qNum = getQNum(q);
              const qText = q.text || q.questionText || '';
              const { parts, hasBlank, regex } = splitInlineText(qText);
              const val = answers[qNum] || '';
              
              return (
                <div key={q.id} className="d-flex align-items-center gap-3 pb-2" id={`lq-${qNum}`} style={getHighlightStyle(qNum)} onClick={() => handleWrapperClick(qNum)}>
                  <span className="badge rounded-pill flex-shrink-0" style={{
                      width: 24, height: 24, 
                      background: answeredQuestions.includes(qNum) ? 'var(--ink, #111)' : 'var(--canvas-soft, #f8f9fa)',
                      color: answeredQuestions.includes(qNum) ? '#fff' : 'var(--ink, #111)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid #dee2e6'
                    }}>
                    {qNum}
                  </span>
                  <div className="flex-grow-1" style={{ fontSize: '1rem' }}>
                     {!hasBlank ? (
                        <div className="row w-100 m-0">
                          <div className="col-sm-4 fw-bold d-flex align-items-center p-0">{qText}</div>
                          <div className="col-sm-8 p-0">
                            <input
                              type="text"
                              className="form-control"
                              style={{ background: '#f5f5f5', border: 'none', borderBottom: '2px solid #333', borderRadius: 0 }}
                              value={val}
                              onChange={(e) => onAnswer(qNum, e.target.value)}
                            />
                          </div>
                        </div>
                      ) : (
                        parts.map((part, idx) => {
                          if (part.match(regex)) {
                            return (
                              <input
                                key={idx}
                                type="text"
                                className="form-control d-inline-block mx-2 px-2"
                                style={{ width: 'auto', minWidth: '200px', background: '#f5f5f5', border: 'none', borderBottom: '2px solid #333', borderRadius: 0 }}
                                value={val}
                                onChange={(e) => onAnswer(qNum, e.target.value)}
                              />
                            );
                          }
                          return <span key={idx} className="fw-bold">{part}</span>;
                        })
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderGeneric = () => {
    return (
      <div className="mb-4">
        {questions.map(q => {
          const qNum = getQNum(q);
          const qText = q.text || q.questionText || '';
          const optsArray = Array.isArray(q.options) ? q.options : (q.options?.choices || []);
          const isMcq = nType === 'MULTIPLE_CHOICE' || optsArray.length > 0;
          const val = answers[qNum] || '';
          
          return (
            <div key={q.id} className="mb-4 card-content" id={`lq-${qNum}`} style={getHighlightStyle(qNum)} onClick={() => handleWrapperClick(qNum)}>
              <p className="fw-semibold mb-2">
                <span className="me-2 badge rounded-pill text-bg-dark">{qNum}</span>
                {qText || 'Answer'}
              </p>
              {isMcq ? (
                <div className="d-flex flex-column gap-2">
                  {optsArray.map((opt, i) => {
                    const optVal = opt.label || String.fromCharCode(65 + i);
                    return (
                      <label
                        key={optVal}
                        className={`option-card ${val === optVal ? 'selected' : ''}`}
                        style={{ margin: 0, padding: '8px 12px', alignItems: 'flex-start', cursor: 'pointer', border: '1px solid #ddd', borderRadius: '8px', display: 'flex' }}
                      >
                        <input
                          type="radio"
                          name={`lq-${qNum}`}
                          className="form-check-input flex-shrink-0 me-2"
                          value={optVal}
                          checked={val === optVal}
                          onChange={() => onAnswer(qNum, optVal)}
                        />
                        <span className="fw-bold me-2">{optVal}.</span>
                        <span>{typeof opt === 'object' ? opt.text : opt}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <input
                  className="form-control form-control-sm"
                  type="text"
                  value={val}
                  placeholder="Type your answer..."
                  onChange={(e) => onAnswer(qNum, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderMain = () => {
    if (nType === 'MULTIPLE_CHOICE_MULTI') return renderMultipleChoiceMulti();
    if (isForm) return renderFormCompletion();
    if (nType === 'SENTENCE_COMPLETION' || nType === 'NOTE_COMPLETION' || nType === 'NOTES_COMPLETION') return renderSentenceCompletion();
    
    // Generic fallback for Matching, Single Choice, Unknown
    return renderGeneric();
  };

  return (
    <div className="test-block mb-5">
      {renderHeader()}
      {renderInstruction()}
      {block.content && !isForm && (!block.content.trim().startsWith('[') || !block.content.trim().endsWith(']')) && (
        <div className="block-content mb-4 p-3 bg-light rounded shadow-sm">
          {renderHtmlContent(block.content)}
        </div>
      )}
      {block.type === 'Matching' && questions[0]?.options && (Array.isArray(questions[0].options) ? questions[0].options : questions[0].options?.choices)?.length > 0 && (
        <div className="matching-options mb-4 p-3 border rounded bg-white shadow-sm">
          <h6 className="mb-3 text-muted">Options:</h6>
          <ul className="list-unstyled mb-0 d-flex flex-wrap gap-3">
            {(Array.isArray(questions[0].options) ? questions[0].options : questions[0].options?.choices).map((opt, i) => (
              <li key={opt.id || i} className="p-2 border rounded" style={{ minWidth: '120px', background: 'var(--canvas-soft, #f8f9fa)' }}>
                <strong>{String.fromCharCode(65 + i)}</strong>. {typeof opt === 'object' ? opt.text : opt}
              </li>
            ))}
          </ul>
        </div>
      )}
      {renderMain()}
    </div>
  );
}

export default ListeningBlockRenderer;
