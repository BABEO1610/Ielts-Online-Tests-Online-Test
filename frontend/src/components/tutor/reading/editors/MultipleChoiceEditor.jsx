import { Plus, Trash2 } from 'lucide-react';

// EARS[Event]: WHEN component is rendered THEN it manages Multiple Choice questions
function MultipleChoiceEditor({ block, onChange }) {
  const questions = block.questions || [];

  const addQuestion = () => {
    // EARS[State-driven]: WHEN tutor adds a question THEN a new MCQ question is appended
    const newQuestion = {
      id: Date.now(),
      text: '',
      explanation: '',
      options: [
        { id: Date.now() + 1, text: 'Option A' },
        { id: Date.now() + 2, text: 'Option B' },
        { id: Date.now() + 3, text: 'Option C' },
        { id: Date.now() + 4, text: 'Option D' }
      ],
      correctAnswers: []
    };
    onChange({ ...block, questions: [...questions, newQuestion] });
  };

  const updateQuestion = (qId, field, value) => {
    onChange({
      ...block,
      questions: questions.map(q => q.id === qId ? { ...q, [field]: value } : q)
    });
  };

  const removeQuestion = (qId) => {
    onChange({
      ...block,
      questions: questions.filter(q => q.id !== qId)
    });
  };

  const updateOption = (qId, optId, value) => {
    // EARS[State-driven]: WHEN tutor updates option text THEN option value is updated
    onChange({
      ...block,
      questions: questions.map(q => {
        if (q.id === qId) {
          return {
            ...q,
            options: q.options.map(opt => opt.id === optId ? { ...opt, text: value } : opt)
          };
        }
        return q;
      })
    });
  };

  const addOption = (qId) => {
    onChange({
      ...block,
      questions: questions.map(q => {
        if (q.id === qId) {
          return {
            ...q,
            options: [...q.options, { id: Date.now(), text: `New Option` }]
          };
        }
        return q;
      })
    });
  };

  const removeOption = (qId, optId) => {
    // EARS[Unwanted-State]: IF options length <= 2 THEN prevent removing more options
    onChange({
      ...block,
      questions: questions.map(q => {
        if (q.id === qId) {
          if (q.options.length <= 2) return q; // Minimum 2 options
          return {
            ...q,
            options: q.options.filter(opt => opt.id !== optId),
            correctAnswers: q.correctAnswers.filter(id => id !== optId)
          };
        }
        return q;
      })
    });
  };

  const toggleCorrectAnswer = (qId, optId) => {
    // EARS[State-driven]: WHEN tutor selects an option as correct THEN correctAnswers is updated
    onChange({
      ...block,
      questions: questions.map(q => {
        if (q.id === qId) {
          return {
            ...q,
            correctAnswers: [optId] // Force single choice for standard IELTS MCQ
          };
        }
        return q;
      })
    });
  };

  const validateOptions = (options) => {
    const texts = options.map(o => (o.text || '').trim().toLowerCase());
    const duplicates = texts.filter((item, index) => texts.indexOf(item) !== index);
    if (duplicates.length > 0) return 'Các lựa chọn không được trùng lặp.';
    if (options.length < 2) return 'Phải có ít nhất 2 lựa chọn.';
    return null;
  };

  return (
    <div className="multiple-choice-editor">
      {questions.map((q, idx) => {
        const optionError = validateOptions(q.options);
        return (
          <div key={q.id} className="card mb-3 border-0 shadow-sm" data-testid="mcq-question">
            <div className="card-header bg-white d-flex justify-content-between align-items-center py-2">
              <span className="fw-bold" style={{ fontSize: '0.9rem' }}>Question {idx + 1}</span>
              <button className="btn btn-sm text-danger p-1" onClick={() => removeQuestion(q.id)} title="Remove Question" data-testid={`remove-q-${q.id}`}>
                <Trash2 size={16} />
              </button>
            </div>
            <div className="card-body p-3">
              <div className="mb-3">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Question Text</label>
                <textarea 
                  className={`form-control form-control-sm ${!(q.text || '').trim() ? 'is-invalid' : ''}`}
                  rows="2" 
                  placeholder="Enter question text..." 
                  value={q.text} 
                  onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                  data-testid={`q-text-${q.id}`}
                />
                {/* EARS[Unwanted-State]: IF question text is empty THEN show validation error */}
                {!(q.text || '').trim() && <div className="invalid-feedback d-block">Câu hỏi không được để trống.</div>}
              </div>
              
              <div>
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Options & Correct Answer</label>
                {q.options.map((opt, optIdx) => (
                  <div key={opt.id} className="d-flex align-items-center mb-2 gap-2" data-testid="mcq-option">
                    <div className="form-check m-0">
                      <input 
                        className="form-check-input" 
                        type="radio" 
                        name={`correct-ans-${q.id}`}
                        checked={q.correctAnswers.includes(opt.id)}
                        onChange={() => toggleCorrectAnswer(q.id, opt.id)}
                        title="Mark as correct"
                        style={{ cursor: 'pointer' }}
                        data-testid={`opt-radio-${opt.id}`}
                      />
                    </div>
                    <span className="fw-bold" style={{ width: '25px', textAlign: 'center' }}>{String.fromCharCode(65 + optIdx)}.</span>
                    <input 
                      type="text" 
                      className={`form-control form-control-sm ${!(opt.text || '').trim() ? 'is-invalid' : ''} ${q.correctAnswers.includes(opt.id) ? 'border-success bg-success-subtle' : ''}`}
                      value={opt.text} 
                      onChange={(e) => updateOption(q.id, opt.id, e.target.value)} 
                      placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                      data-testid={`opt-text-${opt.id}`}
                    />
                    <button className="btn btn-sm text-danger p-0" onClick={() => removeOption(q.id, opt.id)} disabled={q.options.length <= 2} data-testid={`remove-opt-${opt.id}`}>
                      <Trash2 size={16} />
                    </button>
                    {/* EARS[Unwanted-State]: IF option text is empty THEN show validation error */}
                    {!(opt.text || '').trim() && <div className="invalid-feedback d-block" style={{position: 'absolute', transform: 'translateY(100%)', marginTop: '10px', fontSize: '0.75rem'}}>Lựa chọn không để trống.</div>}
                  </div>
                ))}
                {/* EARS[Unwanted-State]: IF options have duplicates or < 2 THEN show option validation error */}
                {optionError && <div className="invalid-feedback d-block mb-2" data-testid="opt-error">{optionError}</div>}
                
                {/* EARS[Unwanted-State]: IF no correct answer selected THEN show correct answer validation error */}
                {q.correctAnswers.length === 0 && <div className="invalid-feedback d-block mb-2" data-testid="ans-error">Vui lòng chọn 1 đáp án đúng.</div>}
                
                <button className="btn btn-sm btn-outline-secondary mt-1" onClick={() => addOption(q.id)} data-testid={`add-opt-${q.id}`}>
                  + Thêm lựa chọn
                </button>
              </div>

              <div className="mt-3">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Answer Explanation</label>
                <textarea
                  className="form-control form-control-sm"
                  rows="2"
                  placeholder="Explain why the selected answer is correct..."
                  value={q.explanation || ''}
                  onChange={(e) => updateQuestion(q.id, 'explanation', e.target.value)}
                  data-testid={`q-explanation-${q.id}`}
                />
              </div>
            </div>
          </div>
        );
      })}
      <button className="btn btn-outline-primary btn-sm mt-2 w-100" onClick={addQuestion} data-testid="add-mcq">
        <Plus size={16} className="me-1" /> Add Multiple Choice Question
      </button>
    </div>
  );
}

export default MultipleChoiceEditor;
