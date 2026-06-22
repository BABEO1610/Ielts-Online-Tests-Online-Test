import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

function getQuestionCount(block) {
  return (block.questions || []).length;
}

function renderQuestion(block, question, qNum, answers, onAnswer) {
  const value = answers[qNum] || '';

  if (block.type === 'Multiple Choice') {
    const selected = answers[qNum] || [];
    return (
      <div className="mb-4" key={question.id || qNum}>
        <p className="fw-semibold mb-2">
          <span className="me-2 badge rounded-pill text-bg-dark">{qNum}</span>
          {question.text || 'Untitled question'}
        </p>
        {(question.options || []).map((opt, idx) => (
          <button
            type="button"
            key={opt.id || idx}
            className={`option-card w-100 text-start ${selected.includes(opt.id) ? 'selected' : ''}`}
            onClick={() => onAnswer(qNum, [opt.id])}
          >
            <span className="fw-bold me-2">{String.fromCharCode(65 + idx)}.</span>
            {opt.text}
          </button>
        ))}
      </div>
    );
  }

  if (block.type === 'Matching') {
    return (
      <div className="mb-4" key={question.id || qNum}>
        <p className="fw-semibold mb-2">
          <span className="me-2 badge rounded-pill text-bg-dark">{qNum}</span>
          {question.text || 'Untitled matching item'}
        </p>
        <select className="form-select form-select-sm" value={value} onChange={(e) => onAnswer(qNum, e.target.value)}>
          <option value="">Select answer...</option>
          {(block.options || []).map((opt, idx) => (
            <option key={opt.id || idx} value={opt.id || opt.text}>
              {String.fromCharCode(65 + idx)}. {opt.text}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="mb-4" key={question.id || qNum}>
      <p className="fw-semibold mb-2">
        <span className="me-2 badge rounded-pill text-bg-dark">{qNum}</span>
        {question.text || 'Answer'}
      </p>
      <input
        className="form-control form-control-sm"
        type="text"
        value={value}
        placeholder="Type your answer..."
        onChange={(e) => onAnswer(qNum, e.target.value)}
      />
    </div>
  );
}

function renderBlockContent(content) {
  if (!content) return null;
  const isImageUrl = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(content.trim());
  if (isImageUrl) {
    return <img src={content.trim()} alt="Diagram / Map" className="img-fluid rounded border mb-2" style={{ maxHeight: '400px', display: 'block', margin: '10px auto' }} />;
  }
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}

function ListeningTestPreviewModal({ formData, sections, onClose }) {
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [answers, setAnswers] = useState({});

  const startNums = sections.map((section, sectionIdx) => {
    let counter = 1;
    sections.slice(0, sectionIdx).forEach(prev => {
      (prev.blocks || []).forEach(block => {
        counter += getQuestionCount(block);
      });
    });

    return (section.blocks || []).map(block => {
      const start = counter;
      counter += getQuestionCount(block);
      return start;
    });
  });

  const activeSection = sections[activeSectionIdx];
  const totalQ = sections.reduce((sum, section) => (
    sum + (section.blocks || []).reduce((blockSum, block) => blockSum + getQuestionCount(block), 0)
  ), 0);

  const handleAnswer = (qNum, value) => {
    setAnswers(prev => ({ ...prev, [qNum]: value }));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#111', color: '#fff', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: 11, opacity: 0.65, textTransform: 'uppercase', letterSpacing: 1 }}>Preview Mode</span>
          <h5 className="mb-0 mt-1">{formData.title || 'Untitled Listening Test'}</h5>
        </div>
        <div className="d-flex align-items-center gap-3">
          <span style={{ fontSize: 13, opacity: 0.75 }}>{Object.keys(answers).length}/{totalQ} answered</span>
          <span style={{ background: '#fff2', borderRadius: 20, padding: '4px 16px', fontSize: 13 }}>{formData.duration || 30} min</span>
          <button type="button" className="btn btn-outline-light btn-sm d-flex align-items-center gap-2" onClick={onClose}>
            <X size={14} /> Close Preview
          </button>
        </div>
      </div>

      <div style={{ background: '#1a1a1a', padding: '0 24px', display: 'flex', gap: 4 }}>
        {sections.map((section, idx) => (
          <button
            type="button"
            key={section.id}
            onClick={() => setActiveSectionIdx(idx)}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeSectionIdx === idx ? '3px solid #fff' : '3px solid transparent',
              color: activeSectionIdx === idx ? '#fff' : 'rgba(255,255,255,0.55)',
              fontWeight: activeSectionIdx === idx ? 700 : 400,
            }}
          >
            Section {idx + 1}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'grid', gridTemplateColumns: 'minmax(320px, 0.8fr) minmax(360px, 1fr)', background: '#fafafa' }}>
        <div style={{ overflowY: 'auto', padding: '32px 40px', background: '#fff', borderRight: '1px solid #e5e5e5' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{activeSection?.title || `Section ${activeSectionIdx + 1}`}</h2>
          <p className="text-secondary mb-3">Questions {activeSection?.defaultRange}</p>
          {activeSection?.audioUrl ? (
            <audio controls src={activeSection.audioUrl} style={{ width: '100%', marginBottom: 24 }}>
              Your browser does not support audio playback.
            </audio>
          ) : (
            <div className="p-4 text-center text-secondary border rounded mb-4">No audio added yet.</div>
          )}
          {activeSection?.showTranscript && activeSection?.transcript && (
            <div>
              <h6 className="fw-bold">Transcript</h6>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.75 }}>{activeSection.transcript}</div>
            </div>
          )}
        </div>

        <div style={{ overflowY: 'auto', padding: '32px 40px' }}>
          {(activeSection?.blocks || []).length > 0 ? (
            activeSection.blocks.map((block, blockIdx) => (
              <div className="mb-5" key={block.id || blockIdx}>
                <div className="mb-3 p-2 rounded" style={{ background: '#f5f5f5', borderLeft: '3px solid #111' }}>
                  <p className="mb-0 fw-semibold" style={{ fontSize: '0.85rem' }}>{block.type || 'Question Block'} - Questions {block.range || '?'}</p>
                </div>
                {block.content && (
                  <div className="mb-3 p-3 rounded bg-white border">
                    {renderBlockContent(block.content)}
                  </div>
                )}
                {(block.questions || []).map((question, qIdx) => (
                  renderQuestion(block, question, startNums[activeSectionIdx][blockIdx] + qIdx, answers, handleAnswer)
                ))}
              </div>
            ))
          ) : (
            <div className="p-5 text-center text-secondary">No question blocks added to this section yet.</div>
          )}
        </div>
      </div>

      <div style={{ background: '#fff', borderTop: '1px solid #e5e5e5', padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2" disabled={activeSectionIdx === 0} onClick={() => setActiveSectionIdx(i => i - 1)}>
          <ChevronLeft size={16} /> Previous Section
        </button>
        <span className="text-secondary" style={{ fontSize: 13 }}>Section {activeSectionIdx + 1} of {sections.length}</span>
        <button type="button" className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2" disabled={activeSectionIdx === sections.length - 1} onClick={() => setActiveSectionIdx(i => i + 1)}>
          Next Section <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default ListeningTestPreviewModal;
