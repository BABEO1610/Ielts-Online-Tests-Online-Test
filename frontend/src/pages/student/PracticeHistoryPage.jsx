import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/admin.css';
import '../../styles/profile.css';

const FILTERS = ['Tất cả', 'Listening', 'Reading', 'Writing', 'Speaking'];

// Map từ ENUM skill_type trong DB (lowercase) → tên hiển thị
const SKILL_LABEL = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
};

// Map filter chip → query param
const SKILL_QUERY = {
  'Listening': 'listening',
  'Reading': 'reading',
  'Writing': 'writing',
  'Speaking': 'speaking',
  'Tất cả': null,
};

function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(seconds) {
  if (!seconds) return '—';
  if (seconds < 60) return '< 1 phút';
  const m = Math.floor(seconds / 60);
  return `${m} phút`;
}

function calcSummary(history) {
  if (!history.length) {
    return [
      { label: 'Tổng số bài đã làm', value: '0', helper: 'Tất cả kỹ năng', icon: 'bi-collection', tone: 'accent' },
      { label: 'Điểm trung bình', value: '—', helper: 'Overall band', icon: 'bi-graph-up-arrow', tone: 'goal' },
      { label: 'Độ chính xác', value: '—', helper: 'Câu trả lời đúng', icon: 'bi-crosshair', tone: 'practice' },
      { label: 'Thời gian TB', value: '—', helper: 'Mỗi bài thi', icon: 'bi-clock', tone: 'time' },
    ];
  }

  const total = history.length;

  const validBands = history.filter(h => h.bandScore && !isNaN(h.bandScore));
  const avgBand = validBands.length
    ? (Math.round((validBands.reduce((s, h) => s + parseFloat(h.bandScore), 0) / validBands.length) * 2) / 2).toFixed(1)
    : '—';

  // Accuracy = tỉ lệ câu đúng trên tổng câu (chỉ tính bài objective test có totalQuestions > 0)
  const objItems = history.filter(h => (h.skill === 'reading' || h.skill === 'listening') && h.totalQuestions > 0);
  const accuracy = objItems.length
    ? (
        (objItems.reduce((s, h) => s + h.rawScore, 0) /
          objItems.reduce((s, h) => s + h.totalQuestions, 0)) *
        100
      ).toFixed(1) + '%'
    : '—';

  const timeItems = history.filter(h => h.timeSpent > 0);
  const avgTime = timeItems.length
    ? formatTime(Math.round(timeItems.reduce((s, h) => s + h.timeSpent, 0) / timeItems.length))
    : '—';

  return [
    { label: 'Tổng số bài đã làm', value: String(total), helper: 'Tất cả kỹ năng', icon: 'bi-collection', tone: 'accent' },
    { label: 'Điểm trung bình', value: avgBand, helper: 'Overall band', icon: 'bi-graph-up-arrow', tone: 'goal' },
    { label: 'Độ chính xác', value: accuracy, helper: 'Câu trả lời đúng', icon: 'bi-crosshair', tone: 'practice' },
    { label: 'Thời gian TB', value: avgTime, helper: 'Mỗi bài thi', icon: 'bi-clock', tone: 'time' },
  ];
}

const PracticeHistoryPage = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('Tất cả');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const skillParam = SKILL_QUERY[filter];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError('');

    const params = skillParam ? { skill: skillParam } : {};

    api.get('/attempts', { params })
      .then(res => {
        if (res.data?.success) {
          setHistory(res.data.data || []);
        } else {
          setError('Không thể tải dữ liệu lịch sử.');
        }
      })
      .catch(() => {
        setError('Có lỗi xảy ra khi tải lịch sử bài làm.');
      })
      .finally(() => setLoading(false));
  }, [filter]);

  // Summary luôn tính từ dữ liệu "Tất cả" (không filter)
  // Với filter hiện tại ta dùng history đã filter
  const summary = useMemo(() => calcSummary(history), [history]);

  const getStatusInfo = (item) => {
    if (item.skill === 'writing' || item.skill === 'speaking') {
      if (item.status === 'pending') return { text: 'Đang chờ chấm', color: 'warning' };
      if (item.status === 'tutor_graded') return { text: 'GV đã chấm', color: 'success' };
      if (item.status === 'ai_graded') return { text: 'AI đã chấm', color: 'success' };
      return { text: 'Đã nộp', color: 'info' };
    }
    return { text: 'Hoàn thành', color: 'success' };
  };

  const handleViewDetail = (item) => {
    if (item.skill === 'writing' || item.skill === 'speaking') {
      navigate(`/student/profile/practice-history/${item.id}?type=${item.skill}`, {
        state: { type: item.skill },
      });
      return;
    }
    navigate(`/results/${item.id}`);
  };

  return (
    <div className="iot-profile-page">
      <header className="iot-page-header">
        <div>
          <h1>Lịch sử luyện tập</h1>
          <p>Home <i className="bi bi-chevron-right"></i> Practice History</p>
        </div>
      </header>

      <div className="iot-stat-grid">
        {summary.map((item) => (
          <div className={`iot-stat-card iot-stat-card--${item.tone}`} key={item.label}>
            <div className="iot-stat-icon"><i className={`bi ${item.icon}`}></i></div>
            <div className="iot-stat-body">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.helper}</small>
            </div>
          </div>
        ))}
      </div>

      <section className="iot-card">
        <div className="iot-card__header">
          <div className="iot-card__title">
            <i className="bi bi-clock-history"></i>
            <h2>Tất cả bài luyện tập</h2>
          </div>
        </div>

        <div className="iot-filter-row">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              className={`iot-filter-chip ${filter === item ? 'active' : ''}`}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="iot-history-table">
          <div className="iot-history-head">
            <span>Tên bài luyện tập</span>
            <span>Kỹ năng</span>
            <span>Điểm số</span>
            <span>Ngày</span>
            <span>Trạng thái</span>
            <span>Chi tiết</span>
          </div>

          {loading && (
            <div className="iot-empty-state">
              <i className="bi bi-hourglass-split"></i>
              <p>Đang tải dữ liệu...</p>
            </div>
          )}

          {!loading && error && (
            <div className="iot-empty-state">
              <i className="bi bi-exclamation-circle"></i>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && history.map((item) => (
            <div className="iot-history-row" key={item.id}>
              <strong>{item.testTitle}</strong>
              <span className="iot-history-skill">{SKILL_LABEL[item.skill] || item.skill}</span>
              <span>{item.bandScore ? item.bandScore.toFixed(1) : '—'}</span>
              <span>{formatDate(item.submittedAt)}</span>
              {(() => {
                const statusInfo = getStatusInfo(item);
                return (
                  <span className={`iot-badge iot-badge--${statusInfo.color}`}>{statusInfo.text}</span>
                );
              })()}
              <button
                type="button"
                className="btn btn-sm btn-dark rounded-pill"
                onClick={() => handleViewDetail(item)}
              >
                Xem chi tiết
              </button>
            </div>
          ))}

          {!loading && !error && history.length === 0 && (
            <div className="iot-empty-state">
              <i className="bi bi-inbox"></i>
              <p>Chưa có bài luyện tập nào{filter !== 'Tất cả' ? ` cho kỹ năng ${filter}` : ''}.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default PracticeHistoryPage;
