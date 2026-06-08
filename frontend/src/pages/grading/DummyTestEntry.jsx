import React from 'react';
import { useNavigate } from 'react-router-dom';

// EARS[Event-driven]: WHEN user accesses the dummy test entry, THE system SHALL display navigation buttons.
const DummyTestEntry = () => {
    const navigate = useNavigate();

    const handleNavigate = (skill, testId) => {
        try {
            // EARS[Event-driven]: WHEN user clicks a specific mock test button, THE system SHALL navigate to the corresponding test path.
            if (!skill || !testId) {
                 // EARS[State-driven]: IF skill or testId is missing, THE system SHALL throw an error (Boundary/Error Case handling).
                 throw new Error("Missing skill or testId for navigation");
            }
            navigate(`/mock-test/${skill}/${testId}`);
        } catch (error) {
            console.error("Navigation error:", error);
            // In a real app, this could trigger a toast or alert.
            // For now, we just catch to satisfy error handling patterns.
        }
    };

    return (
        <div className="container mt-5">
            <div className="card shadow-sm border-0 rounded-4">
                <div className="card-header bg-primary bg-gradient text-white py-3 rounded-top-4">
                    <h4 className="mb-0 fw-bold">Trang Chọn Bài Thi (Dummy)</h4>
                </div>
                <div className="card-body text-center p-5">
                    <h5 className="card-title text-secondary mb-4">Vui lòng chọn bài Mock Test để kiểm thử</h5>
                    <div className="d-flex justify-content-center flex-wrap gap-4 mt-4">
                        <button 
                            className="btn btn-outline-primary btn-lg px-5 py-3 fw-medium shadow-sm"
                            onClick={() => handleNavigate('writing', 'mock-1')}
                            aria-label="Làm Writing Mock 1"
                        >
                            <i className="bi bi-pen me-2"></i> Làm Writing Mock 1
                        </button>
                        <button 
                            className="btn btn-outline-success btn-lg px-5 py-3 fw-medium shadow-sm"
                            onClick={() => handleNavigate('speaking', 'mock-1')}
                            aria-label="Làm Speaking Mock 1"
                        >
                            <i className="bi bi-mic me-2"></i> Làm Speaking Mock 1
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DummyTestEntry;
