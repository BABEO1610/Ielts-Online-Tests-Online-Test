import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

function getQuestionCount(block) {
  return (block.questions || []).length;
}

import ListeningBlockRenderer from './ListeningBlockRenderer';

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
            activeSection.blocks.map((block, blockIdx) => {
              const startNum = startNums[activeSectionIdx][blockIdx];
              // Clone the block and assign questionOrder to match the visual preview order
              const previewBlock = {
                ...block,
                questions: (block.questions || []).map((q, qIdx) => ({
                  ...q,
                  questionOrder: startNum + qIdx
                }))
              };
              return (
                <ListeningBlockRenderer
                  key={block.id || blockIdx}
                  block={previewBlock}
                  answers={answers}
                  onAnswer={handleAnswer}
                  answeredQuestions={Object.keys(answers).map(Number)}
                />
              );
            })
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
