import React from 'react';
import { useNavigate } from 'react-router-dom';
import TutorQueue from '../../components/grading/TutorQueue';

const TutorQueuePage = () => {
  const navigate = useNavigate();

  const handleNavigateToGrading = (submissionId, type, studentId) => {
    navigate(`/grading/tutor/grade/${type}/${submissionId}?studentId=${studentId}`);
  };

  return (
    <div className="container py-5 max-w-7xl">
      <div className="mb-5">
        <h1 className="display-4 fw-bold text-ink">Tutor Workspace</h1>
        <p className="text-body fs-5 mt-2">Manage your grading queue and evaluate student submissions.</p>
      </div>
      
      <div className="bg-canvas rounded-xl">
        <TutorQueue onNavigateToGrading={handleNavigateToGrading} />
      </div>
    </div>
  );
};

export default TutorQueuePage;
