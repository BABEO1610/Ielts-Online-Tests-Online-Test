import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, Play } from 'lucide-react';
import ListeningQuestionBlockEditor from '../../components/tutor/listening/ListeningQuestionBlockEditor';
import ListeningTestPreviewModal from '../../components/tutor/listening/ListeningTestPreviewModal';
import { testService } from '../../services/test.service';
import '../../styles/objective-testing.css';

const LISTENING_QUESTION_TYPES = [
  'Form Completion',
  'Multiple Choice',
  'Matching',
  'Map/Plan/Diagram Labeling',
  'Sentence Completion',
  'Short-answer Questions',
  'Note/Table/Flow-chart Completion',
];

const DEFAULT_SECTIONS = [
  { id: 1, title: '', audioUrl: '', transcript: '', showTranscript: true, defaultRange: '1-10', blocks: [] },
  { id: 2, title: '', audioUrl: '', transcript: '', showTranscript: true, defaultRange: '11-20', blocks: [] },
  { id: 3, title: '', audioUrl: '', transcript: '', showTranscript: true, defaultRange: '21-30', blocks: [] },
  { id: 4, title: '', audioUrl: '', transcript: '', showTranscript: true, defaultRange: '31-40', blocks: [] },
];

const readAudioAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error || new Error('Failed to read audio file.'));
  reader.readAsDataURL(file);
});

function TutorListeningFormPage({ testId }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [uploadTargetSectionId, setUploadTargetSectionId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!testId);
  const [showPreview, setShowPreview] = useState(false);
  const [previewAudioSectionId, setPreviewAudioSectionId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'intermediate',
    duration: 30,
  });

  const [sections, setSections] = useState(DEFAULT_SECTIONS);

  useEffect(() => {
    if (!testId) return;

    const loadTest = async () => {
      try {
        const res = await testService.getTestById(testId);
        if (res.success && res.data) {
          const test = res.data;
          setFormData({
            title: test.title || '',
            description: test.description || '',
            difficulty: test.difficulty || 'intermediate',
            duration: test.duration || 30,
          });

          if (Array.isArray(test.sections) && test.sections.length > 0) {
            setSections(test.sections.map((section, idx) => ({
              id: section.sectionNumber || idx + 1,
              title: section.title || '',
              audioUrl: section.audioUrl || '',
              transcript: section.transcript || '',
              showTranscript: section.showTranscript !== false,
              defaultRange: section.defaultRange || `${idx * 10 + 1}-${idx * 10 + 10}`,
              blocks: section.blocks || [],
            })));
          }
        }
      } catch (err) {
        console.error('Failed to load listening test', err);
        alert('Failed to load test data');
      } finally {
        setIsLoading(false);
      }
    };

    loadTest();
  }, [testId]);

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const updateSection = (id, field, value) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const addQuestionBlock = (sectionId) => {
    setSections(prev => prev.map(s => {
      if (s.id === sectionId) {
        const newBlock = { id: Date.now(), type: '', range: '', questions: [] };
        return { ...s, blocks: [...s.blocks, newBlock] };
      }
      return s;
    }));
  };

  const updateBlock = (sectionId, blockId, field, value) => {
    setSections(prev => prev.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          blocks: s.blocks.map(b => b.id === blockId ? { ...b, [field]: value } : b),
        };
      }
      return s;
    }));
  };

  const updateWholeBlock = (sectionId, updatedBlock) => {
    setSections(prev => prev.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          blocks: s.blocks.map(b => b.id === updatedBlock.id ? updatedBlock : b),
        };
      }
      return s;
    }));
  };

  const removeBlock = (sectionId, blockId) => {
    setSections(prev => prev.map(s => {
      if (s.id === sectionId) {
        return { ...s, blocks: s.blocks.filter(b => b.id !== blockId) };
      }
      return s;
    }));
  };

  const handleUploadClick = (sectionId) => {
    setUploadTargetSectionId(sectionId);
    fileInputRef.current?.click();
  };

  const handleAudioFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !uploadTargetSectionId) return;

    if (!file.type.startsWith('audio/')) {
      alert('Please choose an audio file.');
      event.target.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert('Please choose an audio file smaller than 8MB.');
      event.target.value = '';
      return;
    }

    try {
      const audioUrl = await readAudioAsDataUrl(file);
      updateSection(uploadTargetSectionId, 'audioUrl', audioUrl);
      setPreviewAudioSectionId(uploadTargetSectionId);
    } catch (err) {
      console.error('Failed to read audio file', err);
      alert('Failed to read the selected audio file.');
    } finally {
      event.target.value = '';
    }
  };

  const handlePreviewAudio = (sectionId) => {
    setPreviewAudioSectionId(prev => prev === sectionId ? null : sectionId);
  };

  const calculateTotalQuestions = () => {
    let total = 0;
    sections.forEach(sec => {
      sec.blocks.forEach(b => {
        if (b.questions && b.questions.length > 0) {
          total += b.questions.length;
        } else if (b.range && b.range.includes('-')) {
          const parts = b.range.split('-');
          const start = parseInt(parts[0].trim(), 10);
          const end = parseInt(parts[1].trim(), 10);
          if (!isNaN(start) && !isNaN(end) && end >= start) {
            total += end - start + 1;
          }
        }
      });
    });
    return total;
  };

  const buildPayload = (isDraft) => ({
    ...formData,
    skill: 'listening',
    sections,
    publishAt: isDraft ? null : new Date().toISOString(),
  });

  const handleSaveTest = async (isDraft) => {
    try {
      if (!formData.title.trim()) {
        alert('Test title is required');
        return;
      }

      setIsSubmitting(true);
      const payload = buildPayload(isDraft);
      const res = testId
        ? await testService.updateTest(testId, payload)
        : await testService.createTest(payload);

      if (res.success) {
        alert(isDraft ? 'Draft saved successfully!' : 'Test saved and published!');
        navigate('/tutor/tests');
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

  const totalQuestions = calculateTotalQuestions();

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
          <h1>{testId ? 'Edit Listening Test' : 'Create Listening Test'}</h1>
          <p>Set up audio sections and questions for an IELTS Listening test.</p>
        </div>

        <div className="form-card mb-4">
          <h4 className="mb-3">General Information</h4>
          <div className="form-group">
            <label>Test title</label>
            <input type="text" placeholder="e.g. Cambridge 18 Listening Test 1" value={formData.title} onChange={(e) => handleChange('title', e.target.value)} />
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

        {sections.map(section => (
          <div key={section.id} className="form-card mb-4" style={{ borderLeft: '4px solid var(--warning)' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h4 className="m-0">Section {section.id}</h4>
                <span className="body-sm text-secondary">Questions {section.defaultRange}</span>
              </div>
              <span className={`badge-status ${section.blocks.length > 0 ? 'published' : 'draft'}`}>
                {section.blocks.length} Blocks
              </span>
            </div>

            <div className="form-group">
              <label>Section Title</label>
              <input type="text" placeholder="e.g. Booking a Hotel Room" value={section.title} onChange={(e) => updateSection(section.id, 'title', e.target.value)} />
            </div>

            <div className="form-group">
              <label>Audio File or URL</label>
              <div className="d-flex gap-2 align-items-center">
                <input type="text" placeholder="https://..." style={{ flex: 1 }} value={section.audioUrl} onChange={(e) => updateSection(section.id, 'audioUrl', e.target.value)} />
                <button type="button" className="button-secondary" style={{ width: 'auto', padding: '0 16px' }} onClick={() => handleUploadClick(section.id)}>Upload</button>
                {section.audioUrl && (
                  <button type="button" className="button-secondary d-inline-flex align-items-center gap-2" style={{ width: 'auto', padding: '0 16px', color: 'var(--primary)', borderColor: 'var(--primary)' }} onClick={() => handlePreviewAudio(section.id)}>
                    <Play size={16} /> Preview Audio
                  </button>
                )}
              </div>
              {previewAudioSectionId === section.id && section.audioUrl && (
                <audio controls src={section.audioUrl} className="mt-2" style={{ width: '100%' }}>
                  Your browser does not support audio playback.
                </audio>
              )}
            </div>

            <div className="form-group">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="mb-0">Transcript</label>
                <div className="d-flex align-items-center gap-2">
                  <span className="body-sm text-secondary">Show transcript after test?</span>
                  <div className="form-check form-switch m-0">
                    <input className="form-check-input" type="checkbox" checked={section.showTranscript} onChange={(e) => updateSection(section.id, 'showTranscript', e.target.checked)} />
                  </div>
                </div>
              </div>
              <textarea rows="3" placeholder="Audio transcript..." value={section.transcript} onChange={(e) => updateSection(section.id, 'transcript', e.target.value)}></textarea>
            </div>

            {section.blocks.length > 0 && (
              <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border-light)' }}>
                <h5 className="mb-3">Question Blocks</h5>
                {section.blocks.map((block, idx) => (
                  <div key={block.id} className="p-3 mb-3 bg-light rounded" style={{ border: '1px solid var(--border-light)' }}>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="fw-bold">Block {idx + 1}</span>
                      <button type="button" className="btn-close" style={{ fontSize: '0.75rem' }} onClick={() => removeBlock(section.id, block.id)}></button>
                    </div>
                    <div className="row g-2">
                      <div className="col-md-8 form-group mb-0">
                        <label style={{ fontSize: '0.8rem' }}>Question Type</label>
                        <select value={block.type} onChange={(e) => updateBlock(section.id, block.id, 'type', e.target.value)}>
                          <option value="">Select Question Type...</option>
                          {LISTENING_QUESTION_TYPES.map(qt => <option key={qt} value={qt}>{qt}</option>)}
                        </select>
                      </div>
                      <div className="col-md-4 form-group mb-0">
                        <label style={{ fontSize: '0.8rem' }}>Question Range</label>
                        <input type="text" placeholder="e.g. 1-10" value={block.range} onChange={(e) => updateBlock(section.id, block.id, 'range', e.target.value)} />
                      </div>
                    </div>
                    {block.type && (
                      <ListeningQuestionBlockEditor
                        block={block}
                        onChange={(updatedBlock) => updateWholeBlock(section.id, updatedBlock)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3">
              <button type="button" className="button-secondary" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.875rem' }} onClick={() => addQuestionBlock(section.id)}>
                + Add Question Block
              </button>
            </div>
          </div>
        ))}

        <div className="form-card mb-4 text-center py-4" style={{ backgroundColor: 'var(--surface-sunken)', border: 'none' }}>
          <h4 className="mb-1">Summary</h4>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: totalQuestions === 40 ? 'var(--success)' : (totalQuestions > 40 ? 'var(--danger)' : 'var(--text-primary)') }}>
            Total Questions: {totalQuestions} / 40
          </div>
          {totalQuestions !== 40 && (
            <div className="body-sm text-secondary mt-1">
              Please ensure you have exactly 40 questions before publishing.
            </div>
          )}
        </div>

        <div className="form-card mb-4">
          <div className="d-flex gap-3 mt-2">
            <button type="button" className="button-secondary flex-fill" style={{ padding: '14px 0', border: '1px solid var(--primary)', color: 'var(--primary)' }} onClick={() => setShowPreview(true)}>Preview Test</button>
            <button type="button" className="button-secondary flex-fill" style={{ padding: '14px 0' }} disabled={isSubmitting} onClick={() => handleSaveTest(true)}>
              {isSubmitting ? 'Saving...' : 'Save as Draft'}
            </button>
            <button type="button" className="button-primary flex-fill" style={{ padding: '14px 0' }} disabled={isSubmitting} onClick={() => handleSaveTest(false)}>
              {isSubmitting ? 'Saving...' : 'Publish Test'}
            </button>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="audio/*" className="d-none" onChange={handleAudioFileChange} />
      </div>

      {showPreview && (
        <ListeningTestPreviewModal
          formData={formData}
          sections={sections}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}

export default TutorListeningFormPage;
