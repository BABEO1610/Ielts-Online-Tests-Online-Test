import React from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import TutorGradingPanel from '../../components/grading/TutorGradingPanel';

const TutorGradingPage = () => {
  const { type, submissionId } = useParams();
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('studentId');
  const navigate = useNavigate();

  return (
    <div className="container py-5 max-w-7xl">
      <div className="d-flex justify-content-between align-items-center mb-5">
        <div>
          <h2 className="mb-1 display-lg fw-bold text-ink">Evaluate Submission</h2>
        </div>
        <button 
          className="btn btn-light rounded-pill px-4 py-2 fw-medium"
          onClick={() => navigate('/grading/tutor/queue')}
        >
          &larr; Back to Queue
        </button>
      </div>

      <div className="bg-canvas rounded-xl">
        {/* Container for grading components */}
        <TutorGradingPanel 
          submissionId={submissionId} 
          type={type} 
          studentId={studentId}
        />
      </div>
    </div>
  );
};

export default TutorGradingPage;
