import React, { useState, useEffect } from 'react';
import gradingService from '../../services/grading.service';
import { formatIeltsBandScore } from '../../utils/ieltsScoring';

const StudentDashboardWidgets = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        setError(null);
        // EARS[Event]: WHEN component mounts THEN fetch dashboard stats
        const response = await gradingService.getDashboardStats();
        
        if (response.success) {
          setStats(response.data);
        } else {
          // EARS[Event]: WHEN fetch fails with handled error THEN show error message
          setError(response.error?.message || 'Có lỗi xảy ra khi tải thống kê.');
        }
      } catch (err) {
        // EARS[Event]: WHEN fetch fails with unhandled exception THEN show connection error
        setError(err.message || 'Không thể kết nối đến server.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="row mb-4" data-testid="dashboard-widgets-loading">
        {[1, 2, 3].map((item) => (
          <div key={item} className="col-md-4 mb-3 mb-md-0">
            <div className="card shadow-sm placeholder-glow">
              <div className="card-body">
                <h5 className="card-title placeholder col-6"></h5>
                <p className="card-text placeholder col-4"></p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger mb-4" role="alert" data-testid="dashboard-widgets-error">
        <i className="bi bi-exclamation-triangle-fill me-2"></i>
        Không thể tải thông tin thống kê: {error}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="row mb-4" data-testid="dashboard-widgets">
      {/* Target Band Widget */}
      <div className="col-md-4 mb-3 mb-md-0">
        <div className="card shadow-sm h-100 border-primary border-start border-4">
          <div className="card-body d-flex align-items-center">
            <div className="flex-shrink-0 me-3">
              <div className="bg-primary bg-opacity-10 text-primary rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px' }}>
                <i className="bi bi-bullseye fs-3"></i>
              </div>
            </div>
            <div>
              <h6 className="card-subtitle mb-1 text-muted text-uppercase fw-bold" style={{ fontSize: '0.8rem' }}>Mục tiêu IELTS</h6>
              <h3 className="card-title mb-0 fw-bold">{stats.target_band_score ? formatIeltsBandScore(stats.target_band_score) : 'N/A'}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Current Average Score Widget */}
      <div className="col-md-4 mb-3 mb-md-0">
        <div className="card shadow-sm h-100 border-success border-start border-4">
          <div className="card-body d-flex align-items-center">
            <div className="flex-shrink-0 me-3">
              <div className="bg-success bg-opacity-10 text-success rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px' }}>
                <i className="bi bi-graph-up-arrow fs-3"></i>
              </div>
            </div>
            <div>
              <h6 className="card-subtitle mb-1 text-muted text-uppercase fw-bold" style={{ fontSize: '0.8rem' }}>Điểm trung bình</h6>
              <h3 className="card-title mb-0 fw-bold">{stats.avg_band_score ? formatIeltsBandScore(stats.avg_band_score) : 'N/A'}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Remaining Quotas Widget */}
      <div className="col-md-4">
        <div className="card shadow-sm h-100 border-warning border-start border-4">
          <div className="card-body d-flex align-items-center">
            <div className="flex-shrink-0 me-3">
              <div className="bg-warning bg-opacity-10 text-warning rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px' }}>
                <i className="bi bi-robot fs-3"></i>
              </div>
            </div>
            <div>
              <h6 className="card-subtitle mb-1 text-muted text-uppercase fw-bold" style={{ fontSize: '0.8rem' }}>Lượt AI còn lại</h6>
              <h3 className="card-title mb-0 fw-bold">{stats.ai_grading_quota_remaining ?? 0}</h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboardWidgets;
