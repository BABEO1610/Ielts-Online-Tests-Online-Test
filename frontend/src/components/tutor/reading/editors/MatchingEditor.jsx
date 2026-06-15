import { Plus, Trash2 } from 'lucide-react';

// EARS[Event]: WHEN component is rendered THEN it manages Matching questions
function MatchingEditor({ block, onChange }) {
  // block.options for the shared pool of options (e.g. Headings list)
  // block.questions for the actual questions that map to those options
  const options = block.options || [];
  const questions = block.questions || [];

  const addOption = () => {
    // EARS[State-driven]: WHEN tutor adds an option THEN a new blank option is appended
    const newOption = { id: Date.now(), text: '' };
    onChange({ ...block, options: [...options, newOption] });
  };

  const updateOption = (id, text) => {
    onChange({
      ...block,
      options: options.map(opt => opt.id === id ? { ...opt, text } : opt)
    });
  };

  const removeOption = (id) => {
    // EARS[Unwanted-State]: IF options length <= 1 THEN prevent removing
    if (options.length <= 1) return;

    onChange({
      ...block,
      options: options.filter(opt => opt.id !== id),
      // Also clear any answers that used this option
      questions: questions.map(q => q.correctAnswer === id ? { ...q, correctAnswer: '' } : q)
    });
  };

  const addQuestion = () => {
    // EARS[State-driven]: WHEN tutor adds a question THEN a new question mapping is appended
    const newQuestion = { id: Date.now(), text: '', correctAnswer: '', explanation: '' };
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

  const getOptionLabel = (idx) => {
    if (block.type === 'Matching Headings') return RomanNumerals(idx + 1); // i, ii, iii
    return String.fromCharCode(65 + idx); // A, B, C
  };

  const validateOptions = (opts) => {
    const texts = opts.map(o => (o.text || '').trim().toLowerCase());
    const duplicates = texts.filter((item, index) => item !== '' && texts.indexOf(item) !== index);
    if (duplicates.length > 0) return 'Các lựa chọn không được trùng lặp.';
    return null;
  };

  const optionError = validateOptions(options);

  return (
    <div className="matching-editor">
      <div className="row">
        {/* Left Column: Options Pool */}
        <div className="col-md-6 mb-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-header bg-light py-2">
              <span className="fw-bold" style={{ fontSize: '0.85rem' }}>Options List</span>
              <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>E.g. List of Headings, Features, etc.</p>
            </div>
            <div className="card-body p-3">
              {options.map((opt, idx) => (
                <div key={opt.id} className="d-flex align-items-center mb-3 gap-2 position-relative" data-testid="match-option">
                  <span className="fw-bold text-end" style={{ width: '30px', fontSize: '0.9rem' }}>
                    {getOptionLabel(idx)}.
                  </span>
                  <input 
                    type="text" 
                    className={`form-control form-control-sm ${!(opt.text || '').trim() ? 'is-invalid' : ''}`} 
                    value={opt.text} 
                    onChange={(e) => updateOption(opt.id, e.target.value)} 
                    placeholder="Enter option text..."
                    data-testid={`opt-text-${opt.id}`}
                  />
                  <button className="btn btn-sm text-danger p-1" onClick={() => removeOption(opt.id)} disabled={options.length <= 1} data-testid={`remove-opt-${opt.id}`}>
                    <Trash2 size={16} />
                  </button>
                  {/* EARS[Unwanted-State]: IF option text is empty THEN show validation error */}
                  {!(opt.text || '').trim() && <div className="invalid-feedback d-block" style={{position: 'absolute', transform: 'translateY(100%)', bottom: '0', left: '40px', fontSize: '0.75rem'}}>Option text required.</div>}
                </div>
              ))}
              {/* EARS[Unwanted-State]: IF options have duplicates THEN show option validation error */}
              {optionError && <div className="invalid-feedback d-block mb-2" data-testid="opt-error">{optionError}</div>}

              <button className="btn btn-outline-secondary btn-sm mt-2 w-100" onClick={addOption} data-testid="add-opt-btn">
                <Plus size={16} className="me-1" /> Add Option
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Questions */}
        <div className="col-md-6 mb-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-header bg-light py-2">
              <span className="fw-bold" style={{ fontSize: '0.85rem' }}>Questions / Paragraphs</span>
              <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>Map statements/paragraphs to options.</p>
            </div>
            <div className="card-body p-3">
              {questions.map((q, idx) => (
                <div key={q.id} className="mb-3 p-2 border rounded" data-testid="match-question">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold" style={{ fontSize: '0.85rem' }}>Question {idx + 1}</span>
                    <button className="btn btn-sm text-danger p-0" onClick={() => removeQuestion(q.id)} data-testid={`remove-q-${q.id}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <textarea 
                    className={`form-control form-control-sm mb-1 ${!(q.text || '').trim() ? 'is-invalid' : ''}`} 
                    rows="2" 
                    placeholder={block.type === 'Matching Headings' ? "Paragraph identifier (e.g., Paragraph A)" : "Enter the statement/question..."} 
                    value={q.text} 
                    onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                    data-testid={`q-text-${q.id}`}
                  />
                  {/* EARS[Unwanted-State]: IF question text is empty THEN show validation error */}
                  {!(q.text || '').trim() && <div className="invalid-feedback d-block mb-1 m-0">Text required.</div>}
                  
                  <select 
                    className={`form-select form-select-sm ${!q.correctAnswer ? 'is-invalid' : 'border-success bg-success-subtle'}`}
                    value={q.correctAnswer}
                    onChange={(e) => updateQuestion(q.id, 'correctAnswer', e.target.value)}
                    data-testid={`q-ans-${q.id}`}
                  >
                    <option value="">Select Correct Option...</option>
                    {options.map((opt, optIdx) => (
                      <option key={opt.id} value={opt.id}>
                        {getOptionLabel(optIdx)}. {opt.text.substring(0, 30)}{opt.text.length > 30 ? '...' : ''}
                      </option>
                    ))}
                  </select>
                  {/* EARS[Unwanted-State]: IF answer not selected THEN show validation error */}
                  {!q.correctAnswer && <div className="invalid-feedback d-block m-0">Please map an option.</div>}
                  <div className="mt-2">
                    <label className="form-label mb-1" style={{ fontSize: '0.8rem' }}>Answer Explanation</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows="2"
                      placeholder="Explain why this option matches..."
                      value={q.explanation || ''}
                      onChange={(e) => updateQuestion(q.id, 'explanation', e.target.value)}
                      data-testid={`q-explanation-${q.id}`}
                    />
                  </div>
                </div>
              ))}
              <button className="btn btn-outline-primary btn-sm mt-2 w-100" onClick={addQuestion} data-testid="add-q-btn">
                <Plus size={16} className="me-1" /> Add Question
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to convert number to roman numeral (for headings i, ii, iii, iv, etc.)
function RomanNumerals(num) {
  const lookup = { m: 1000, cm: 900, d: 500, cd: 400, c: 100, xc: 90, l: 50, xl: 40, x: 10, ix: 9, v: 5, iv: 4, i: 1 };
  let roman = '';
  for (let i in lookup) {
    while (num >= lookup[i]) {
      roman += i;
      num -= lookup[i];
    }
  }
  return roman;
}

export default MatchingEditor;
