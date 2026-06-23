import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import QuestionBlockEditor from '../../components/tutor/reading/QuestionBlockEditor';
import ReadingTestPreviewModal from '../../components/tutor/reading/ReadingTestPreviewModal';
import { testService } from '../../services/test.service';
import '../../styles/objective-testing.css';

const QUESTION_TYPES = [
  'Multiple Choice',
  'True/False/Not Given',
  'Yes/No/Not Given',
  'Matching Headings',
  'Matching Information',
  'Matching Features',
  'Matching Sentence Endings',
  'Sentence Completion',
  'Summary Completion',
  'Note/Table/Flow-chart Completion',
  'Diagram Label Completion',
  'Short-answer Questions'
];

function TutorReadingFormPage({ testId }) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!testId);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '', difficulty: 'intermediate', duration: 60,
    publishAt: '',
  });

  const [passages, setPassages] = useState([
    { id: 1, title: '', content: '', instruction: 'Read the passage below and answer Questions 1–13.', defaultRange: '1–13', blocks: [] },
    { id: 2, title: '', content: '', instruction: 'Read the passage below and answer Questions 14–26.', defaultRange: '14–26', blocks: [] },
    { id: 3, title: '', content: '', instruction: 'Read the passage below and answer Questions 27–40.', defaultRange: '27–40', blocks: [] }
  ]);

  /**
   * Normalize a block fetched from DB (getTestById response) into the shape
   * that editors (MultipleChoiceEditor, MatchingEditor, etc.) expect.
   *
   * DB shape:  { id (UUID), type, range, questions: [{ id (UUID), text, options (JSONB), correctAnswer, correctAnswers (JSONB), explanation }] }
   * Editor shape: { id (number), type, range, options: [{id (number), text}], questions: [{id (number), text, options, correctAnswers (array of option ids), correctAnswer, explanation}] }
   */
  const normalizeBlockFromDB = (block) => {
    const blockId = Date.now() + Math.random();

    // ── Multiple Choice ──────────────────────────────────────────────────────
    // Per-question options stored in q.options as JSONB
    if (block.type === 'Multiple Choice') {
      const questions = (block.questions || []).map((q, qi) => {
        // options: [{label:'A',text:'...'}, ...] or [{id,text},...] or [string,...]
        let rawOpts = q.options;
        if (typeof rawOpts === 'string') { try { rawOpts = JSON.parse(rawOpts); } catch { rawOpts = []; } }
        rawOpts = Array.isArray(rawOpts) ? rawOpts : [];

        const normalizedOpts = rawOpts.map((opt, oi) => ({
          id: Date.now() + qi * 100 + oi + 1,
          text: typeof opt === 'object' ? (opt.text || opt.label || '') : String(opt),
        }));

        // correctAnswers: stored as JSONB — could be array of option labels/texts or indices
        let rawCA = q.correctAnswers;
        if (typeof rawCA === 'string') { try { rawCA = JSON.parse(rawCA); } catch { rawCA = []; } }
        rawCA = Array.isArray(rawCA) ? rawCA : [];
        // Map correctAnswers values to matching option ids
        const correctAnswerIds = rawCA.map(ca => {
          const caStr = String(ca);
          const match = normalizedOpts.find(o => o.text === caStr || String.fromCharCode(65 + normalizedOpts.indexOf(o)) === caStr);
          return match ? match.id : normalizedOpts[0]?.id;
        }).filter(Boolean);

        return {
          id: Date.now() + qi * 100,
          text: q.text || '',
          explanation: q.explanation || '',
          options: normalizedOpts,
          correctAnswers: correctAnswerIds,
        };
      });
      return { id: blockId, type: block.type, range: block.range || '', questions };
    }

    // ── Matching types ───────────────────────────────────────────────────────
    if (['Matching Headings', 'Matching Information', 'Matching Features', 'Matching Sentence Endings'].includes(block.type)) {
      // Block-level options pool: stored in first question's options JSONB, or block.options
      let rawOpts = block.options || (block.questions?.[0]?.options) || [];
      if (typeof rawOpts === 'string') { try { rawOpts = JSON.parse(rawOpts); } catch { rawOpts = []; } }
      rawOpts = Array.isArray(rawOpts) ? rawOpts : [];

      const normalizedOpts = rawOpts.map((opt, oi) => ({
        id: Date.now() + oi + 1,
        text: typeof opt === 'object' ? (opt.text || opt.label || '') : String(opt),
      }));

      const questions = (block.questions || []).map((q, qi) => {
        // correctAnswer is the label (A, B, C...) or option text
        const ca = q.correctAnswer || '';
        // Try to find the option id matching by label letter
        const letterIdx = ca.charCodeAt(0) - 65; // 'A'→0, 'B'→1...
        const matchId = normalizedOpts[letterIdx]?.id || normalizedOpts.find(o => o.text === ca)?.id || '';

        return {
          id: Date.now() + qi * 100,
          text: q.text || '',
          correctAnswer: matchId,
          explanation: q.explanation || '',
        };
      });

      return { id: blockId, type: block.type, range: block.range || '', options: normalizedOpts, questions };
    }

    // ── Completion / Short-answer types ──────────────────────────────────────
    const questions = (block.questions || []).map((q, qi) => ({
      id: Date.now() + qi * 100,
      text: q.text || '',
      correctAnswer: q.correctAnswer || '',
      explanation: q.explanation || '',
    }));
    return { id: blockId, type: block.type, range: block.range || '', questions };
  };



  useEffect(() => {
    if (testId) {
      const loadTest = async () => {
        try {
          const res = await testService.getTestById(testId);
          if (res.success && res.data) {
            const t = res.data;
            setFormData({
              title: t.title || '',
              description: t.description || '',
              difficulty: t.difficulty || 'intermediate',
              duration: t.duration || 60,
              publishAt: t.publishAt || ''
            });
            if (t.passages && t.passages.length > 0) {
              setPassages(t.passages.map(p => ({
                id: p.passageNumber,
                title: p.title || '',
                content: p.content || '',
                instruction: p.instruction || '',
                defaultRange: p.blocks && p.blocks.length > 0 ? p.blocks[0].range : '',
                blocks: (p.blocks || []).map(b => normalizeBlockFromDB(b))
              })));
            }
          }
        } catch (err) {
          console.error('Failed to load test', err);
          alert('Failed to load test data');
        } finally {
          setIsLoading(false);
        }
      };
      loadTest();
    }
  }, [testId]);


  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const updatePassage = (id, field, value) => {
    setPassages(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const addQuestionBlock = (passageId) => {
    setPassages(prev => prev.map(p => {
      if (p.id === passageId) {
        const newBlock = { id: Date.now(), type: '', range: '', questions: [], options: [] };
        return { ...p, blocks: [...p.blocks, newBlock] };
      }
      return p;
    }));
  };

  const updateBlock = (passageId, blockId, field, value) => {
    setPassages(prev => prev.map(p => {
      if (p.id === passageId) {
        return {
          ...p,
          blocks: p.blocks.map(b => b.id === blockId ? { ...b, [field]: value } : b)
        };
      }
      return p;
    }));
  };

  const updateWholeBlock = (passageId, updatedBlock) => {
    setPassages(prev => prev.map(p => {
      if (p.id === passageId) {
        return {
          ...p,
          blocks: p.blocks.map(b => b.id === updatedBlock.id ? updatedBlock : b)
        };
      }
      return p;
    }));
  };

  const removeBlock = (passageId, blockId) => {
    setPassages(prev => prev.map(p => {
      if (p.id === passageId) {
        return { ...p, blocks: p.blocks.filter(b => b.id !== blockId) };
      }
      return p;
    }));
  };

  const handleSaveTest = async (isDraft) => {
    try {
      if (!formData.title) {
        alert('Test title is required');
        return;
      }
      setIsSubmitting(true);
      const payload = {
        ...formData,
        passages,
        publishAt: null // Always require admin approval
      };
      
      let res;
      if (testId) {
        res = await testService.updateTest(testId, payload);
      } else {
        res = await testService.createTest(payload);
      }

      if (res.success) {
        alert('Test submitted for approval successfully!');
        navigate('/tutor/tests'); // Or wherever we should redirect
      } else {
        alert('Failed to save test: ' + (res.error?.message || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.error?.message || err.message || 'Unknown error';
      alert('An error occurred while saving the test: ' + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-5 text-center">
        <Loader className="spin" size={32} />
        <p className="mt-3 text-secondary">Loading test data...</p>
      </div>
    );
  }

  return (
    <>
    <div className="container py-4" style={{ maxWidth: 850 }}>
      <div className="page-heading">
        <h1>{testId ? 'Edit Reading Test' : 'Create Reading Test'}</h1>
        <p>{testId ? 'Modify passages and questions for this IELTS Reading test.' : 'Set up passages and questions for an IELTS Reading test.'}</p>
      </div>

      <div className="form-card mb-4">
        <h4 className="mb-3">General Information</h4>
        <div className="form-group">
          <label>Test title</label>
          <input type="text" placeholder="e.g. Cambridge 18 Reading Test 1" value={formData.title} onChange={(e) => handleChange('title', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea rows="2" placeholder="Brief description..." value={formData.description} onChange={(e) => handleChange('description', e.target.value)} />
        </div>
        <div className="row g-3">
          <div className="col-md-6 form-group">
            <label>Difficulty</label>
            <select value={formData.difficulty} onChange={(e) => handleChange('difficulty', e.target.value)}>
              <option value="">Select level</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div className="col-md-6 form-group">
            <label>Duration (minutes)</label>
            <input type="number" min="1" max="180" value={formData.duration} onChange={(e) => handleChange('duration', e.target.value)} />
          </div>
        </div>
      </div>

      {passages.map(passage => (
        <div key={passage.id} className="form-card mb-4" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h4 className="m-0">Passage {passage.id}</h4>
              <span className="body-sm text-secondary">Questions {passage.defaultRange}</span>
            </div>
            <span className={`badge-status ${passage.blocks.length > 0 ? 'published' : 'draft'}`}>
              {passage.blocks.length} Blocks
            </span>
          </div>
          
          <div className="form-group">
            <label>Passage Instruction</label>
            <input type="text" value={passage.instruction} onChange={(e) => updatePassage(passage.id, 'instruction', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Passage Title</label>
            <input type="text" placeholder={`Title of passage ${passage.id}`} value={passage.title} onChange={(e) => updatePassage(passage.id, 'title', e.target.value)} />
          </div>
          
          <div className="form-group">
            <label>Content</label>
            <textarea rows="6" placeholder="Paste passage content here..." value={passage.content} onChange={(e) => updatePassage(passage.id, 'content', e.target.value)}></textarea>
          </div>

          {/* Question Blocks */}
          {passage.blocks.length > 0 && (
            <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border-light)' }}>
              <h5 className="mb-3">Question Blocks</h5>
              {passage.blocks.map((block, idx) => (
                <div key={block.id} className="p-3 mb-3 bg-light rounded" style={{ border: '1px solid var(--border-light)' }}>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="fw-bold">Block {idx + 1}</span>
                    <button className="btn-close" style={{ fontSize: '0.75rem' }} onClick={() => removeBlock(passage.id, block.id)}></button>
                  </div>
                  <div className="row g-2">
                    <div className="col-md-8 form-group mb-0">
                      <label style={{ fontSize: '0.8rem' }}>Question Type</label>
                      <select value={block.type} onChange={(e) => updateBlock(passage.id, block.id, 'type', e.target.value)}>
                        <option value="">Select type...</option>
                        {QUESTION_TYPES.map(qt => <option key={qt} value={qt}>{qt}</option>)}
                      </select>
                    </div>
                    <div className="col-md-4 form-group mb-0">
                      <label style={{ fontSize: '0.8rem' }}>Question Range</label>
                      <input type="text" placeholder="e.g. 1-7" value={block.range} onChange={(e) => updateBlock(passage.id, block.id, 'range', e.target.value)} />
                    </div>
                  </div>
                  {block.type && (
                     <QuestionBlockEditor 
                       block={block} 
                       onChange={(updatedBlock) => updateWholeBlock(passage.id, updatedBlock)} 
                     />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-3">
            <button className="button-secondary" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.875rem' }} onClick={() => addQuestionBlock(passage.id)}>
              + Add Question Block
            </button>
          </div>
        </div>
      ))}

      <div className="form-card mb-4">
        <div className="d-flex gap-3 mt-2">
          <button className="button-secondary flex-fill" style={{ padding: '14px 0', border: '1px solid var(--primary)', color: 'var(--primary)' }} onClick={() => setShowPreview(true)}>Preview Test</button>
          <button className="button-primary flex-fill" style={{ padding: '14px 0' }} disabled={isSubmitting} onClick={() => handleSaveTest(true)}>
            {isSubmitting ? 'Saving...' : 'Submit for Approval'}
          </button>
        </div>
      </div>
    </div>

    {showPreview && (
      <ReadingTestPreviewModal
        formData={formData}
        passages={passages}
        onClose={() => setShowPreview(false)}
      />
    )}
    </>
  );
}

export default TutorReadingFormPage;
