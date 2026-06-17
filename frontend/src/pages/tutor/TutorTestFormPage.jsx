import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, Headphones, PenTool, Mic, Loader } from 'lucide-react';
import '../../styles/objective-testing.css';
import { testService } from '../../services/test.service';
import TutorReadingFormPage from './TutorReadingFormPage';
import TutorListeningFormPage from './TutorListeningFormPage';
import TutorWritingFormPage from './TutorWritingFormPage';
import TutorSpeakingFormPage from './TutorSpeakingFormPage';

function TutorTestFormPage() {
  const { id } = useParams();
  const [testSkill, setTestSkill] = useState(null);
  const [isLoading, setIsLoading] = useState(!!id);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      const fetchTest = async () => {
        try {
          const res = await testService.getTestById(id);
          if (res.success && res.data) {
            setTestSkill(res.data.skill);
          } else {
            setError('Test not found');
          }
        } catch {
          setError('Failed to load test');
        } finally {
          setIsLoading(false);
        }
      };
      fetchTest();
    }
  }, [id]);

  if (id) {
    if (isLoading) {
      return (
        <div className="container py-5 text-center">
          <Loader className="spin" size={32} />
          <p className="mt-3 text-secondary">Loading test...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="container py-5 text-center">
          <h2 className="text-danger">Error</h2>
          <p>{error}</p>
          <Link to="/tutor/tests" className="button-secondary">Back to Tests</Link>
        </div>
      );
    }

    if (testSkill === 'reading') {
      return <TutorReadingFormPage testId={id} />;
    }
    if (testSkill === 'listening') {
      return <TutorListeningFormPage testId={id} />;
    }
    if (testSkill === 'writing') {
      return <TutorWritingFormPage testId={id} />;
    }
    if (testSkill === 'speaking') {
      return <TutorSpeakingFormPage testId={id} />;
    }

    return (
      <div className="container py-4" style={{ maxWidth: 700 }}>
        <div className="page-heading">
          <h1>Edit Test</h1>
          <p>Editing test ID: {id}</p>
        </div>
        <p>Edit functionality for {testSkill} tests is coming soon.</p>
        <Link to="/tutor/tests" className="button-secondary">Back to Tests</Link>
      </div>
    );
  }

  const iconContainerStyle = {
    width: '72px',
    height: '72px',
    borderRadius: '20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '0 auto 1.5rem',
    backgroundColor: '#eff6ff',
    color: '#3b82f6',
    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.15)',
    transition: 'all 0.3s ease'
  };

  const cardStyle = {
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
    cursor: 'pointer',
    borderRadius: '16px',
    border: '1px solid var(--border-light, #e5e7eb)',
    padding: '2rem 1.5rem'
  };

  return (
    <div className="container py-5" style={{ maxWidth: 1100 }}>
      <div className="page-heading text-center mb-5">
        <h1 style={{ fontWeight: 700, fontSize: '2.5rem', marginBottom: '1rem', color: '#111827' }}>Create new test</h1>
        <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>Select the skill type for your mock test to proceed.</p>
      </div>

      <div className="row g-4 justify-content-center">
        {/* Reading */}
        <div className="col-md-6 col-lg-3">
          <Link to="/tutor/tests/new/reading" style={{ textDecoration: 'none' }}>
            <div className="form-card text-center h-100 d-flex flex-column bg-white" style={cardStyle}
                 onMouseEnter={(e) => { 
                   e.currentTarget.style.transform = 'translateY(-8px)'; 
                   e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                   e.currentTarget.style.borderColor = '#bfdbfe';
                   const icon = e.currentTarget.querySelector('.icon-wrapper');
                   if(icon) { icon.style.backgroundColor = '#3b82f6'; icon.style.color = '#ffffff'; icon.style.transform = 'scale(1.05)'; }
                 }}
                 onMouseLeave={(e) => { 
                   e.currentTarget.style.transform = 'none'; 
                   e.currentTarget.style.boxShadow = 'var(--shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05))'; 
                   e.currentTarget.style.borderColor = 'var(--border-light, #e5e7eb)';
                   const icon = e.currentTarget.querySelector('.icon-wrapper');
                   if(icon) { icon.style.backgroundColor = '#eff6ff'; icon.style.color = '#3b82f6'; icon.style.transform = 'scale(1)'; }
                 }}>
              <div className="icon-wrapper" style={iconContainerStyle}>
                <BookOpen size={36} strokeWidth={1.5} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#1f2937', fontWeight: 600 }}>Reading</h3>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', flexGrow: 1, marginBottom: '1.5rem' }}>Passage + Questions</p>
              <div className="mt-auto pt-3" style={{ borderTop: '1px dashed #e5e7eb', fontSize: '0.85rem', color: '#9ca3af', fontWeight: 500, display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <span className="badge bg-light text-dark rounded-pill px-3 py-2 border">[40Q]</span>
                <span className="badge bg-light text-dark rounded-pill px-3 py-2 border">[60m]</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Listening */}
        <div className="col-md-6 col-lg-3">
          <Link to="/tutor/tests/new/listening" style={{ textDecoration: 'none' }}>
            <div className="form-card text-center h-100 d-flex flex-column bg-white" style={cardStyle}
                 onMouseEnter={(e) => { 
                   e.currentTarget.style.transform = 'translateY(-8px)'; 
                   e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                   e.currentTarget.style.borderColor = '#c7d2fe';
                   const icon = e.currentTarget.querySelector('.icon-wrapper');
                   if(icon) { icon.style.backgroundColor = '#6366f1'; icon.style.color = '#ffffff'; icon.style.transform = 'scale(1.05)'; }
                 }}
                 onMouseLeave={(e) => { 
                   e.currentTarget.style.transform = 'none'; 
                   e.currentTarget.style.boxShadow = 'var(--shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05))'; 
                   e.currentTarget.style.borderColor = 'var(--border-light, #e5e7eb)';
                   const icon = e.currentTarget.querySelector('.icon-wrapper');
                   if(icon) { icon.style.backgroundColor = '#e0e7ff'; icon.style.color = '#6366f1'; icon.style.transform = 'scale(1)'; }
                 }}>
              <div className="icon-wrapper" style={{...iconContainerStyle, backgroundColor: '#e0e7ff', color: '#6366f1', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.15)'}}>
                <Headphones size={36} strokeWidth={1.5} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#1f2937', fontWeight: 600 }}>Listening</h3>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', flexGrow: 1, marginBottom: '1.5rem' }}>Audio + Questions</p>
              <div className="mt-auto pt-3" style={{ borderTop: '1px dashed #e5e7eb', fontSize: '0.85rem', color: '#9ca3af', fontWeight: 500, display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <span className="badge bg-light text-dark rounded-pill px-3 py-2 border">[40Q]</span>
                <span className="badge bg-light text-dark rounded-pill px-3 py-2 border">[30m]</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Writing */}
        <div className="col-md-6 col-lg-3">
          <Link to="/tutor/tests/new/writing" style={{ textDecoration: 'none' }}>
            <div className="form-card text-center h-100 d-flex flex-column bg-white" style={cardStyle}
                 onMouseEnter={(e) => { 
                   e.currentTarget.style.transform = 'translateY(-8px)'; 
                   e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                   e.currentTarget.style.borderColor = '#fbcfe8';
                   const icon = e.currentTarget.querySelector('.icon-wrapper');
                   if(icon) { icon.style.backgroundColor = '#ec4899'; icon.style.color = '#ffffff'; icon.style.transform = 'scale(1.05)'; }
                 }}
                 onMouseLeave={(e) => { 
                   e.currentTarget.style.transform = 'none'; 
                   e.currentTarget.style.boxShadow = 'var(--shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05))'; 
                   e.currentTarget.style.borderColor = 'var(--border-light, #e5e7eb)';
                   const icon = e.currentTarget.querySelector('.icon-wrapper');
                   if(icon) { icon.style.backgroundColor = '#fce7f3'; icon.style.color = '#ec4899'; icon.style.transform = 'scale(1)'; }
                 }}>
              <div className="icon-wrapper" style={{...iconContainerStyle, backgroundColor: '#fce7f3', color: '#ec4899', boxShadow: '0 4px 14px rgba(236, 72, 153, 0.15)'}}>
                <PenTool size={36} strokeWidth={1.5} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#1f2937', fontWeight: 600 }}>Writing</h3>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', flexGrow: 1, marginBottom: '1.5rem' }}>Task 1 + Task 2</p>
              <div className="mt-auto pt-3" style={{ borderTop: '1px dashed #e5e7eb', fontSize: '0.85rem', color: '#9ca3af', fontWeight: 500, display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <span className="badge bg-light text-dark rounded-pill px-3 py-2 border">[2 Tasks]</span>
                <span className="badge bg-light text-dark rounded-pill px-3 py-2 border">[60m]</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Speaking */}
        <div className="col-md-6 col-lg-3">
          <Link to="/tutor/tests/new/speaking" style={{ textDecoration: 'none' }}>
            <div className="form-card text-center h-100 d-flex flex-column bg-white" style={cardStyle}
                 onMouseEnter={(e) => { 
                   e.currentTarget.style.transform = 'translateY(-8px)'; 
                   e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                   e.currentTarget.style.borderColor = '#d1fae5';
                   const icon = e.currentTarget.querySelector('.icon-wrapper');
                   if(icon) { icon.style.backgroundColor = '#10b981'; icon.style.color = '#ffffff'; icon.style.transform = 'scale(1.05)'; }
                 }}
                 onMouseLeave={(e) => { 
                   e.currentTarget.style.transform = 'none'; 
                   e.currentTarget.style.boxShadow = 'var(--shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05))'; 
                   e.currentTarget.style.borderColor = 'var(--border-light, #e5e7eb)';
                   const icon = e.currentTarget.querySelector('.icon-wrapper');
                   if(icon) { icon.style.backgroundColor = '#ecfdf5'; icon.style.color = '#10b981'; icon.style.transform = 'scale(1)'; }
                 }}>
              <div className="icon-wrapper" style={{...iconContainerStyle, backgroundColor: '#ecfdf5', color: '#10b981', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.15)'}}>
                <Mic size={36} strokeWidth={1.5} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#1f2937', fontWeight: 600 }}>Speaking</h3>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', flexGrow: 1, marginBottom: '1.5rem' }}>Part 1, 2 & 3 Topics</p>
              <div className="mt-auto pt-3" style={{ borderTop: '1px dashed #e5e7eb', fontSize: '0.85rem', color: '#9ca3af', fontWeight: 500, display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <span className="badge bg-light text-dark rounded-pill px-3 py-2 border">[3 Parts]</span>
                <span className="badge bg-light text-dark rounded-pill px-3 py-2 border">[15m]</span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default TutorTestFormPage;
