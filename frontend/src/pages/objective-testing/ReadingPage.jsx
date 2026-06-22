import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StudentNavbar from '../../components/layout/StudentNavbar';
import ModeSelector from '../../components/objective-testing/ModeSelector';
import { testService } from '../../services/test.service';

const DIFFICULTY_STYLE = {
  beginner: { bg: '#efefef', color: '#5e5e5e' },
  intermediate: { bg: '#000', color: '#fff' },
  advanced: { bg: '#282828', color: '#afafaf' }
};

const DIFFICULTY_LABEL = {
  beginner: 'Easy',
  intermediate: 'Medium',
  advanced: 'Hard'
};

const normalizeCount = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const mapListTestToExam = (test) => ({
  id: test.id,
  title: test.title,
  difficulty: test.difficulty || 'intermediate',
  topic: test.description || 'IELTS Reading',
  passages: [],
  totalQuestions: normalizeCount(test.questions),
  duration: test.duration || 60,
  description: test.description || 'A published IELTS Reading test.'
});

const mapDetailToExam = (test) => {
  const passages = (test.passages || []).map((passage, index) => {
    const questionCount = (passage.blocks || []).reduce(
      (sum, block) => sum + normalizeCount(block.questions?.length),
      0
    );

    return {
      label: `Passage ${passage.passageNumber || index + 1}`,
      title: passage.title || `Passage ${index + 1}`,
      questions: questionCount,
      type: (passage.blocks || [])
        .map((block) => block.type)
        .filter(Boolean)
        .join(', ') || 'IELTS Reading questions'
    };
  });

  return {
    id: test.id,
    title: test.title,
    difficulty: test.difficulty || 'intermediate',
    topic: test.description || 'IELTS Reading',
    passages,
    totalQuestions: passages.reduce((sum, passage) => sum + normalizeCount(passage.questions), 0),
    duration: test.duration || 60,
    description: test.description || 'A published IELTS Reading test.'
  };
};

const PassageList = ({ exam, onBack }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [showModeModal, setShowModeModal] = useState(false);

  const handleStartTest = (modeConfig) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { message: 'Please log in to start the test.' } });
      return;
    }

    setShowModeModal(false);
    navigate(`/tests/${exam.id}/reading`, {
      state: {
        practiceMode: modeConfig.isPractice,
        selectedPartIds: modeConfig.selectedPartIds,
        customTimeLimit: modeConfig.customTimeLimit
      }
    });
  };

  const partsForMode = exam.passages.map((passage, index) => ({
    id: `p${index + 1}`,
    label: passage.label
  }));

  return (
    <div className="bg-white min-vh-100 pb-5">
      <StudentNavbar />
      <main className="container-fluid px-3 px-md-5 mt-4 mt-md-5" style={{ maxWidth: '1200px' }}>
        <div className="d-flex align-items-center gap-3 mb-2">
          <button
            className="btn btn-light rounded-pill px-4 py-2 fw-medium border-0"
            style={{ backgroundColor: '#efefef', fontSize: '14px' }}
            onClick={onBack}
          >
            Back to all tests
          </button>
        </div>

        <div className="mb-5 mt-3">
          <p className="text-muted mb-1 fw-medium" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Topic: {exam.topic}
          </p>
          <h1 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '40px' }}>
            {exam.title}
          </h1>
          <p className="text-muted mb-0" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px' }}>
            {exam.passages.length} passages · {exam.totalQuestions} questions · {exam.duration} minutes
          </p>
        </div>

        <div className="d-flex flex-column gap-3 mb-5">
          {exam.passages.map((passage, index) => (
            <div
              key={`${passage.label}-${index}`}
              className="rounded-4 overflow-hidden"
              style={{ border: '1px solid #e2e2e2', backgroundColor: '#fff', transition: 'box-shadow 0.15s ease' }}
              onMouseEnter={(event) => { event.currentTarget.style.boxShadow = 'rgba(0,0,0,0.12) 0px 4px 16px'; }}
              onMouseLeave={(event) => { event.currentTarget.style.boxShadow = 'none'; }}
            >
              <div className="d-flex align-items-center justify-content-between p-4 gap-4 flex-wrap">
                <div className="d-flex align-items-center gap-4">
                  <div
                    className="d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '999px',
                      backgroundColor: '#000',
                      color: '#fff',
                      fontSize: '18px',
                      fontFamily: 'UberMove, system-ui, sans-serif'
                    }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="mb-1 fw-bold" style={{ fontSize: '13px', fontFamily: 'UberMoveText, system-ui, sans-serif', color: '#5e5e5e', textTransform: 'uppercase' }}>
                      {passage.label}
                    </p>
                    <h4 className="fw-bold mb-1" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '20px', color: '#000' }}>
                      {passage.title}
                    </h4>
                    <p className="mb-0" style={{ fontSize: '14px', color: '#5e5e5e', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                      {passage.questions} questions · {passage.type}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 rounded-4 text-center" style={{ backgroundColor: '#000' }}>
          <h3 className="fw-bold mb-2" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '32px', color: '#fff' }}>
            Ready?
          </h3>
          <p className="mb-4" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px', color: '#afafaf' }}>
            Complete the full test in {exam.duration} minutes.
          </p>
          <button
            onClick={() => setShowModeModal(true)}
            className="btn rounded-pill px-5 py-3 fw-bold"
            style={{ backgroundColor: '#fff', color: '#000', fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px', border: 'none' }}
          >
            Start test
          </button>
        </div>

        <ModeSelector
          show={showModeModal}
          onHide={() => setShowModeModal(false)}
          onSelectMode={handleStartTest}
          examType="Reading"
          parts={partsForMode}
          fullDuration={exam.duration}
        />
      </main>
    </div>
  );
};

const ReadingPage = () => {
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingExamId, setLoadingExamId] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    let active = true;

    const loadReadingTests = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await testService.getTests();
        if (!active) return;

        if (!response.success) {
          setError(response.error?.message || 'Could not load Reading tests.');
          setExams([]);
          return;
        }

        const readingTests = (response.data || [])
          .filter((test) => test.skill === 'reading')
          .filter((test) => !test.status || test.status === 'published')
          .map(mapListTestToExam);

        setExams(readingTests);
      } catch (err) {
        if (active) {
          setError(err.response?.data?.error?.message || err.message || 'Could not connect to the server.');
          setExams([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadReadingTests();
    return () => { active = false; };
  }, []);

  const handleViewExam = async (exam) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { message: 'Please log in to view this test.' } });
      return;
    }

    try {
      setLoadingExamId(exam.id);
      setError(null);

      const response = await testService.getTestById(exam.id);
      if (!response.success) {
        setError(response.error?.message || 'Could not load Reading test details.');
        return;
      }

      setSelectedExam(mapDetailToExam(response.data));
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Could not load Reading test details.');
    } finally {
      setLoadingExamId(null);
    }
  };

  if (selectedExam) {
    return <PassageList exam={selectedExam} onBack={() => setSelectedExam(null)} />;
  }

  return (
    <div className="bg-white min-vh-100 pb-5">
      <StudentNavbar />
      <main className="container-fluid px-3 px-md-5 mt-4 mt-md-5" style={{ maxWidth: '1200px' }}>
        <div className="mb-5">
          <h1 className="fw-bold mb-2 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '52px' }}>
            Reading
          </h1>
          <p className="text-muted" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '20px' }}>
            Choose a published Reading test to practice. 40 questions · 60 minutes · automatic marking.
          </p>
        </div>

        {loading && (
          <div className="d-flex align-items-center justify-content-center py-5">
            <div className="spinner-border text-dark me-3" role="status" aria-hidden="true" />
            <span className="text-muted fw-medium">Loading Reading tests...</span>
          </div>
        )}

        {!loading && error && (
          <div className="alert alert-danger rounded-4 border-0" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && exams.length === 0 && (
          <div className="text-center py-5 rounded-4" style={{ border: '1px solid #e2e2e2' }}>
            <i className="bi bi-journal-x fs-1 text-secondary mb-3 d-block" />
            <p className="text-muted mb-0">No approved Reading tests have been published yet.</p>
          </div>
        )}

        {!loading && !error && exams.length > 0 && (
          <div className="row g-4">
            {exams.map((exam) => {
              const diff = DIFFICULTY_STYLE[exam.difficulty] || DIFFICULTY_STYLE.intermediate;
              return (
                <div key={exam.id} className="col-md-6">
                  <div
                    className="p-4 rounded-4 h-100 d-flex flex-column justify-content-between"
                    style={{ border: '1px solid #e2e2e2', cursor: 'pointer', transition: 'box-shadow 0.2s ease' }}
                    onMouseEnter={(event) => { event.currentTarget.style.boxShadow = 'rgba(0,0,0,0.12) 0px 4px 16px 0px'; }}
                    onMouseLeave={(event) => { event.currentTarget.style.boxShadow = 'none'; }}
                    onClick={() => handleViewExam(exam)}
                  >
                    <div>
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <span
                          className="rounded-pill px-3 py-1 fw-medium"
                          style={{ backgroundColor: diff.bg, color: diff.color, fontSize: '13px', fontFamily: 'UberMoveText, system-ui, sans-serif' }}
                        >
                          {DIFFICULTY_LABEL[exam.difficulty] || exam.difficulty}
                        </span>
                        <span className="text-muted fw-medium" style={{ fontSize: '13px' }}>
                          {exam.totalQuestions} questions · {exam.duration} minutes
                        </span>
                      </div>
                      <h3 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '24px' }}>
                        {exam.title}
                      </h3>
                      <p className="fw-medium mb-3" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', color: '#5e5e5e' }}>
                        Topic: {exam.topic}
                      </p>
                      <p className="text-muted mb-4" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', lineHeight: '1.6' }}>
                        {exam.description}
                      </p>
                      <p className="text-muted mb-4" style={{ fontSize: '13px' }}>
                        View details to see passages
                      </p>
                    </div>
                    <button
                      className="btn btn-dark rounded-pill px-4 py-2 fw-medium align-self-start"
                      style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '15px' }}
                      disabled={loadingExamId === exam.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleViewExam(exam);
                      }}
                    >
                      {loadingExamId === exam.id ? 'Loading...' : 'View test'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default ReadingPage;
