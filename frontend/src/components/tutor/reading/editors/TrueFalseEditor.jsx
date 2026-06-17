import { Plus, Trash2 } from 'lucide-react';

// EARS[Event]: WHEN component is rendered THEN it manages True/False or Yes/No questions
function TrueFalseEditor({ block, onChange }) {
  const questions = block.questions || [];
  
  // Determine if this is T/F/NG or Y/N/NG
  const isYesNo = block.type === 'Yes/No/Not Given';
  const options = isYesNo 
    ? ['YES', 'NO', 'NOT GIVEN'] 
    : ['TRUE', 'FALSE', 'NOT GIVEN'];

  const addQuestion = () => {
    // EARS[State-driven]: WHEN tutor adds a statement THEN a new statement is appended
    const newQuestion = {
      id: Date.now(),
      text: '',
      correctAnswer: '',
      explanation: ''
    };
    onChange({ ...block, questions: [...questions, newQuestion] });
  };

  const updateQuestion = (qId, field, value) => {
    // EARS[State-driven]: WHEN tutor updates statement or answer THEN the question is updated
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

  return (
    <div className="true-false-editor">
      <div className="mb-3 text-muted" style={{ fontSize: '0.85rem' }}>
        <strong>Instruction format:</strong> Do the following statements agree with the information given in the Reading Passage?
      </div>
      
      {questions.map((q, idx) => (
        <div key={q.id} className="d-flex gap-3 mb-3 align-items-start card p-3 border-0 shadow-sm" data-testid="tf-question">
          <div className="fw-bold mt-1" style={{ width: '30px' }}>Q{idx + 1}.</div>
          <div className="flex-grow-1">
            <textarea 
              className={`form-control form-control-sm mb-1 ${!(q.text || '').trim() ? 'is-invalid' : ''}`} 
              rows="2" 
              placeholder="Enter the statement..." 
              value={q.text} 
              onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
              data-testid={`q-text-${q.id}`}
            />
            {/* EARS[Unwanted-State]: IF statement text is empty THEN show validation error */}
            {!(q.text || '').trim() && <div className="invalid-feedback d-block m-0" data-testid="q-text-error">Nhận định không được để trống.</div>}
            <div className="mt-2">
              <label className="form-label mb-1" style={{ fontSize: '0.8rem' }}>Answer Explanation</label>
              <textarea
                className="form-control form-control-sm"
                rows="2"
                placeholder="Explain the evidence from the passage..."
                value={q.explanation || ''}
                onChange={(e) => updateQuestion(q.id, 'explanation', e.target.value)}
                data-testid={`q-explanation-${q.id}`}
              />
            </div>
          </div>
          <div style={{ width: '150px' }}>
            <select 
              className={`form-select form-select-sm ${!q.correctAnswer ? 'is-invalid' : 'border-success'}`}
              value={q.correctAnswer}
              onChange={(e) => updateQuestion(q.id, 'correctAnswer', e.target.value)}
              data-testid={`q-ans-${q.id}`}
            >
              <option value="">Select Answer...</option>
              {options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {/* EARS[Unwanted-State]: IF answer is not selected THEN show validation error */}
            {!q.correctAnswer && <div className="invalid-feedback d-block m-0" data-testid="q-ans-error">Chọn đáp án.</div>}
          </div>
          <button className="btn btn-sm text-danger p-1 mt-1" onClick={() => removeQuestion(q.id)} title="Remove Statement" data-testid={`remove-q-${q.id}`}>
            <Trash2 size={18} />
          </button>
        </div>
      ))}
      
      <button className="btn btn-outline-primary btn-sm mt-2 w-100" onClick={addQuestion} data-testid="add-tf-btn">
        <Plus size={16} className="me-1" /> Add Statement
      </button>
    </div>
  );
}

export default TrueFalseEditor;
