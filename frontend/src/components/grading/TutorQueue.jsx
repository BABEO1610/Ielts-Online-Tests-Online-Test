import React, { useState, useEffect, useCallback } from 'react';
import gradingService from '../../services/grading.service';

const TutorQueue = ({ onNavigateToGrading }) => {
  const [queue, setQueue] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [claimError, setClaimError] = useState(null);
  const [isClaiming, setIsClaiming] = useState(false);
  
  // Tabs
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'
  
  // Filters and Pagination
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  const fetchQueue = useCallback(async () => {
    // EARS[State-driven]: WHEN queue is fetching THEN show loading state
    setLoading(true);
    setError(null);
    try {
      const filters = { page, limit };
      if (typeFilter !== 'all') {
        filters.type = typeFilter;
      }
      
      // EARS[State-driven]: WHEN activeTab is history THEN filter by tutor_graded status
      if (activeTab === 'history') {
        filters.status = 'tutor_graded';
      } else {
        filters.status = 'pending';
      }

      const response = await gradingService.getTutorQueue(filters);
      if (response.success) {
        setQueue(response.data.items || []);
        setTotal(response.data.total || 0);
      } else {
        setError(response.error?.message || 'Failed to fetch queue');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [page, limit, typeFilter, activeTab]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleClaim = async (submissionId, type, studentId) => {
    if (isClaiming) return;
    setIsClaiming(true);
    setClaimError(null);
    
    try {
      const response = await gradingService.claimSubmission(submissionId, type);
      if (response.success) {
        if (onNavigateToGrading) {
          onNavigateToGrading(submissionId, type, studentId);
        } else {
          fetchQueue();
        }
      } else {
        setClaimError(response.error?.message || 'Failed to claim submission');
      }
    } catch (err) {
      // EARS[Event]: WHEN claim fails (e.g. 409 conflict) THEN show error
      setClaimError(err.response?.data?.error?.message || err.message || 'Failed to claim submission');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleTypeChange = (e) => {
    setTypeFilter(e.target.value);
    setPage(1); // Reset page on filter change
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="tutor-queue-container" data-testid="tutor-queue">
      
      {claimError && (
        <div className="bg-canvas-soft border-start border-4 border-dark text-ink p-3 mb-4 rounded" role="alert" data-testid="claim-error-message">
          <span className="block fw-medium">{claimError}</span>
        </div>
      )}
      
      {error && (
        <div className="bg-canvas-soft border-start border-4 border-dark text-ink p-3 mb-4 rounded" role="alert" data-testid="fetch-error-message">
          <span className="block fw-medium">{error}</span>
        </div>
      )}

      <div className="d-flex border-bottom mb-4">
        <button 
          className={`py-2 px-4 border-0 bg-transparent ${activeTab === 'pending' ? 'border-bottom border-dark border-3 text-ink fw-bold' : 'text-body fw-medium'}`}
          onClick={() => { setActiveTab('pending'); setPage(1); }}
          data-testid="tab-pending"
          style={{ marginBottom: '-2px' }}
        >
          Chờ chấm
        </button>
        <button 
          className={`py-2 px-4 border-0 bg-transparent ${activeTab === 'history' ? 'border-bottom border-dark border-3 text-ink fw-bold' : 'text-body fw-medium'}`}
          onClick={() => { setActiveTab('history'); setPage(1); }}
          data-testid="tab-history"
          style={{ marginBottom: '-2px' }}
        >
          Đã chấm
        </button>
      </div>

      <div className="mb-4 d-flex align-items-center">
        <label htmlFor="type-filter" className="me-2 fw-medium text-ink">Filter by Type: </label>
        <select 
          id="type-filter" 
          value={typeFilter} 
          onChange={handleTypeChange}
          className="form-select w-auto bg-canvas-soft border-0 fw-medium"
          data-testid="type-filter-select"
        >
          <option value="all">All</option>
          <option value="writing">Writing</option>
          <option value="speaking">Speaking</option>
        </select>
      </div>

      {loading ? (
        <div data-testid="loading-indicator" className="text-body fw-medium py-4">Loading queue...</div>
      ) : (
        <>
          {queue.length === 0 ? (
            <p data-testid="empty-queue-message" className="text-body fw-medium py-4">No pending submissions found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead className="bg-canvas-soft text-body">
                  <tr>
                    <th className="py-3 px-4 border-0 rounded-start">Student Name</th>
                    <th className="py-3 px-4 border-0">Type</th>
                    <th className="py-3 px-4 border-0">Submitted At</th>
                    <th className="py-3 px-4 border-0 text-center rounded-end">
                      {activeTab === 'pending' ? 'Action' : 'Status'}
                    </th>
                  </tr>
                </thead>
                <tbody className="border-top-0">
                  {queue.map((item) => (
                    <tr key={`${item.submission_type}-${item.submission_id}`} data-testid={`queue-item-${item.submission_id}`}>
                      <td className="py-3 px-4 fw-medium text-ink border-bottom border-light">{item.student_name}</td>
                      <td className="py-3 px-4 text-capitalize text-body border-bottom border-light">{item.submission_type}</td>
                      <td className="py-3 px-4 text-body border-bottom border-light">{new Date(item.submitted_at).toLocaleString()}</td>
                      <td className="py-3 px-4 text-center border-bottom border-light">
                        {activeTab === 'pending' ? (
                          <button 
                            onClick={() => handleClaim(item.submission_id, item.submission_type, item.student_id)}
                            disabled={isClaiming}
                            className="btn btn-dark rounded-pill px-4 py-2 fw-medium"
                            data-testid={`claim-btn-${item.submission_id}`}
                          >
                            Start Grading
                          </button>
                        ) : (
                          <span className="text-ink fw-bold" data-testid={`status-${item.submission_id}`}>Đã chấm</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="d-flex justify-content-center align-items-center gap-3 mt-5">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)}
                className="btn btn-light rounded-pill px-4 fw-medium"
                data-testid="prev-page-btn"
              >
                Previous
              </button>
              <span className="fw-medium text-ink">Page {page} of {totalPages}</span>
              <button 
                disabled={page === totalPages} 
                onClick={() => setPage(p => p + 1)}
                className="btn btn-light rounded-pill px-4 fw-medium"
                data-testid="next-page-btn"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TutorQueue;
