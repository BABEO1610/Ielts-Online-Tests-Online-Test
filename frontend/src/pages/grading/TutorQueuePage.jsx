import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gradingService from '../../services/grading.service';

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatCard = ({ title, value, sub, subRed }) => (
  <div style={{
    flex: 1,
    backgroundColor: '#ebebeb',
    borderRadius: '16px',
    padding: '24px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: 0,
  }}>
    <div style={{ fontSize: '14px', color: '#555', fontWeight: 500, fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
      {title}
    </div>
    <div style={{ fontSize: '44px', fontWeight: 700, color: '#000', lineHeight: 1, fontFamily: 'UberMove, system-ui, sans-serif' }}>
      {value}
    </div>
    <div style={{ fontSize: '13px', color: subRed ? '#c92a2a' : '#555', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
      {sub}
    </div>
  </div>
);

const SkillBadge = ({ skill }) => {
  const isSpeaking = skill === 'speaking';
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '6px',
      backgroundColor: isSpeaking ? '#fff3e0' : '#e8f0fe',
      color: isSpeaking ? '#e65100' : '#1967d2',
      fontSize: '12px',
      fontWeight: 700,
      letterSpacing: '0.5px',
      fontFamily: 'UberMoveText, system-ui, sans-serif',
      textTransform: 'uppercase'
    }}>
      {skill}
    </span>
  );
};

const FilterPill = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '9px 22px',
      borderRadius: '999px',
      border: 'none',
      backgroundColor: active ? '#1a1a1a' : '#f0f0f0',
      color: active ? '#fff' : '#666',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: 'UberMoveText, system-ui, sans-serif',
      transition: 'all 0.15s ease',
      outline: 'none',
    }}
  >
    {label}
  </button>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const TutorQueuePage = () => {
  const navigate = useNavigate();
  const [skillFilter, setSkillFilter] = useState('Tất cả');
  const [search, setSearch] = useState('');
  
  const [queueData, setQueueData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch queue data when filters change
  useEffect(() => {
    const fetchQueue = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const filters = {};
        if (skillFilter !== 'Tất cả') {
          filters.submission_type = skillFilter.toLowerCase();
        }
        if (search.trim()) {
          filters.search = search.trim();
        }
        
        const response = await gradingService.getTutorQueue(filters);
        if (response.success) {
          setQueueData(response.data || []);
        } else {
          setError(response.error?.message || 'Có lỗi xảy ra khi tải dữ liệu');
        }
      } catch (err) {
        console.error(err);
        const serverMsg = err.response?.data?.error?.message;
        setError(serverMsg || 'Lỗi kết nối máy chủ');
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the search input
    const timeoutId = setTimeout(() => {
      fetchQueue();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [skillFilter, search]);

  const handleGrade = async (item) => {
    try {
      const targetId = item.submissionType === 'speaking'
        ? (item.speakingGroupId || item.submissionId)
        : item.submissionId;
      if (item.submissionType === 'speaking') await gradingService.claimSpeakingGroup(targetId);
      navigate(`/grading/tutor/grade/${item.submissionType}/${targetId}`);
    } catch (claimError) {
      setError(claimError.response?.data?.error?.message || 'Không thể claim bài Speaking này.');
    }
  };

  // Tính toán dynamic STATS dựa trên dữ liệu thật
  const calculateStats = () => {
    const total = queueData.length;
    let newInLast2h = 0;
    let deadline24hWriting = 0;
    let deadline24hSpeaking = 0;

    const now = new Date();

    queueData.forEach(item => {
      const submittedTime = new Date(item.submittedAt);
      const hoursSinceSubmit = (now - submittedTime) / (1000 * 60 * 60);
      
      // Nếu nộp trong vòng 2h qua
      if (hoursSinceSubmit <= 2) {
        newInLast2h++;
      }

      // Deadline thường là 48h (ví dụ). Nếu đã qua 24h thì hạn chót chỉ còn trong 24h nữa
      if (hoursSinceSubmit > 24 && hoursSinceSubmit <= 48) {
        if (item.submissionType === 'writing') deadline24hWriting++;
        if (item.submissionType === 'speaking') deadline24hSpeaking++;
      }
    });

    const deadline24h = deadline24hWriting + deadline24hSpeaking;
    
    // Tìm bài chờ lâu nhất
    let longestWait = '0 giờ';
    let longestExam = 'N/A';
    if (queueData.length > 0) {
      const oldest = queueData.reduce((prev, current) => {
        return (new Date(prev.submittedAt) < new Date(current.submittedAt)) ? prev : current;
      });
      const hoursWait = Math.floor((now - new Date(oldest.submittedAt)) / (1000 * 60 * 60));
      if (hoursWait > 24) {
        longestWait = `${Math.floor(hoursWait / 24)} ngày`;
      } else {
        longestWait = `${hoursWait} giờ`;
      }
      longestExam = `Bài của ${oldest.studentName || 'Học viên ẩn danh'}`;
    }

    return {
      total,
      newInLast2h,
      deadline24h,
      deadline24hWriting,
      deadline24hSpeaking,
      longestWait,
      longestExam
    };
  };

  const STATS = calculateStats();

  return (
    <div style={{
      padding: '36px 48px 64px',
      fontFamily: 'UberMoveText, system-ui, sans-serif',
      maxWidth: '1280px',
    }}>

      {/* ── Page Title ── */}
      <h1 style={{
        fontFamily: 'UberMove, system-ui, sans-serif',
        fontWeight: 700, fontSize: '36px', color: '#000',
        margin: '0 0 28px',
      }}>
        Hàng chờ chấm
      </h1>

      {/* ── Stats Row ── */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '32px' }}>
        <StatCard
          title="Tổng bài chờ chấm"
          value={STATS.total}
          sub={`+${STATS.newInLast2h} bài mới trong 2 giờ qua`}
        />
        <StatCard
          title="Hạn chót trong 24h"
          value={STATS.deadline24h}
          sub={`${STATS.deadline24hWriting} Writing, ${STATS.deadline24hSpeaking} Speaking`}
          subRed={STATS.deadline24h > 0}
        />
        <StatCard
          title="Chờ chấm lâu nhất"
          value={STATS.longestWait}
          sub={STATS.longestExam}
        />
      </div>

      {/* ── Search + Filters ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '320px' }}>
          <svg
            style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#999' }}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm theo tên học sinh..."
            style={{
              width: '100%',
              padding: '10px 16px 10px 40px',
              borderRadius: '999px',
              border: '1px solid #ddd',
              fontSize: '14px',
              outline: 'none',
              fontFamily: 'UberMoveText, system-ui, sans-serif',
              backgroundColor: '#fff',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {['Tất cả', 'Writing', 'Speaking'].map((f) => (
            <FilterPill key={f} label={f} active={skillFilter === f} onClick={() => setSkillFilter(f)} />
          ))}
        </div>
      </div>

      {/* ── Error State ── */}
      {error && (
        <div style={{ padding: '16px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '8px', marginBottom: '24px', fontWeight: 500 }}>
          {error}
        </div>
      )}

      {/* ── Table ── */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        border: '1px solid #e8e8e8',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e8e8e8', backgroundColor: '#fafafa' }}>
              {['Thời gian nộp', 'Nhãn Kỹ năng', 'Đối tượng (Học sinh/Đề thi)', 'Trạng thái Chấm', 'Hạn chót', 'Thao tác'].map((col) => (
                <th key={col} style={{
                  padding: '14px 20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#000',
                  fontFamily: 'UberMoveText, system-ui, sans-serif',
                  whiteSpace: 'nowrap',
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : queueData.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                  Không có bài nào đang chờ chấm
                </td>
              </tr>
            ) : (
              queueData.map((item, idx) => {
                // Tính toán deadline hiển thị
                const submittedTime = new Date(item.submittedAt);
                const hoursWait = (new Date() - submittedTime) / (1000 * 60 * 60);
                let deadlineStr;
                let deadlineUrgent = false;
                let deadlineOverdue = false;
                
                if (hoursWait > 48) {
                  deadlineStr = 'Đã quá hạn';
                  deadlineOverdue = true;
                  deadlineUrgent = true;
                } else {
                  const hoursLeft = Math.floor(48 - hoursWait);
                  deadlineStr = `${hoursLeft}h nữa`;
                  if (hoursLeft <= 24) deadlineUrgent = true;
                }

                // Avatar Fallback
                const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.studentName || 'A')}&background=4f46e5&color=fff`;

                // Format thời gian
                const formattedDate = new Intl.DateTimeFormat('vi-VN', {
                  hour: '2-digit', minute: '2-digit',
                  day: '2-digit', month: '2-digit', year: 'numeric'
                }).format(submittedTime).replace(',', '');

                return (
                  <tr
                    key={item.submissionId}
                    style={{
                      borderBottom: idx < queueData.length - 1 ? '1px solid #f0f0f0' : 'none',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* Thời gian nộp */}
                    <td style={{ padding: '16px 20px', fontSize: '14px', color: '#333', whiteSpace: 'nowrap' }}>
                      {formattedDate}
                    </td>

                    {/* Nhãn kỹ năng */}
                    <td style={{ padding: '16px 20px' }}>
                      <SkillBadge skill={item.submissionType} />
                    </td>

                    {/* Đối tượng */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={fallbackAvatar}
                          alt={item.studentName}
                          style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                        />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#000' }}>{item.studentName || 'Học viên ẩn danh'}</div>
                          <div style={{ fontSize: '12px', color: '#777' }}>IELTS Mock Test</div>
                        </div>
                      </div>
                    </td>

                    {/* Trạng thái */}
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ 
                        fontSize: '14px', 
                        color: '#333',
                        fontWeight: 400
                      }}>
                        ➡ Bài nộp mới
                      </span>
                    </td>

                    {/* Hạn chót */}
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: deadlineUrgent ? 700 : 400,
                        color: deadlineOverdue ? '#c92a2a' : (deadlineUrgent ? '#e65100' : '#333'),
                      }}>
                        {deadlineStr}
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td style={{ padding: '16px 20px' }}>
                      <button
                        id={`btn-grade-${item.submissionId}`}
                        onClick={() => handleGrade(item)}
                        style={{
                          padding: '9px 20px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: '#1a1a1a',
                          color: '#fff',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'UberMoveText, system-ui, sans-serif',
                          whiteSpace: 'nowrap',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#333';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#1a1a1a';
                        }}
                      >
                        [Chấm bài]
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default TutorQueuePage;
