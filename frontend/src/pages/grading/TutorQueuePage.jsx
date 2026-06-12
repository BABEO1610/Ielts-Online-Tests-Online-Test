import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Mock Data ────────────────────────────────────────────────────────────────
const DEFAULT_MOCK_QUEUE = [
  {
    id: 'sub-001',
    submittedAt: '15:30 10/06/2026',
    skill: 'WRITING',
    studentName: 'Nguyễn Văn A',
    studentAvatar: 'https://ui-avatars.com/api/?name=Nguyen+Van+A&background=4f46e5&color=fff',
    examTitle: 'Cambridge IELTS 18 Academic',
    status: 'new',
    deadline: '2h nữa',
    deadlineUrgent: true,
  },
  {
    id: 'sub-002',
    submittedAt: '14:15 10/06/2026',
    skill: 'SPEAKING',
    studentName: 'Trần Thị B',
    studentAvatar: 'https://ui-avatars.com/api/?name=Tran+Thi+B&background=059669&color=fff',
    examTitle: 'Mock Test Tháng 6 - Part 1',
    status: 'new',
    deadline: '2h nữa',
    deadlineUrgent: true,
  },
  {
    id: 'sub-003',
    submittedAt: '10:00 10/06/2026',
    skill: 'WRITING',
    studentName: null,
    studentAvatar: null,
    examTitle: 'Cambridge IELTS 18',
    examSubtitle: 'Reading 1',
    status: 'new',
    deadline: '24h nữa',
    deadlineUrgent: false,
  },
  {
    id: 'sub-004',
    submittedAt: '09:30 10/06/2026',
    skill: 'WRITING',
    studentName: null,
    studentAvatar: null,
    examTitle: 'Test mẫu v3',
    examSubtitle: 'WRITING',
    status: 'new',
    deadline: 'Đã quá hạn',
    deadlineUrgent: true,
    deadlineOverdue: true,
  },
  {
    id: 'sub-005',
    submittedAt: '08:00 10/06/2026',
    skill: 'SPEAKING',
    studentName: 'Lê Văn C',
    studentAvatar: 'https://ui-avatars.com/api/?name=Le+Van+C&background=dc2626&color=fff',
    examTitle: 'IELTS Practice Test 5',
    status: 'in_progress',
    deadline: '6h nữa',
    deadlineUrgent: false,
  },
];

const STATS = {
  total: 22,
  newInLast2h: 4,
  deadline24h: 6,
  deadline24hWriting: 4,
  deadline24hSpeaking: 2,
  longestWait: '3 ngày',
  longestExam: 'Đề Cambridge IELTS 18 - Reading 1',
};

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
  const isSpeaking = skill === 'SPEAKING';
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

  // Lấy dữ liệu từ localStorage để mock hành vi lưu trạng thái
  const [queueData, setQueueData] = useState(() => {
    const saved = localStorage.getItem('tutor_mock_queue');
    if (saved) return JSON.parse(saved);
    localStorage.setItem('tutor_mock_queue', JSON.stringify(DEFAULT_MOCK_QUEUE));
    return DEFAULT_MOCK_QUEUE;
  });

  const filtered = queueData.filter((item) => {
    const matchSkill =
      skillFilter === 'Tất cả' ||
      item.skill === skillFilter.toUpperCase();
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (item.studentName || '').toLowerCase().includes(q) ||
      item.examTitle.toLowerCase().includes(q);
    return matchSkill && matchSearch;
  });

  const handleGrade = (item) => {
    // Cập nhật trạng thái thành 'in_progress' và lưu vào localStorage
    const updatedQueue = queueData.map(q => 
      q.id === item.id ? { ...q, status: 'in_progress' } : q
    );
    setQueueData(updatedQueue);
    localStorage.setItem('tutor_mock_queue', JSON.stringify(updatedQueue));
    
    // Chuyển hướng sang màn chấm bài
    navigate(`/grading/tutor/grade/${item.skill.toLowerCase()}/${item.id}`);
  };

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
          subRed
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
            placeholder="Tìm kiếm theo tên sĩ sinh, sinh..."
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                  Không có bài nào trong hàng chờ
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: idx < filtered.length - 1 ? '1px solid #f0f0f0' : 'none',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {/* Thời gian nộp */}
                  <td style={{ padding: '16px 20px', fontSize: '14px', color: '#333', whiteSpace: 'nowrap' }}>
                    {item.submittedAt}
                  </td>

                  {/* Nhãn kỹ năng */}
                  <td style={{ padding: '16px 20px' }}>
                    <SkillBadge skill={item.skill} />
                  </td>

                  {/* Đối tượng */}
                  <td style={{ padding: '16px 20px' }}>
                    {item.studentName ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={item.studentAvatar}
                          alt={item.studentName}
                          style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                        />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#000' }}>{item.studentName}</div>
                          <div style={{ fontSize: '12px', color: '#777' }}>{item.examTitle}</div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#000' }}>{item.examTitle}</div>
                        {item.examSubtitle && (
                          <div style={{ fontSize: '12px', color: '#777' }}>{item.examSubtitle}</div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Trạng thái */}
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ 
                      fontSize: '14px', 
                      color: item.status === 'completed' ? '#2e7d32' : '#333',
                      fontWeight: item.status === 'completed' ? 600 : 400
                    }}>
                      {item.status === 'new' ? '➡ Bài nộp mới' : (item.status === 'in_progress' ? '✏ Đang chấm' : '✅ Đã chấm')}
                    </span>
                  </td>

                  {/* Hạn chót */}
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: item.deadlineUrgent ? 700 : 400,
                      color: item.deadlineOverdue ? '#c92a2a' : (item.deadlineUrgent ? '#e65100' : '#333'),
                    }}>
                      {item.deadline}
                    </span>
                  </td>

                  {/* Thao tác */}
                  <td style={{ padding: '16px 20px' }}>
                    <button
                      id={`btn-grade-${item.id}`}
                      onClick={() => handleGrade(item)}
                      style={{
                        padding: '9px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: item.status === 'completed' ? '#e0e0e0' : (item.status === 'in_progress' ? '#e65100' : '#1a1a1a'),
                        color: item.status === 'completed' ? '#333' : '#fff',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'UberMoveText, system-ui, sans-serif',
                        whiteSpace: 'nowrap',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (item.status === 'completed') e.currentTarget.style.backgroundColor = '#d5d5d5';
                        else if (item.status === 'in_progress') e.currentTarget.style.backgroundColor = '#f57c00';
                        else e.currentTarget.style.backgroundColor = '#333';
                      }}
                      onMouseLeave={(e) => {
                        if (item.status === 'completed') e.currentTarget.style.backgroundColor = '#e0e0e0';
                        else if (item.status === 'in_progress') e.currentTarget.style.backgroundColor = '#e65100';
                        else e.currentTarget.style.backgroundColor = '#1a1a1a';
                      }}
                    >
                      {item.status === 'completed' ? '[Xem lại]' : (item.status === 'in_progress' ? '[Tiếp tục chấm]' : '[Chấm bài]')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default TutorQueuePage;
