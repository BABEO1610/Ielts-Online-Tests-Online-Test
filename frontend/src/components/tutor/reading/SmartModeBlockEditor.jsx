import React from 'react';

function SmartModeBlockEditor({ block, onChange }) {
  const questionType = block.questionType || block.type;
  const questions = block.questions || [];

  const updateQuestion = (qId, field, value) => {
    onChange({
      ...block,
      questions: questions.map(q => q.id === qId || q.questionOrder === qId ? { ...q, [field]: value } : q)
    });
  };

  if (['MATCHING_INFORMATION', 'MATCHING_HEADINGS'].includes(questionType)) {
    const isHeadings = questionType === 'MATCHING_HEADINGS';
    // Use choices from the first question if available
    const poolOptions = questions[0]?.options?.choices || [];
    
    let options = [];
    if (poolOptions.length > 0) {
      options = poolOptions.map(c => c.label || c.id || c);
    } else {
      // Fallback
      options = isHeadings 
        ? ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x']
        : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    }

    return (
      <div className="smart-mode-editor">
        {questions.map((q, idx) => (
          <div key={q.id || idx} className="mb-3 p-3 border rounded bg-white">
            <div className="fw-bold mb-2">Question {q.questionOrder}</div>
            <div className="mb-2 text-muted">{q.questionText}</div>
            <div className="row g-2">
              <div className="col-md-4">
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Correct Answer</label>
                <select 
                  className={`form-select form-select-sm ${!q.correctAnswer ? 'is-invalid' : 'border-success'}`}
                  value={q.correctAnswer || ''}
                  onChange={(e) => updateQuestion(q.id || q.questionOrder, 'correctAnswer', e.target.value)}
                >
                  <option value="">Select...</option>
                  {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="col-md-8">
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Explanation</label>
                <textarea 
                  className="form-control form-control-sm"
                  rows="2"
                  value={q.explanation || ''}
                  onChange={(e) => updateQuestion(q.id || q.questionOrder, 'explanation', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (['SENTENCE_COMPLETION', 'SUMMARY_COMPLETION', 'NOTE_COMPLETION', 'SHORT_ANSWER_QUESTIONS'].includes(questionType)) {
    return (
      <div className="smart-mode-editor">
        {questions.map((q, idx) => (
          <div key={q.id || idx} className="mb-3 p-3 border rounded bg-white">
            <div className="fw-bold mb-2">Question {q.questionOrder}</div>
            <div className="mb-2 text-muted">{q.questionText}</div>
            <div className="row g-2">
              <div className="col-md-4">
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Correct Answer</label>
                <input 
                  type="text"
                  className={`form-control form-control-sm ${!q.correctAnswer ? 'is-invalid' : 'border-success'}`}
                  value={q.correctAnswer || ''}
                  onChange={(e) => updateQuestion(q.id || q.questionOrder, 'correctAnswer', e.target.value)}
                  placeholder="e.g. 3 words"
                />
              </div>
              <div className="col-md-8">
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Explanation</label>
                <textarea 
                  className="form-control form-control-sm"
                  rows="2"
                  value={q.explanation || ''}
                  onChange={(e) => updateQuestion(q.id || q.questionOrder, 'explanation', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (['TRUE_FALSE_NOT_GIVEN', 'YES_NO_NOT_GIVEN'].includes(questionType)) {
    const isTF = questionType === 'TRUE_FALSE_NOT_GIVEN';
    const options = isTF ? ['TRUE', 'FALSE', 'NOT GIVEN'] : ['YES', 'NO', 'NOT GIVEN'];
    
    return (
      <div className="smart-mode-editor">
        {questions.map((q, idx) => (
          <div key={q.id || idx} className="mb-3 p-3 border rounded bg-white">
            <div className="fw-bold mb-2">Question {q.questionOrder}</div>
            <div className="mb-2 text-muted">{q.questionText}</div>
            <div className="row g-2">
              <div className="col-md-4">
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Correct Answer</label>
                <select 
                  className={`form-select form-select-sm ${!q.correctAnswer ? 'is-invalid' : 'border-success'}`}
                  value={q.correctAnswer || ''}
                  onChange={(e) => updateQuestion(q.id || q.questionOrder, 'correctAnswer', e.target.value)}
                >
                  <option value="">Select...</option>
                  {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="col-md-8">
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Explanation</label>
                <textarea 
                  className="form-control form-control-sm"
                  rows="2"
                  value={q.explanation || ''}
                  onChange={(e) => updateQuestion(q.id || q.questionOrder, 'explanation', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (questionType === 'MULTIPLE_CHOICE_SINGLE') {
    return (
      <div className="smart-mode-editor">
        {questions.map((q, idx) => (
          <div key={q.id || idx} className="mb-3 p-3 border rounded bg-white">
            <div className="fw-bold mb-2">Question {q.questionOrder}</div>
            <div className="mb-2 text-muted">{q.questionText}</div>
            <div className="mb-3 ps-3">
              {(q.options?.choices || []).map((choice, cIdx) => (
                <div key={cIdx}><strong>{choice.label}.</strong> {choice.text}</div>
              ))}
            </div>
            <div className="row g-2">
              <div className="col-md-4">
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Correct Answer</label>
                <select 
                  className={`form-select form-select-sm ${!q.correctAnswer ? 'is-invalid' : 'border-success'}`}
                  value={q.correctAnswer || ''}
                  onChange={(e) => updateQuestion(q.id || q.questionOrder, 'correctAnswer', e.target.value)}
                >
                  <option value="">Select...</option>
                  {(q.options?.choices || []).map(choice => (
                    <option key={choice.label} value={choice.label}>{choice.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-8">
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Explanation</label>
                <textarea 
                  className="form-control form-control-sm"
                  rows="2"
                  value={q.explanation || ''}
                  onChange={(e) => updateQuestion(q.id || q.questionOrder, 'explanation', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (questionType === 'MULTIPLE_CHOICE_MULTI') {
    const poolOptions = questions[0]?.options?.choices || [];
    const maxSelections = questions[0]?.options?.maxSelections || questions.length;
    
    // Aggregate correctAnswers from individual questions
    const selectedAnswers = questions.map(q => q.correctAnswer).filter(Boolean);
    const explanation = questions[0]?.explanation || '';

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
      
      // Distribute newSelected back to questions
      const newQuestions = questions.map((q, i) => ({
        ...q,
        correctAnswer: newSelected[i] || ''
      }));
      
      onChange({ ...block, questions: newQuestions });
    };

    const handleExplanationChange = (val) => {
      onChange({
        ...block,
        questions: questions.map((q, i) => i === 0 ? { ...q, explanation: val } : q)
      });
    };

    return (
      <div className="smart-mode-editor">
        <div className="mb-3 p-3 border rounded bg-white">
          <div className="fw-bold mb-2">Questions {block.rangeStart}-{block.rangeEnd}</div>
          <div className="mb-3 text-muted">
            Select {maxSelections} correct statements from the list below:
          </div>
          <div className="mb-3 ps-3 border-start border-3 bg-light p-2 text-sm">
            {poolOptions.map((choice, cIdx) => (
              <div key={cIdx} className="form-check mb-1">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  id={`mc_multi_${block.rangeStart}_${choice.label}`}
                  checked={selectedAnswers.includes(choice.label)}
                  onChange={() => handleToggle(choice.label)}
                  disabled={!selectedAnswers.includes(choice.label) && selectedAnswers.length >= maxSelections}
                />
                <label className="form-check-label" htmlFor={`mc_multi_${block.rangeStart}_${choice.label}`}>
                  <strong>{choice.label}.</strong> {choice.text}
                </label>
              </div>
            ))}
          </div>
          
          <div className="row g-2">
            <div className="col-md-4">
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Selected Answers ({selectedAnswers.length}/{maxSelections})</label>
              <div className={`form-control form-control-sm bg-light ${selectedAnswers.length < maxSelections ? 'is-invalid' : 'border-success'}`}>
                 {selectedAnswers.length > 0 ? selectedAnswers.sort().join(', ') : 'None'}
              </div>
            </div>
            <div className="col-md-8">
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Group Explanation</label>
              <textarea 
                className="form-control form-control-sm"
                rows="2"
                value={explanation}
                onChange={(e) => handleExplanationChange(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="alert alert-warning">
      Smart Mode Editor for <strong>{questionType}</strong> is not yet fully implemented.
    </div>
  );
}

export default SmartModeBlockEditor;
