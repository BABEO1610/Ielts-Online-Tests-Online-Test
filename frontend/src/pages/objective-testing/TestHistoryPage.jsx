/**
 * TestHistoryPage.jsx — /tests/history
 * Lịch sử làm bài của student — lấy dữ liệu thật từ GET /api/v1/attempts?skill=reading
 *
 * Bootstrap 5: table table-striped table-hover.
 * Design: Uber-inspired data table styling.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { attemptService } from '../../services/attempt.service';
import '../../styles/objective-testing.css';

/** Seconds → "mm:ss" */
function formatTime(seconds) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Format ISO date → YYYY-MM-DD */
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toISOString().split('T')[0];
}

function getBandColor(band) {
  if (band >= 7.0) return { bg: '#edf7ed', color: '#1e4620' };
  if (band >= 5.5) return { bg: '#fff3cd', color: '#856404' };
  return { bg: '#fdf2f2', color: '#e02424' };
}

function TestHistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [skillFilter, setSkillFilter] = useState('');

  const fetchHistory = async (skill) => {
    try {
      setLoading(true);
      const res = await attemptService.getAttemptHistory(skill || null);
      if (res.success && Array.isArray(res.data)) {
        setHistory(res.data);
      } else {
        setError(res.error?.message || 'Không thể tải lịch sử làm bài.');
      }
    } catch {
      setError('Lỗi kết nối đến server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(skillFilter);
  }, [skillFilter]);

  return (
    <div className="container py-4" style={{ maxWidth: 1100 }}>
      <div className="page-heading">
        <h1>Lịch sử làm bài</h1>
        <p>Xem lại các lần thi và theo dõi tiến độ của bạn.</p>
      </div>

      {/* Filter */}
      <div className="filter-bar mb-4">
        <select
          id="filter-skill"
          value={skillFilter}
          onChange={(e) => setSkillFilter(e.target.value)}
        >
          <option value="">Tất cả kỹ năng</option>
          <option value="reading">Reading</option>
          <option value="listening">Listening</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="alert rounded-4" style={{ backgroundColor: '#fdf2f2', color: '#c0392b', border: 'none', marginBottom: 24 }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="card-content p-0" style={{ overflow: 'hidden' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ height: 56, backgroundColor: i % 2 === 0 ? '#f9f9f9' : '#fff', borderBottom: '1px solid #f0f0f0' }} />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="card-content text-center py-5">
          <p className="body-md" style={{ color: 'var(--body)' }}>
            Bạn chưa làm bài thi nào. Hãy thử{' '}
            <span
              style={{ color: 'var(--ink)', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => navigate('/reading')}
            >
              Reading
            </span>{' '}
            hoặc{' '}
            <span
              style={{ color: 'var(--ink)', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => navigate('/listening')}
            >
              Listening
            </span>
            .
          </p>
        </div>
      ) : (
        <div className="card-content p-0" style={{ overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="table tutor-table mb-0" id="history-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Đề thi</th>
                  <th>Kỹ năng</th>
                  <th>Band Score</th>
                  <th>Điểm thô</th>
                  <th>Thời gian</th>
                  <th>Ngày thi</th>
                  <th>Mode</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, idx) => {
                  const bandStyle = getBandColor(item.bandScore);
                  return (
                    <tr key={item.id} id={`history-row-${item.id}`}>
                      <td>{idx + 1}</td>
                      <td>
                        <span className="body-md-strong">{item.testTitle}</span>
                      </td>
                      <td>
                        <span className="badge-skill">{item.skill}</span>
                      </td>
                      <td>
                        <span
                          className="badge-status"
                          style={{ background: bandStyle.bg, color: bandStyle.color, fontWeight: 700, fontSize: 16 }}
                        >
                          {typeof item.bandScore === 'number' ? item.bandScore.toFixed(1) : '—'}
                        </span>
                      </td>
                      <td className="body-sm">{item.rawScore}/{item.totalQuestions}</td>
                      <td className="body-sm" style={{ color: 'var(--body)' }}>{formatTime(item.timeSpent)}</td>
                      <td className="body-sm" style={{ color: 'var(--body)' }}>{formatDate(item.submittedAt)}</td>
                      <td>
                        <span className="badge-difficulty" style={{ fontSize: 11 }}>
                          {item.practiceMode ? 'Practice' : 'Timed'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="button-primary"
                          id={`btn-detail-${item.id}`}
                          style={{ width: 'auto', padding: '6px 16px', fontSize: 13, border: 'none', cursor: 'pointer' }}
                          onClick={() => navigate(`/results/${item.id}`)}
                        >
                          Xem kết quả
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default TestHistoryPage;
