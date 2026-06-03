import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const OnboardingForm = () => {
  const navigate = useNavigate();
  const [targetBandScore, setTargetBandScore] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Generate options for Target Band Score (0 to 9, step 0.5)
  const bandScoreOptions = [];
  for (let i = 0; i <= 9; i += 0.5) {
    bandScoreOptions.push(i.toFixed(1));
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // EARS[Event]: WHEN user submits target band score
    const numScore = parseFloat(targetBandScore);
    
    // EARS[Unwanted]: IF target_band_score is out of bounds (0-9) OR not a step of 0.5 THEN display error
    if (isNaN(numScore) || numScore < 0 || numScore > 9 || numScore % 0.5 !== 0) {
      setError('Target band score must be between 0.0 and 9.0, in increments of 0.5.');
      return;
    }

    setIsLoading(true);

    try {
      // EARS[Event]: WHEN user submits valid score THEN system calls API to update profile
      const response = await api.patch('/users/me', {
        target_band_score: numScore
      });

      if (response.data && response.data.success) {
        // Redirect to dashboard on success
        navigate('/dashboard');
      }
    } catch (err) {
      // EARS[Unwanted]: IF API returns error (e.g. HTTP 400) THEN system displays error message
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error.message || 'Lỗi hệ thống khi cập nhật hồ sơ.');
      } else {
        setError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5" style={{ backgroundColor: '#efefef' }}>
      <div className="text-center mb-4">
        <h2 className="fw-bold text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif' }}>Chào mừng đến IELTSZone</h2>
        <p className="text-muted" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
          Hãy thiết lập mục tiêu điểm số để cá nhân hóa lộ trình học của bạn.
        </p>
      </div>

      {error && (
        <div data-testid="error-message" className="alert alert-danger rounded-3" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="targetBandScore" className="form-label fw-medium text-dark">
            Mục tiêu IELTS (Target Band Score)
          </label>
          <select
            id="targetBandScore"
            data-testid="target-band-score-select"
            className="form-select form-select-lg rounded-3 border-0 bg-white"
            value={targetBandScore}
            onChange={(e) => setTargetBandScore(e.target.value)}
            required
            aria-label="Target Band Score"
          >
            <option value="" disabled>Chọn điểm mục tiêu của bạn</option>
            {bandScoreOptions.map(score => (
              <option key={score} value={score}>{score}</option>
            ))}
          </select>
          <div className="form-text mt-2">
            Điều này giúp chúng tôi tối ưu hóa các bài kiểm tra thực hành và phản hồi AI.
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-dark w-100 rounded-pill py-3 fw-bold fs-5"
          disabled={isLoading || !targetBandScore}
        >
          {isLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Đang lưu...
            </>
          ) : (
            'Tiếp tục đến Bảng điều khiển'
          )}
        </button>
      </form>
    </div>
  );
};

export default OnboardingForm;
