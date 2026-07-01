import { Plus, Trash2 } from 'lucide-react';

const makeId = () => Date.now() + Math.floor(Math.random() * 1000);

function ExplanationField({ value, onChange, testId }) {
  return (
    <div className="mt-2">
      <label className="form-label mb-1" style={{ fontSize: '0.8rem' }}>Answer Explanation</label>
      <textarea
        className="form-control form-control-sm"
        rows="2"
        placeholder="Explain why this answer is correct..."
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
      />
    </div>
  );
}

function ListeningQuestionBlockEditor({ block, onChange }) {
  const questions = block.questions || [];
  const options = block.options || [];

  const updateBlockField = (field, value) => onChange({ ...block, [field]: value });

  const addQuestion = (defaults = {}) => {
    onChange({
      ...block,
      questions: [
        ...questions,
        { id: makeId(), text: '', correctAnswer: '', explanation: '', ...defaults },
      ],
    });
  };

  const updateQuestion = (qId, field, value) => {
    onChange({
      ...block,
      questions: questions.map(q => q.id === qId ? { ...q, [field]: value } : q),
    });
  };

  const removeQuestion = (qId) => {
    onChange({ ...block, questions: questions.filter(q => q.id !== qId) });
  };

  const addOption = () => {
    onChange({ ...block, options: [...options, { id: makeId(), text: '' }] });
  };

  const updateOption = (optId, text) => {
    onChange({
      ...block,
      options: options.map(opt => opt.id === optId ? { ...opt, text } : opt),
    });
  };

  const removeOption = (optId) => {
    onChange({
      ...block,
      options: options.filter(opt => opt.id !== optId),
      questions: questions.map(q => q.correctAnswer === optId ? { ...q, correctAnswer: '' } : q),
    });
  };

  const renderCompletionEditor = ({ title, contentLabel, contentPlaceholder, answerLabel, promptPlaceholder }) => (
    <div className="mt-3">
      {contentLabel && (
        <div className="mb-3">
          <label className="form-label fw-bold" style={{ fontSize: '0.85rem' }}>{contentLabel}</label>
          <textarea
            className="form-control form-control-sm"
            rows="4"
            placeholder={contentPlaceholder}
            value={block.content || ''}
            onChange={(e) => updateBlockField('content', e.target.value)}
          />
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-light py-2">
          <span className="fw-bold" style={{ fontSize: '0.85rem' }}>{title}</span>
        </div>
        <div className="card-body p-3">
          {questions.map((q, idx) => (
            <div key={q.id} className="border rounded p-2 mb-3" data-testid="listening-completion-question">
              <div className="fw-bold mb-2" style={{ fontSize: '0.85rem' }}>Question {idx + 1}</div>
              <input
                type="text"
                className="form-control form-control-sm mb-2"
                placeholder={promptPlaceholder}
                value={q.text || q.questionText || ''}
                onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
              />
              <input
                type="text"
                className={`form-control form-control-sm ${!(typeof q.correctAnswer === 'string' ? q.correctAnswer : String(q.correctAnswer || '')).trim() ? 'is-invalid' : 'border-success'}`}
                placeholder={answerLabel}
                value={typeof q.correctAnswer === 'string' ? q.correctAnswer : (Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer || '')}
                onChange={(e) => updateQuestion(q.id, 'correctAnswer', e.target.value)}
              />
              {!(typeof q.correctAnswer === 'string' ? q.correctAnswer : String(q.correctAnswer || '')).trim() && <div className="invalid-feedback d-block">Answer is required.</div>}
              <ExplanationField
                value={q.explanation}
                onChange={(value) => updateQuestion(q.id, 'explanation', value)}
                testId={`listening-explanation-${q.id}`}
              />
              <button className="btn btn-sm text-danger p-0 mt-2" onClick={() => removeQuestion(q.id)}>
                <Trash2 size={16} /> Remove
              </button>
            </div>
          ))}
          <button className="btn btn-outline-primary btn-sm w-100" onClick={() => addQuestion()}>
            <Plus size={16} className="me-1" /> Add Question
          </button>
        </div>
      </div>
    </div>
  );

  const renderMultipleChoiceEditor = () => {
    const addMcq = () => addQuestion({
      options: [
        { id: makeId(), text: 'Option A' },
        { id: makeId(), text: 'Option B' },
        { id: makeId(), text: 'Option C' },
        { id: makeId(), text: 'Option D' },
      ],
      correctAnswers: [],
    });

    const updateQuestionOption = (qId, optId, text) => {
      onChange({
        ...block,
        questions: questions.map(q => {
          if (q.id !== qId) return q;
          const isObj = q.options && !Array.isArray(q.options);
          const choices = isObj ? (q.options.choices || []) : (q.options || []);
          const newChoices = choices.map(opt => (opt.id || opt.label) === optId ? { ...opt, text } : opt);
          return { ...q, options: isObj ? { ...q.options, choices: newChoices } : newChoices };
        }),
      });
    };

    const addQuestionOption = (qId) => {
      onChange({
        ...block,
        questions: questions.map(q => {
          if (q.id !== qId) return q;
          const isObj = q.options && !Array.isArray(q.options);
          const choices = isObj ? (q.options.choices || []) : (q.options || []);
          const newChoices = [...choices, { id: makeId(), text: 'New Option' }];
          return { ...q, options: isObj ? { ...q.options, choices: newChoices } : newChoices };
        }),
      });
    };

    const removeQuestionOption = (qId, optId) => {
      onChange({
        ...block,
        questions: questions.map(q => {
          if (q.id !== qId) return q;
          const isObj = q.options && !Array.isArray(q.options);
          const choices = isObj ? (q.options.choices || []) : (q.options || []);
          if (choices.length <= 2) return q;
          const newChoices = choices.filter(opt => (opt.id || opt.label) !== optId);
          return {
            ...q,
            options: isObj ? { ...q.options, choices: newChoices } : newChoices,
            correctAnswers: (q.correctAnswers || []).filter(id => id !== optId),
          };
        }),
      });
    };

    const selectCorrectAnswer = (qId, optId) => {
      onChange({
        ...block,
        questions: questions.map(q => {
          if (q.id !== qId) return q;
          
          if (block.type === 'MULTIPLE_CHOICE_MULTI' || (q.options && q.options.answerFormat === 'MULTI_SELECT')) {
            const currentAnswers = q.correctAnswers || [];
            if (currentAnswers.includes(optId)) {
               return { ...q, correctAnswers: currentAnswers.filter(id => id !== optId) };
            } else {
               return { ...q, correctAnswers: [...currentAnswers, optId] };
            }
          }
          
          return { ...q, correctAnswers: [optId] };
        }),
      });
    };

    return (
      <div className="mt-3">
        {questions.map((q, idx) => (
          <div key={q.id} className="card mb-3 border-0 shadow-sm" data-testid="listening-mcq-question">
            <div className="card-header bg-white d-flex justify-content-between align-items-center py-2">
              <span className="fw-bold" style={{ fontSize: '0.9rem' }}>
                {q.questionNumbers && q.questionNumbers.length > 1 
                  ? `Questions ${q.questionNumbers[0]}-${q.questionNumbers[q.questionNumbers.length - 1]}` 
                  : `Question ${q.questionOrder || idx + 1}`}
              </span>
              <button className="btn btn-sm text-danger p-1" onClick={() => removeQuestion(q.id)}>
                <Trash2 size={16} />
              </button>
            </div>
            <div className="card-body p-3">
              <textarea
                className={`form-control form-control-sm mb-2 ${!String(q.text || q.questionText || (q.options?.groupInstruction) || '').trim() ? 'is-invalid' : ''}`}
                rows="2"
                placeholder="Question text..."
                value={q.text || q.questionText || (q.options?.groupInstruction) || ''}
                onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
              />
              {!String(q.text || q.questionText || (q.options?.groupInstruction) || '').trim() && <div className="invalid-feedback d-block mb-2">Question text is required.</div>}

              {(Array.isArray(q.options) ? q.options : (q.options?.choices || [])).map((opt, optIdx) => (
                <div key={opt.id || opt.label || optIdx} className="d-flex align-items-center gap-2 mb-2" style={{ minWidth: 0 }}>
                  <input
                    className="form-check-input m-0"
                    type={block.type === 'MULTIPLE_CHOICE_MULTI' || (q.options && q.options.answerFormat === 'MULTI_SELECT') ? 'checkbox' : 'radio'}
                    name={`listening-correct-${q.id}`}
                    checked={(q.correctAnswers || []).includes(opt.id) || (opt.label && (q.correctAnswers || []).includes(opt.label))}
                    onChange={() => selectCorrectAnswer(q.id, opt.id || opt.label)}
                    style={{ width: 18, height: 18, flex: '0 0 18px', padding: 0 }}
                  />
                  <span className="fw-bold text-center" style={{ width: 24, flex: '0 0 24px' }}>{String.fromCharCode(65 + optIdx)}.</span>
                  <input
                    type="text"
                    className={`form-control form-control-sm ${((q.correctAnswers || []).includes(opt.id) || (opt.label && (q.correctAnswers || []).includes(opt.label))) ? 'border-success bg-success-subtle' : ''}`}
                    style={{ minWidth: 0, flex: '1 1 auto' }}
                    value={opt.text || ''}
                    onChange={(e) => updateQuestionOption(q.id, opt.id || opt.label, e.target.value)}
                  />
                  <button className="btn btn-sm text-danger p-0" style={{ flex: '0 0 24px' }} disabled={(Array.isArray(q.options) ? q.options : (q.options?.choices || [])).length <= 2} onClick={() => removeQuestionOption(q.id, opt.id || opt.label)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {(q.correctAnswers || []).length === 0 && <div className="invalid-feedback d-block mb-2">Select the correct answer.</div>}
              <button className="btn btn-sm btn-outline-secondary" onClick={() => addQuestionOption(q.id)}>
                + Add Option
              </button>
              <ExplanationField
                value={q.explanation}
                onChange={(value) => updateQuestion(q.id, 'explanation', value)}
                testId={`listening-explanation-${q.id}`}
              />
            </div>
          </div>
        ))}
        <button className="btn btn-outline-primary btn-sm w-100" onClick={addMcq}>
          <Plus size={16} className="me-1" /> Add Multiple Choice Question
        </button>
      </div>
    );
  };

  const renderMatchingEditor = () => (
    <div className="row mt-3">
      <div className="col-md-5 mb-3">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-header bg-light py-2">
            <span className="fw-bold" style={{ fontSize: '0.85rem' }}>Options List</span>
          </div>
          <div className="card-body p-3">
            {options.map((opt, idx) => (
              <div key={opt.id} className="d-flex align-items-center gap-2 mb-2">
                <span className="fw-bold" style={{ width: 24 }}>{String.fromCharCode(65 + idx)}.</span>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Option text..."
                  value={opt.text || ''}
                  onChange={(e) => updateOption(opt.id, e.target.value)}
                />
                <button className="btn btn-sm text-danger p-0" onClick={() => removeOption(opt.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button className="btn btn-outline-secondary btn-sm w-100 mt-2" onClick={addOption}>
              <Plus size={16} className="me-1" /> Add Option
            </button>
          </div>
        </div>
      </div>
      <div className="col-md-7 mb-3">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-header bg-light py-2">
            <span className="fw-bold" style={{ fontSize: '0.85rem' }}>Questions</span>
          </div>
          <div className="card-body p-3">
            {questions.map((q, idx) => (
              <div key={q.id} className="border rounded p-2 mb-3" data-testid="listening-matching-question">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold" style={{ fontSize: '0.85rem' }}>Question {idx + 1}</span>
                  <button className="btn btn-sm text-danger p-0" onClick={() => removeQuestion(q.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <textarea
                  className="form-control form-control-sm mb-2"
                  rows="2"
                  placeholder="Statement, speaker, or item to match..."
                  value={q.text || q.questionText || ''}
                  onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                />
                <select
                  className={`form-select form-select-sm ${!q.correctAnswer ? 'is-invalid' : 'border-success bg-success-subtle'}`}
                  value={q.correctAnswer || ''}
                  onChange={(e) => updateQuestion(q.id, 'correctAnswer', e.target.value)}
                >
                  <option value="">Select correct option...</option>
                  {options.map((opt, optIdx) => (
                    <option key={opt.id} value={opt.id}>
                      {String.fromCharCode(65 + optIdx)}. {opt.text}
                    </option>
                  ))}
                </select>
                {!q.correctAnswer && <div className="invalid-feedback d-block">Select a matching option.</div>}
                <ExplanationField
                  value={q.explanation}
                  onChange={(value) => updateQuestion(q.id, 'explanation', value)}
                  testId={`listening-explanation-${q.id}`}
                />
              </div>
            ))}
            <button className="btn btn-outline-primary btn-sm w-100" onClick={() => addQuestion()}>
              <Plus size={16} className="me-1" /> Add Question
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  switch (block.type) {
    case 'Multiple Choice':
    case 'MULTIPLE_CHOICE_SINGLE':
    case 'MULTIPLE_CHOICE_MULTI':
      return renderMultipleChoiceEditor();
    case 'Matching':
    case 'MATCHING_INFORMATION':
    case 'MATCHING_HEADINGS':
      return renderMatchingEditor();
    case 'Map/Plan/Diagram Labeling':
      return renderCompletionEditor({
        title: 'Map / Plan / Diagram Labels',
        contentLabel: 'Map / Plan / Diagram Instructions or Image URL',
        contentPlaceholder: 'Paste an image URL, describe the diagram, or add labeling instructions...',
        answerLabel: 'Correct label / answer',
        promptPlaceholder: 'Label position or prompt, e.g. Next to the entrance',
      });
    case 'Sentence Completion':
    case 'SENTENCE_COMPLETION':
      return renderCompletionEditor({
        title: 'Sentence Completion Answers',
        contentLabel: 'Sentence Set / Instructions',
        contentPlaceholder: 'Enter the sentence set. Use blanks like [1], [2] if useful...',
        answerLabel: 'Exact answer',
        promptPlaceholder: 'Sentence or blank prompt...',
      });
    case 'Short-answer Questions':
      return renderCompletionEditor({
        title: 'Short-answer Questions',
        answerLabel: 'Exact answer',
        promptPlaceholder: 'Question prompt...',
      });
    case 'Note/Table/Flow-chart Completion':
    case 'NOTE_COMPLETION':
    case 'Notes Completion':
    case 'NOTES_COMPLETION':
      return renderCompletionEditor({
        title: 'Note / Table / Flow-chart Answers',
        contentLabel: 'Note / Table / Flow-chart Content',
        contentPlaceholder: 'Enter the notes/table/flow-chart content. Use blanks like [1], [2]...',
        answerLabel: 'Exact answer',
        promptPlaceholder: 'Blank label or context...',
      });
    case 'Form Completion':
    case 'FORM_COMPLETION':
    default:
      return renderCompletionEditor({
        title: 'Form Completion Answers',
        contentLabel: 'Form Content',
        contentPlaceholder: 'Enter the form fields. Use blanks like [1], [2], [3]...',
        answerLabel: 'Exact answer',
        promptPlaceholder: 'Field label or blank context...',
      });
  }
}

export default ListeningQuestionBlockEditor;
