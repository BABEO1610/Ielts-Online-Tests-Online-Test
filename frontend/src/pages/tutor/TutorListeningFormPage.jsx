import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, Play } from 'lucide-react';
import ListeningQuestionBlockEditor from '../../components/tutor/listening/ListeningQuestionBlockEditor';
import ListeningTestPreviewModal from '../../components/tutor/listening/ListeningTestPreviewModal';
import BulkAddModal from '../../components/tutor/BulkAddModal';
import { testService } from '../../services/test.service';
import api from '../../services/api';
import '../../styles/objective-testing.css';

const LISTENING_QUESTION_TYPES = [
  'Form Completion',
  'Multiple Choice',
  'Matching',
  'Map/Plan/Diagram Labeling',
  'Sentence Completion',
  'Short-answer Questions',
  'Note/Table/Flow-chart Completion',
  'Notes Completion',
];

// Map internal parser type codes → dropdown display strings
// ponytail: only codes that parseSmartText actually emits
const PARSER_TYPE_TO_DISPLAY = {
  MULTIPLE_CHOICE_SINGLE: 'Multiple Choice',
  MULTIPLE_CHOICE_MULTI: 'Multiple Choice',
  MATCHING_INFORMATION: 'Matching',
  MATCHING_HEADINGS: 'Matching',
  SENTENCE_COMPLETION: 'Sentence Completion',
  NOTES_COMPLETION: 'Notes Completion',
  NOTE_COMPLETION: 'Note/Table/Flow-chart Completion',
  TRUE_FALSE_NOT_GIVEN: 'Note/Table/Flow-chart Completion', // no direct match, best fallback
  YES_NO_NOT_GIVEN: 'Note/Table/Flow-chart Completion',
  FORM_COMPLETION: 'Form Completion',
  SHORT_ANSWER: 'Short-answer Questions',
};

const normalizeBlockType = (type) => PARSER_TYPE_TO_DISPLAY[type] || type || '';

// ponytail: old data sometimes stored serialized questions JSON in content field.
// If content looks like a JSON array/object, discard it — it's garbage legacy data.
const sanitizeBlockContent = (content) => {
  if (!content || typeof content !== 'string') return content || '';
  const trimmed = content.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try { JSON.parse(trimmed); return ''; } catch { /* not JSON, keep it */ }
  }
  return content;
};

const DEFAULT_SECTIONS = [
  { id: 1, title: '', transcript: '', showTranscript: true, defaultRange: '1-10', blocks: [] },
  { id: 2, title: '', transcript: '', showTranscript: true, defaultRange: '11-20', blocks: [] },
  { id: 3, title: '', transcript: '', showTranscript: true, defaultRange: '21-30', blocks: [] },
  { id: 4, title: '', transcript: '', showTranscript: true, defaultRange: '31-40', blocks: [] },
];

const readAudioAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error || new Error('Failed to read audio file.'));
  reader.readAsDataURL(file);
});

function TutorListeningFormPage({ testId }) {
  const navigate = useNavigate();
  const audioFileInputRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!testId);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState({ visible: false, targetSectionId: null });
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'intermediate',
    duration: 30,
    audioUrl: '',
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
            audioUrl: test.audioUrl || '',
          });

          if (Array.isArray(test.sections) && test.sections.length > 0) {
            setSections(test.sections.map((section, idx) => ({
              id: section.sectionNumber || idx + 1,
              title: section.title || '',
              transcript: section.transcript || '',
              showTranscript: section.showTranscript !== false,
              defaultRange: section.defaultRange || `${idx * 10 + 1}-${idx * 10 + 10}`,
              blocks: (section.blocks || []).map(b => ({
                ...b,
                type: normalizeBlockType(b.type),
                content: sanitizeBlockContent(b.content),
              })),
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

  const handleBulkAddConfirm = (newBlocks) => {
    const normalized = newBlocks.map((b, i) => ({
      id: b.id ?? Date.now() + i,
      type: normalizeBlockType(b.type),
      range: b.range || b.groupRange || '',
      content: b.content || b.instruction || '',
      questions: b.questions || [],
      options: b.options || [],
    }));
    setSections(prev => prev.map(s => {
      if (s.id === showBulkAdd.targetSectionId) {
        return { ...s, blocks: [...s.blocks, ...normalized] };
      }
      return s;
    }));
    setShowBulkAdd({ visible: false, targetSectionId: null });
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

  const handleAudioUploadClick = () => {
    audioFileInputRef.current?.click();
  };

  const handleAudioFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      alert('Please choose an audio file.');
      event.target.value = '';
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert('Please choose an audio file smaller than 50MB.');
      event.target.value = '';
      return;
    }

    setIsUploadingAudio(true);
    try {
      const uploadData = new FormData();
      uploadData.append('audio', file);
      
      const res = await api.post('/audio/upload', uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (res.data.success) {
        handleChange('audioUrl', res.data.data.url);
        setShowAudioPlayer(true);
      } else {
        throw new Error(res.data.error?.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Failed to upload audio file', err);
      alert('Failed to upload the selected audio file. ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setIsUploadingAudio(false);
      event.target.value = '';
    }
  };

  const handleToggleAudioPlayer = () => {
    setShowAudioPlayer(prev => !prev);
  };

  const calculateTotalQuestions = () => {
    let total = 0;
    sections.forEach(sec => {
      sec.blocks.forEach(block => {
        const rangeStr = block.questionRange || block.range;
        if (rangeStr) {
          const range = String(rangeStr).trim();
          if (range.includes('-')) {
            const [start, end] = range.split('-').map(Number);
            if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
              total += end - start + 1;
              return;
            }
          }
          const single = Number(range);
          if (!Number.isNaN(single)) {
            total += 1;
            return;
          }
        }
        
        if (Array.isArray(block.questionNumbers)) {
          total += block.questionNumbers.length;
          return;
        }
        
        if (Array.isArray(block.questions)) {
          let blockTotal = 0;
          block.questions.forEach(q => {
            if (Array.isArray(q.questionNumbers)) {
              blockTotal += q.questionNumbers.length;
            } else {
              blockTotal += 1;
            }
          });
          if (blockTotal > 0) {
             total += blockTotal;
             return;
          }
        }
      });
    });
    return total;
  };

  const buildPayload = () => ({
    title: formData.title,
    description: formData.description,
    difficulty: formData.difficulty,
    duration: formData.duration,
    audioUrl: formData.audioUrl,
    skill: 'listening',
    sections,
    publishAt: null, // Always require admin approval
  });

  const handleSaveTest = async (isDraft) => {
    try {
      // Validation
      if (!formData.title.trim()) {
        alert('Test title is required');
        return;
      }

      if (!formData.audioUrl && !isDraft) {
        alert('Audio file is required before publishing');
        return;
      }

      // Warning for non-standard question count (not blocking)
      if (totalQuestions !== 40 && !isDraft) {
        const confirmed = window.confirm(
          `Standard IELTS Listening test has 40 questions.\n` +
          `Current test has ${totalQuestions} questions.\n\n` +
          `Do you want to publish anyway?`
        );
        if (!confirmed) return;
      }

      setIsSubmitting(true);
      const payload = buildPayload();
      const res = testId
        ? await testService.updateTest(testId, payload)
        : await testService.createTest(payload);

      if (res.success) {
        alert('Test submitted for approval successfully!');
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

        <div className="form-card mb-4" style={{ borderLeft: '4px solid var(--primary)' }}>
          <h4 className="mb-3">Audio File (All 4 Sections)</h4>
          <p className="body-sm text-secondary mb-3">
            Upload ONE audio file containing all 4 sections of the listening test. The audio will play continuously from start to finish.
          </p>
          
          <div className="form-group">
            <label>Audio File or URL</label>
            <div className="d-flex gap-2 align-items-center">
              <input 
                type="text" 
                placeholder="https://... or upload a file" 
                style={{ flex: 1 }} 
                value={formData.audioUrl} 
                onChange={(e) => handleChange('audioUrl', e.target.value)} 
              />
              <button 
                type="button" 
                className="button-secondary" 
                style={{ width: 'auto', padding: '0 16px' }} 
                onClick={handleAudioUploadClick}
                disabled={isUploadingAudio}
              >
                {isUploadingAudio ? 'Uploading...' : 'Upload'}
              </button>
              {formData.audioUrl && (
                <button 
                  type="button" 
                  className="button-secondary d-inline-flex align-items-center gap-2" 
                  style={{ width: 'auto', padding: '0 16px', color: 'var(--primary)', borderColor: 'var(--primary)' }} 
                  onClick={handleToggleAudioPlayer}
                >
                  <Play size={16} /> {showAudioPlayer ? 'Hide' : 'Preview'} Audio
                </button>
              )}
            </div>
            {showAudioPlayer && formData.audioUrl && (
              <audio controls src={formData.audioUrl} className="mt-2" style={{ width: '100%' }}>
                Your browser does not support audio playback.
              </audio>
            )}
            {isUploadingAudio && (
              <div className="mt-2 body-sm text-secondary">
                <Loader className="spin d-inline-block me-2" size={14} />
                Uploading audio file... This may take a moment for large files.
              </div>
            )}
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
              <button type="button" className="button-secondary ms-2 border" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.875rem', backgroundColor: '#e9ecef', color: '#495057' }} onClick={() => setShowBulkAdd({ visible: true, targetSectionId: section.id })}>
                + Nhập Nhanh (Bulk Add)
              </button>
            </div>
          </div>
        ))}

        <div className="form-card mb-4 text-center py-4" style={{ backgroundColor: 'var(--surface-sunken)', border: 'none' }}>
          <h4 className="mb-1">Summary</h4>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: totalQuestions === 40 ? 'var(--success)' : (totalQuestions > 40 ? 'var(--danger)' : 'var(--warning)') }}>
            Total Questions: {totalQuestions} / 40
          </div>
          {totalQuestions !== 40 && (
            <div className="body-sm mt-2" style={{ color: totalQuestions > 40 ? 'var(--danger)' : 'var(--warning)' }}>
              {totalQuestions < 40 && '⚠️ Standard IELTS Listening test has 40 questions.'}
              {totalQuestions > 40 && '❌ Too many questions! IELTS Listening test must have exactly 40 questions.'}
            </div>
          )}
          {totalQuestions === 40 && (
            <div className="body-sm text-success mt-1">
              ✅ Perfect! Standard IELTS question count.
            </div>
          )}
        </div>

        <div className="form-card mb-4">
          <div className="d-flex gap-3 mt-2">
            <button type="button" className="button-secondary flex-fill" style={{ padding: '14px 0', border: '1px solid var(--primary)', color: 'var(--primary)' }} onClick={() => setShowPreview(true)}>Preview Test</button>
            <button type="button" className="button-primary flex-fill" style={{ padding: '14px 0' }} disabled={isSubmitting} onClick={() => handleSaveTest(true)}>
              {isSubmitting ? 'Saving...' : 'Submit for Approval'}
            </button>
          </div>
        </div>
        <input ref={audioFileInputRef} type="file" accept="audio/*" className="d-none" onChange={handleAudioFileChange} />
      </div>

      {showPreview && (
        <ListeningTestPreviewModal
          formData={formData}
          sections={sections}
          audioUrl={formData.audioUrl}
          onClose={() => setShowPreview(false)}
        />
      )}

      {showBulkAdd.visible && (
        <BulkAddModal
          onClose={() => setShowBulkAdd({ visible: false, targetSectionId: null })}
          onConfirm={handleBulkAddConfirm}
          testType="listening"
        />
      )}
    </>
  );
}

export default TutorListeningFormPage;
