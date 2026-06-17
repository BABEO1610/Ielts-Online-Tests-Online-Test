import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader, Mic, X } from 'lucide-react';
import { testService } from '../../services/test.service';
import '../../styles/objective-testing.css';

const splitLines = (value) => value.split('\n').map(line => line.trim()).filter(Boolean);

function SpeakingTestPreviewModal({ formData, part1, part2, part3, onClose }) {
  const [activePartIdx, setActivePartIdx] = useState(0);
  const parts = [
    {
      title: 'Part 1: Introduction & Interview',
      subtitle: part1.topics || 'No topics entered',
      body: splitLines(part1.questions),
      empty: 'No Part 1 questions entered yet.',
      meta: '4-5 minutes'
    },
    {
      title: 'Part 2: Long Turn',
      subtitle: part2.prompt || 'No cue card prompt entered',
      body: splitLines(part2.bulletPoints),
      empty: 'No cue card bullet points entered yet.',
      meta: '3-4 minutes'
    },
    {
      title: 'Part 3: Discussion',
      subtitle: 'Follow-up discussion',
      body: splitLines(part3.questions),
      empty: 'No Part 3 questions entered yet.',
      meta: '4-5 minutes'
    }
  ];
  const activePart = parts[activePartIdx];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#111', color: '#fff', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1 }}>Speaking Preview Mode</span>
          <h5 className="mb-0 mt-1" style={{ fontWeight: 700 }}>{formData.title || 'Untitled Speaking Test'}</h5>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div style={{ background: '#fff2', borderRadius: 20, padding: '4px 16px', fontSize: 13 }}>
            {formData.duration || 15} min
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <X size={14} /> Close Preview
          </button>
        </div>
      </div>

      <div style={{ background: '#1a1a1a', padding: '0 24px', display: 'flex', gap: 4, flexShrink: 0 }}>
        {parts.map((part, idx) => (
          <button
            key={part.title}
            type="button"
            onClick={() => setActivePartIdx(idx)}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activePartIdx === idx ? '3px solid #fff' : '3px solid transparent',
              color: activePartIdx === idx ? '#fff' : 'rgba(255,255,255,0.5)',
              fontWeight: activePartIdx === idx ? 700 : 400,
              fontSize: 14,
              cursor: 'pointer'
            }}
          >
            Part {idx + 1}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: '#fafafa' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', borderRight: '1px solid #e5e5e5', background: '#fff' }}>
          <div className="mb-4 p-3 rounded" style={{ background: '#ecfdf5', border: '1px solid #bbf7d0', fontSize: 14 }}>
            IELTS Speaking Part {activePartIdx + 1} · {activePart.meta}
          </div>
          <h2 style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: 12 }}>{activePart.title}</h2>
          <p style={{ fontSize: '1rem', lineHeight: 1.75, color: '#333', whiteSpace: 'pre-wrap' }}>
            {activePart.subtitle}
          </p>
          {activePartIdx === 1 && (
            <div className="mt-4 p-4 rounded" style={{ background: '#fff', border: '1px solid #e5e5e5' }}>
              <div className="d-flex align-items-center gap-2 mb-2" style={{ fontWeight: 700 }}>
                <Mic size={18} /> Cue Card
              </div>
              <p className="mb-0 text-secondary">The candidate has 1 minute to prepare and should speak for up to 2 minutes.</p>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', background: '#fafafa' }}>
          <h4 className="mb-3">{activePartIdx === 1 ? 'You should say:' : 'Examiner Questions'}</h4>
          {activePart.body.length > 0 ? (
            <div className="d-flex flex-column gap-3">
              {activePart.body.map((item, idx) => (
                <div key={`${item}-${idx}`} className="p-3 rounded" style={{ background: '#fff', border: '1px solid #e5e5e5', lineHeight: 1.6 }}>
                  <span className="me-2" style={{ background: '#111', color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                    {idx + 1}
                  </span>
                  {item.replace(/^-+\s*/, '')}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>
              <p>{activePart.empty}</p>
            </div>
          )}
        </div>
      </div>

      <div style={{ background: '#fff', borderTop: '1px solid #e5e5e5', padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <button
          type="button"
          disabled={activePartIdx === 0}
          onClick={() => setActivePartIdx(i => i - 1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: activePartIdx === 0 ? 'not-allowed' : 'pointer', opacity: activePartIdx === 0 ? 0.4 : 1, fontSize: 14 }}
        >
          <ChevronLeft size={16} /> Previous Part
        </button>
        <span style={{ fontSize: 13, color: '#888' }}>Part {activePartIdx + 1} of 3</span>
        <button
          type="button"
          disabled={activePartIdx === parts.length - 1}
          onClick={() => setActivePartIdx(i => i + 1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: activePartIdx === parts.length - 1 ? 'not-allowed' : 'pointer', opacity: activePartIdx === parts.length - 1 ? 0.4 : 1, fontSize: 14 }}
        >
          Next Part <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function TutorSpeakingFormPage({ testId }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(!!testId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'intermediate',
    duration: 15,
  });
  const [part1, setPart1] = useState({ topics: '', questions: '' });
  const [part2, setPart2] = useState({ prompt: '', bulletPoints: '' });
  const [part3, setPart3] = useState({ questions: '' });

  useEffect(() => {
    if (!testId) return;

    const loadTest = async () => {
      try {
        const res = await testService.getTestById(testId);
        if (res.success && res.data) {
          const test = res.data;
          const passages = test.passages || [];
          setFormData({
            title: test.title || '',
            description: test.description || '',
            difficulty: test.difficulty || 'intermediate',
            duration: test.duration || 15,
          });
          setPart1({
            topics: passages[0]?.instruction || '',
            questions: passages[0]?.content || '',
          });
          setPart2({
            prompt: passages[1]?.title && passages[1].title !== 'Speaking Part 2' ? passages[1].title : '',
            bulletPoints: passages[1]?.content || passages[1]?.instruction || '',
          });
          setPart3({
            questions: passages[2]?.content || '',
          });
        }
      } catch (err) {
        console.error('Failed to load speaking test', err);
        alert('Failed to load speaking test data');
      } finally {
        setIsLoading(false);
      }
    };

    loadTest();
  }, [testId]);

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const handlePart1Change = (field, value) => setPart1(prev => ({ ...prev, [field]: value }));
  const handlePart2Change = (field, value) => setPart2(prev => ({ ...prev, [field]: value }));
  const handlePart3Change = (field, value) => setPart3(prev => ({ ...prev, [field]: value }));

  const buildPayload = (isDraft) => ({
    ...formData,
    skill: 'speaking',
    publishAt: isDraft ? null : new Date().toISOString(),
    passages: [
      {
        title: 'Speaking Part 1',
        instruction: part1.topics,
        content: part1.questions,
        blocks: []
      },
      {
        title: part2.prompt || 'Speaking Part 2',
        instruction: 'Cue card bullet points',
        content: part2.bulletPoints,
        blocks: []
      },
      {
        title: 'Speaking Part 3',
        instruction: 'Follow-up questions',
        content: part3.questions,
        blocks: []
      }
    ]
  });

  const handleSaveTest = async (isDraft) => {
    if (!formData.title.trim()) {
      alert('Test title is required');
      return;
    }

    if (!part1.questions.trim() || !part2.prompt.trim() || !part2.bulletPoints.trim() || !part3.questions.trim()) {
      alert('Please complete all three speaking parts before saving.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = buildPayload(isDraft);
      const res = testId
        ? await testService.updateTest(testId, payload)
        : await testService.createTest(payload);

      if (res.success) {
        alert(isDraft ? 'Speaking draft saved successfully!' : 'Speaking test saved and published!');
        navigate('/tutor/tests');
      } else {
        alert('Failed to save speaking test: ' + (res.error?.message || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.error?.message || err.message || 'Unknown error';
      alert('An error occurred while saving the speaking test: ' + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-5 text-center">
        <Loader className="spin" size={32} />
        <p className="mt-3 text-secondary">Loading speaking test...</p>
      </div>
    );
  }

  return (
    <>
      <div className="container py-4" style={{ maxWidth: 800 }}>
        <div className="page-heading">
          <h1>{testId ? 'Edit Speaking Test' : 'Create Speaking Test'}</h1>
          <p>Set up questions and topics for the 3 parts of an IELTS Speaking test.</p>
        </div>

        <div className="form-card mb-4">
          <h4 className="mb-3">General Information</h4>
          <div className="form-group">
            <label>Test title</label>
            <input type="text" placeholder="e.g. Speaking Mock Test 1" value={formData.title} onChange={(e) => handleChange('title', e.target.value)} />
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

        <div className="form-card mb-4" style={{ borderLeft: '4px solid var(--success)' }}>
          <h4 className="mb-3">Part 1: Introduction & Interview</h4>
          <div className="form-group">
            <label>Topics</label>
            <input type="text" placeholder="e.g. Hometown, Work, Studies" value={part1.topics} onChange={(e) => handlePart1Change('topics', e.target.value)} />
          </div>
          <div className="form-group mb-0">
            <label>Questions</label>
            <textarea rows="4" placeholder="- What is your hometown like?\n- Do you work or study?" value={part1.questions} onChange={(e) => handlePart1Change('questions', e.target.value)}></textarea>
          </div>
        </div>

        <div className="form-card mb-4" style={{ borderLeft: '4px solid var(--success)' }}>
          <h4 className="mb-3">Part 2: Long Turn (Cue Card)</h4>
          <div className="form-group">
            <label>Topic / Prompt</label>
            <textarea rows="2" placeholder="Describe a memorable journey you have made..." value={part2.prompt} onChange={(e) => handlePart2Change('prompt', e.target.value)}></textarea>
          </div>
          <div className="form-group mb-0">
            <label>Bullet Points</label>
            <textarea rows="4" placeholder="- Where you went\n- How you traveled\n- Why you went on this journey\n- And explain why it is memorable" value={part2.bulletPoints} onChange={(e) => handlePart2Change('bulletPoints', e.target.value)}></textarea>
          </div>
        </div>

        <div className="form-card mb-4" style={{ borderLeft: '4px solid var(--success)' }}>
          <h4 className="mb-3">Part 3: Discussion</h4>
          <div className="form-group mb-0">
            <label>Follow-up Questions</label>
            <textarea rows="4" placeholder="- How has transportation changed in your country?\n- Do you think people will travel more in the future?" value={part3.questions} onChange={(e) => handlePart3Change('questions', e.target.value)}></textarea>
          </div>
        </div>

        <div className="form-card mb-4">
          <div className="d-flex gap-3 mt-2">
            <button type="button" className="button-secondary flex-fill" style={{ padding: '14px 0', border: '1px solid var(--primary)', color: 'var(--primary)' }} onClick={() => setShowPreview(true)} disabled={isSubmitting}>Preview Test</button>
            <button type="button" className="button-primary flex-fill" style={{ padding: '14px 0' }} onClick={() => handleSaveTest(false)} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Test'}
            </button>
            <button type="button" className="button-secondary flex-fill" style={{ padding: '14px 0' }} onClick={() => handleSaveTest(true)} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save as Draft'}
            </button>
          </div>
        </div>
      </div>

      {showPreview && (
        <SpeakingTestPreviewModal
          formData={formData}
          part1={part1}
          part2={part2}
          part3={part3}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}

export default TutorSpeakingFormPage;
