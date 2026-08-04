import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { testService } from '../../services/test.service';
import '../../styles/objective-testing.css';

const parseInstructionMeta = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const revokeObjectUrl = (url) => {
  if (typeof url === 'string' && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

const readImageAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error || new Error('Failed to read image file.'));
  reader.readAsDataURL(file);
});

// eslint-disable-next-line no-unused-vars
function WritingPreviewModal({ formData, task1, task2, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="form-card" style={{ width: 'min(920px, 100%)', maxHeight: '90vh', overflowY: 'auto', margin: 0 }}>
        <div className="d-flex justify-content-between align-items-start mb-4">
          <div>
            <div className="body-sm text-secondary">Writing Preview</div>
            <h3 className="mb-1">{formData.title || 'Untitled Writing Test'}</h3>
            <div className="body-sm text-secondary">{formData.testType === 'academic' ? 'Academic' : 'General Training'} • {formData.duration || 60} minutes</div>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close preview"></button>
        </div>

        <section className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h4 className="mb-0">Task 1</h4>
            <span className="body-sm text-secondary">Minimum Words: 150</span>
          </div>
          <div className="body-sm text-secondary mb-2">
            {formData.testType === 'academic' ? (task1.chartType || 'Chart type not selected') : (task1.letterType || 'Letter type not selected')}
          </div>
          {task1.prompt ? <p style={{ whiteSpace: 'pre-wrap' }}>{task1.prompt}</p> : <p className="text-secondary">No Task 1 prompt entered.</p>}
          {task1.imageUrl && (
            <img
              src={task1.imageUrl}
              alt="Task 1 visual"
              style={{ width: '100%', maxHeight: 420, objectFit: 'contain', border: '1px solid var(--border-light)', borderRadius: 8, background: '#fff' }}
            />
          )}
          {task1.sampleAnswer && (
            <div className="mt-3 p-3 rounded" style={{ background: 'var(--surface-sunken)' }}>
              <strong>Band 9 Sample Answer</strong>
              <div className="mt-2" style={{ whiteSpace: 'pre-wrap' }}>{task1.sampleAnswer}</div>
            </div>
          )}
        </section>

        <section>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h4 className="mb-0">Task 2</h4>
            <span className="body-sm text-secondary">Minimum Words: 250</span>
          </div>
          <div className="body-sm text-secondary mb-2">
            {task2.essayType || 'Essay type not selected'}{task2.topicTags ? ` • ${task2.topicTags}` : ''}
          </div>
          {task2.prompt ? <p style={{ whiteSpace: 'pre-wrap' }}>{task2.prompt}</p> : <p className="text-secondary">No Task 2 prompt entered.</p>}
          {task2.sampleAnswer && (
            <div className="mt-3 p-3 rounded" style={{ background: 'var(--surface-sunken)' }}>
              <strong>Band 9 Sample Answer</strong>
              <div className="mt-2" style={{ whiteSpace: 'pre-wrap' }}>{task2.sampleAnswer}</div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function WritingTestPreviewModal({ formData, task1, task2, onClose }) {
  const [activeTask, setActiveTask] = useState(1);
  const [answers, setAnswers] = useState({ task1: '', task2: '' });
  const currentTask = activeTask === 1 ? task1 : task2;
  const currentAnswerKey = activeTask === 1 ? 'task1' : 'task2';
  const currentAnswer = answers[currentAnswerKey];
  const wordCount = currentAnswer.trim() ? currentAnswer.trim().split(/\s+/).length : 0;
  const minimumWords = activeTask === 1 ? 150 : 250;
  const taskType = activeTask === 1
    ? (formData.testType === 'academic' ? task1.chartType : task1.letterType)
    : task2.essayType;

  const updateAnswer = (value) => {
    setAnswers(prev => ({ ...prev, [currentAnswerKey]: value }));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#111', color: '#fff', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1 }}>Writing Preview Mode</span>
          <h5 className="mb-0 mt-1" style={{ fontWeight: 700 }}>{formData.title || 'Untitled Writing Test'}</h5>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div style={{ background: '#fff2', borderRadius: 20, padding: '4px 16px', fontSize: 13 }}>
            {formData.duration || 60} min
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>
            Close Preview
          </button>
        </div>
      </div>

      <div style={{ background: '#1a1a1a', padding: '0 24px', display: 'flex', gap: 4, flexShrink: 0 }}>
        {[1, 2].map(taskNumber => (
          <button
            key={taskNumber}
            onClick={() => setActiveTask(taskNumber)}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTask === taskNumber ? '3px solid #fff' : '3px solid transparent',
              color: activeTask === taskNumber ? '#fff' : 'rgba(255,255,255,0.5)',
              fontWeight: activeTask === taskNumber ? 700 : 400,
              fontSize: 14,
              cursor: 'pointer'
            }}
          >
            Task {taskNumber}
            <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>
              ({taskNumber === 1 ? '150+' : '250+'} words)
            </span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: '#fafafa' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', borderRight: '1px solid #e5e5e5', background: '#fff' }}>
          <div className="mb-3 p-3 rounded" style={{ background: '#fffbe6', border: '1px solid #fde68a', fontSize: 14 }}>
            You should spend about {activeTask === 1 ? '20' : '40'} minutes on this task. Write at least {minimumWords} words.
          </div>

          <div className="d-flex justify-content-between align-items-center mb-2">
            <h2 style={{ fontWeight: 700, fontSize: '1.5rem', margin: 0 }}>Writing Task {activeTask}</h2>
            <span className="body-sm text-secondary">{taskType || 'Type not selected'}</span>
          </div>

          {currentTask.prompt ? (
            <div style={{ fontSize: '1rem', lineHeight: 1.75, whiteSpace: 'pre-wrap', marginBottom: 24 }}>
              {currentTask.prompt}
            </div>
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: '#aaa', border: '2px dashed #ddd', borderRadius: 12, marginTop: 24 }}>
              No prompt entered yet.
            </div>
          )}

          {activeTask === 1 && task1.imageUrl && (
            <img
              src={task1.imageUrl}
              alt="Task 1 visual"
              style={{ width: '100%', maxHeight: 520, objectFit: 'contain', border: '1px solid #e5e5e5', borderRadius: 8, background: '#fff' }}
            />
          )}

          {activeTask === 2 && task2.topicTags && (
            <div className="mt-3 body-sm text-secondary">Topic tags: {task2.topicTags}</div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', background: '#fafafa', display: 'flex', flexDirection: 'column' }}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="mb-0">Your Answer</h4>
            <span style={{ fontSize: 13, color: wordCount >= minimumWords ? '#15803d' : '#666', fontWeight: 600 }}>
              {wordCount} / {minimumWords} words
            </span>
          </div>
          <textarea
            value={currentAnswer}
            onChange={(e) => updateAnswer(e.target.value)}
            placeholder={`Write your Task ${activeTask} answer here...`}
            style={{ flex: 1, minHeight: 420, resize: 'vertical', border: '1px solid #ddd', borderRadius: 8, padding: 18, fontSize: 16, lineHeight: 1.7, outline: 'none', background: '#fff' }}
          />
          {currentTask.sampleAnswer && (
            <details className="mt-3">
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Band 9 Sample Answer</summary>
              <div className="mt-2 p-3 rounded" style={{ background: '#fff', whiteSpace: 'pre-wrap', border: '1px solid #e5e5e5' }}>
                {currentTask.sampleAnswer}
              </div>
            </details>
          )}
        </div>
      </div>

      <div style={{ background: '#fff', borderTop: '1px solid #e5e5e5', padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <button disabled={activeTask === 1} onClick={() => setActiveTask(1)} style={{ padding: '8px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: activeTask === 1 ? 'not-allowed' : 'pointer', opacity: activeTask === 1 ? 0.4 : 1, fontSize: 14 }}>
          Previous Task
        </button>
        <span style={{ fontSize: 13, color: '#888' }}>Task {activeTask} of 2</span>
        <button disabled={activeTask === 2} onClick={() => setActiveTask(2)} style={{ padding: '8px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: activeTask === 2 ? 'not-allowed' : 'pointer', opacity: activeTask === 2 ? 0.4 : 1, fontSize: 14 }}>
          Next Task
        </button>
      </div>
    </div>
  );
}

function TutorWritingFormPage({ testId }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(!!testId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '', difficulty: 'intermediate', duration: 60,
    testType: 'academic'
  });

  const [task1, setTask1] = useState({
    chartType: '', letterType: '', prompt: '', sampleAnswer: '', imageUrl: '', imageName: ''
  });

  const [task2, setTask2] = useState({
    essayType: '', topicTags: '', prompt: '', sampleAnswer: ''
  });

  useEffect(() => {
    if (!testId) return;

    const loadTest = async () => {
      try {
        const res = await testService.getTestById(testId);
        if (res.success && res.data) {
          const test = res.data;
          const task1Passage = test.passages?.[0] || {};
          const task2Passage = test.passages?.[1] || {};
          const task1Meta = parseInstructionMeta(task1Passage.instruction);
          const task2Meta = parseInstructionMeta(task2Passage.instruction);

          setFormData({
            title: test.title || '',
            description: test.description || '',
            difficulty: test.difficulty || '',
            duration: test.duration || 60,
            testType: task1Meta.testType || 'academic',
          });
          setTask1({
            chartType: task1Meta.chartType || '',
            letterType: task1Meta.letterType || '',
            prompt: task1Passage.content || '',
            sampleAnswer: task1Meta.sampleAnswer || '',
            imageUrl: task1Meta.imageUrl || '',
            imageName: task1Meta.imageName || '',
          });
          setTask2({
            essayType: task2Meta.essayType || '',
            topicTags: task2Meta.topicTags || '',
            prompt: task2Passage.content || '',
            sampleAnswer: task2Meta.sampleAnswer || '',
          });
        }
      } catch (err) {
        console.error('Failed to load writing test', err);
        alert('Failed to load writing test data');
      } finally {
        setIsLoading(false);
      }
    };

    loadTest();
  }, [testId]);

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const handleTask1Change = (field, value) => setTask1(prev => ({ ...prev, [field]: value }));
  const handleTask2Change = (field, value) => setTask2(prev => ({ ...prev, [field]: value }));

  const handleTask1ImageChange = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Please choose an image smaller than 5MB.');
      return;
    }

    try {
      const imageUrl = await readImageAsDataUrl(file);
      setTask1(prev => {
        revokeObjectUrl(prev.imageUrl);
        return {
          ...prev,
          imageUrl,
          imageName: file.name
        };
      });
    } catch (err) {
      console.error('Failed to read Task 1 image', err);
      alert('Failed to read the selected image.');
    }
  };

  const removeTask1Image = () => {
    setTask1(prev => {
      revokeObjectUrl(prev.imageUrl);
      return { ...prev, imageUrl: '', imageName: '' };
    });
  };

  const buildWritingPayload = (status) => ({
    ...formData,
    skill: 'writing',
    status,
    isPublished: status === 'published',
    publishAt: status === 'published' ? new Date().toISOString() : null,
    task1,
    task2,
    updatedAt: new Date().toISOString()
  });

  const saveWritingTest = async (status) => {
    if (!formData.title.trim()) {
      alert('Test title is required.');
      return;
    }
    if (!task1.prompt.trim() || !task2.prompt.trim()) {
      alert('Please enter prompts for both Task 1 and Task 2.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = buildWritingPayload(status);
      const res = testId
        ? await testService.updateTest(testId, payload)
        : await testService.createTest(payload);

      if (res.success) {
        alert(status === 'published' ? 'Writing test saved.' : 'Writing draft saved.');
        navigate('/tutor/tests');
      } else {
        alert('Failed to save writing test: ' + (res.error?.message || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.error?.message || err.message || 'Unknown error';
      alert('An error occurred while saving the writing test: ' + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-5 text-center">
        <Loader className="spin" size={32} />
        <p className="mt-3 text-secondary">Loading writing test...</p>
      </div>
    );
  }

  return (
    <>
    <div className="container py-4" style={{ maxWidth: 850 }}>
      <div className="page-heading">
        <h1>{testId ? 'Edit Writing Test' : 'Create Writing Test'}</h1>
        <p>{testId ? 'Update Task 1 and Task 2 prompts for this IELTS Writing test.' : 'Set up Task 1 and Task 2 prompts for an IELTS Writing test.'}</p>
      </div>

      <div className="form-card mb-4">
        <h4 className="mb-3">General Information</h4>
        <div className="form-group">
          <label>Test title</label>
          <input type="text" placeholder="e.g. Cambridge 18 Writing Test 1" value={formData.title} onChange={(e) => handleChange('title', e.target.value)} />
        </div>
        
        <div className="row g-3">
          <div className="col-md-4 form-group">
            <label>Test Type</label>
            <select value={formData.testType} onChange={(e) => handleChange('testType', e.target.value)}>
              <option value="academic">Academic</option>
              <option value="general">General Training</option>
            </select>
          </div>
          <div className="col-md-4 form-group">
            <label>Difficulty</label>
            <select value={formData.difficulty} onChange={(e) => handleChange('difficulty', e.target.value)}>
              <option value="">Select level</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div className="col-md-4 form-group">
            <label>Duration (minutes)</label>
            <input type="number" min="1" max="180" value={formData.duration} onChange={(e) => handleChange('duration', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Task 1 */}
      <div className="form-card mb-4" style={{ borderLeft: '4px solid var(--danger)' }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="m-0">Task 1</h4>
          <span className="body-sm fw-medium text-secondary">Minimum Words: 150</span>
        </div>
        
        {formData.testType === 'academic' ? (
          <div className="form-group">
            <label>Chart Type</label>
            <select value={task1.chartType} onChange={(e) => handleTask1Change('chartType', e.target.value)}>
              <option value="">Select Chart Type...</option>
              <option value="Bar Chart">Bar Chart</option>
              <option value="Line Graph">Line Graph</option>
              <option value="Pie Chart">Pie Chart</option>
              <option value="Table">Table</option>
              <option value="Map">Map</option>
              <option value="Process Diagram">Process Diagram</option>
              <option value="Multiple Charts">Multiple Charts</option>
            </select>
          </div>
        ) : (
          <div className="form-group">
            <label>Letter Type</label>
            <select value={task1.letterType} onChange={(e) => handleTask1Change('letterType', e.target.value)}>
              <option value="">Select Letter Type...</option>
              <option value="Formal">Formal</option>
              <option value="Semi-formal">Semi-formal</option>
              <option value="Informal">Informal</option>
            </select>
          </div>
        )}

        <div className="form-group">
          <label>Prompt</label>
          <textarea rows="3" placeholder={formData.testType === 'academic' ? "The chart below shows..." : "You recently stayed at a hotel..."} value={task1.prompt} onChange={(e) => handleTask1Change('prompt', e.target.value)}></textarea>
        </div>

        {formData.testType === 'academic' && (
          <div className="form-group">
            <label>Image Upload</label>
            <div className="d-flex gap-2">
              <input type="file" className="form-control" accept="image/*" onChange={(e) => handleTask1ImageChange(e.target.files?.[0])} />
            </div>
            {task1.imageUrl && (
              <div className="mt-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="body-sm text-secondary">{task1.imageName}</span>
                  <button type="button" className="btn btn-sm text-danger" onClick={removeTask1Image}>Remove image</button>
                </div>
                <img
                  src={task1.imageUrl}
                  alt="Task 1 preview"
                  style={{ width: '100%', maxHeight: 360, objectFit: 'contain', border: '1px solid var(--border-light)', borderRadius: 8, background: '#fff' }}
                />
              </div>
            )}
          </div>
        )}

        <div className="form-group mb-0 mt-4">
          <label className="text-secondary">Band 9 Sample Answer (Optional)</label>
          <textarea rows="3" placeholder="Provide a sample answer for AI reference and student review..." value={task1.sampleAnswer} onChange={(e) => handleTask1Change('sampleAnswer', e.target.value)}></textarea>
        </div>
      </div>

      {/* Task 2 */}
      <div className="form-card mb-4" style={{ borderLeft: '4px solid var(--danger)' }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="m-0">Task 2</h4>
          <span className="body-sm fw-medium text-secondary">Minimum Words: 250</span>
        </div>

        <div className="row g-3">
          <div className="col-md-6 form-group">
            <label>Essay Type</label>
            <select value={task2.essayType} onChange={(e) => handleTask2Change('essayType', e.target.value)}>
              <option value="">Select Essay Type...</option>
              <option value="Opinion">Opinion</option>
              <option value="Discussion">Discussion</option>
              <option value="Advantages/Disadvantages">Advantages/Disadvantages</option>
              <option value="Problem/Solution">Problem/Solution</option>
              <option value="Mixed">Mixed (Two-part)</option>
            </select>
          </div>
          <div className="col-md-6 form-group">
            <label>Topic Tags</label>
            <input type="text" placeholder="e.g. Environment, Technology..." value={task2.topicTags} onChange={(e) => handleTask2Change('topicTags', e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label>Essay Prompt</label>
          <textarea rows="4" placeholder="Some people think that... To what extent do you agree or disagree?" value={task2.prompt} onChange={(e) => handleTask2Change('prompt', e.target.value)}></textarea>
        </div>

        <div className="form-group mb-0 mt-4">
          <label className="text-secondary">Band 9 Sample Answer (Optional)</label>
          <textarea rows="3" placeholder="Provide a sample answer for AI reference and student review..." value={task2.sampleAnswer} onChange={(e) => handleTask2Change('sampleAnswer', e.target.value)}></textarea>
        </div>
      </div>

      <div className="form-card mb-4">
        <div className="d-flex gap-3 mt-2">
          <button className="button-secondary flex-fill" style={{ padding: '14px 0', border: '1px solid var(--primary)', color: 'var(--primary)' }} onClick={() => setShowPreview(true)} disabled={isSubmitting}>Preview Test</button>
          <button className="button-primary flex-fill" style={{ padding: '14px 0' }} onClick={() => saveWritingTest('published')} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Test'}
          </button>
          <button className="button-secondary flex-fill" style={{ padding: '14px 0' }} onClick={() => saveWritingTest('draft')} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save as Draft'}
          </button>
        </div>
      </div>
    </div>

    {showPreview && (
      <WritingTestPreviewModal
        formData={formData}
        task1={task1}
        task2={task2}
        onClose={() => setShowPreview(false)}
      />
    )}
    </>
  );
}

export default TutorWritingFormPage;
