import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ChangePwdModal from '../../components/profile/ChangePwdModal';

/**
 * TutorDashboard.jsx — Trang chủ của Tutor
 *
 * Layout: Sidebar trái cố định + Topbar + Main content
 *
 * Các thay đổi theo yêu cầu:
 *   - Topbar: chỉ hiển thị chữ "Dashboard" ở giữa (bỏ Hàng chờ chấm, Nhật ký,
 *     Quản lý đề thi, Xem website)
 *   - Sidebar: bỏ mục "Ngân hàng câu hỏi"
 */

// ─── MOCK DATA (sẽ thay bằng API call) ────────────────────────────────────────
const MOCK_STATS = {
  pendingWriting: 5,
  pendingSpeaking: 3,
  gradedToday: 8,
  totalTests: 12,
  publishedTests: 9,
  avgScore: 7.2,
};

const MOCK_QUEUE = [
  { id: 'sub-w-001', type: 'writing', taskName: 'Tên bài 1', student: 'Nguyễn Văn A', avatar: null, status: 'pending', deadline: '1 giờ', priority: false },
  { id: 'sub-s-002', type: 'speaking', taskName: 'Tên bài B', student: 'Trần Thị B', avatar: null, status: 'pending', deadline: '1 giờ', priority: false },
  { id: 'sub-w-003', type: 'writing', taskName: 'Tên bài C', student: 'Lê Văn C', avatar: null, status: 'in_progress', deadline: '1 giờ', priority: true },
  { id: 'sub-s-004', type: 'speaking', taskName: 'Phạm Thị D', student: 'Phạm Thị D', avatar: null, status: 'in_progress', deadline: '1 giờ', priority: false },
];

const MOCK_RECENT_TESTS = [
  { id: '1', title: 'Cambridge IELTS 18 — Reading Test 1', attempts: 47, chartData: [22, 18, 30, 47, 25, 35, 20] },
  { id: '2', title: 'Cambridge IELTS 18 — Listening', attempts: 38, chartData: [10, 15, 38, 22, 30, 25, 18] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getInitials = (name = '') =>
  name.split(' ').slice(-1)[0]?.charAt(0)?.toUpperCase() || '?';

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────
const MiniBarChart = ({ data = [], dark = false }) => {
  const max = Math.max(...data, 1);
  const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '40px' }}>
      {data.map((v, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <div
            style={{
              width: '14px',
              height: `${Math.max(4, (v / max) * 36)}px`,
              backgroundColor: dark ? 'rgba(255,255,255,0.7)' : '#000',
              borderRadius: '2px 2px 0 0',
            }}
          />
          <span style={{ fontSize: '9px', color: dark ? '#999' : '#999' }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, dark = false, sublabel, chartData, extra }) => (
  <div
    style={{
      backgroundColor: dark ? '#000' : '#fff',
      color: dark ? '#fff' : '#000',
      border: dark ? 'none' : '1px solid #e8e8e8',
      borderRadius: '16px',
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      minHeight: '120px',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <p style={{
      fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px',
      textTransform: 'uppercase', color: dark ? '#aaa' : '#888',
      margin: '0 0 4px', fontFamily: 'UberMoveText, system-ui, sans-serif',
    }}>
      {label}
    </p>

    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      <div>
        <p style={{
          fontSize: '44px', fontWeight: 700,
          fontFamily: 'UberMove, system-ui, sans-serif',
          lineHeight: 1, margin: '0 0 4px',
          color: dark ? '#fff' : '#000',
        }}>
          {value}
        </p>
        {sublabel && (
          <p style={{ fontSize: '12px', color: dark ? '#aaa' : '#888', margin: 0, fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
            {sublabel}
          </p>
        )}
        {extra && (
          <Link
            to="/tutor/tests/new"
            style={{
              display: 'inline-block', marginTop: '8px',
              fontSize: '12px', fontWeight: 600,
              color: dark ? '#fff' : '#000',
              border: `1px solid ${dark ? '#fff' : '#000'}`,
              borderRadius: '999px', padding: '3px 12px',
              textDecoration: 'none',
            }}
          >
            {extra}
          </Link>
        )}
      </div>
      {chartData && (
        <div style={{ paddingBottom: '4px' }}>
          <MiniBarChart data={chartData} dark={dark} />
        </div>
      )}
    </div>
  </div>
);

// ─── Queue Table ──────────────────────────────────────────────────────────────
const QueueTable = () => (
  <div style={{
    backgroundColor: '#fff', border: '1px solid #e8e8e8',
    borderRadius: '16px', overflow: 'hidden',
  }}>
    {/* Table Header */}
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #e8e8e8' }}>
          {['Thí sinh', 'Loại', 'Tên bài', 'Trạng thái', 'Hạn chấm', 'Thao tác'].map(h => (
            <th
              key={h}
              style={{
                padding: '12px 16px', textAlign: 'left',
                fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px',
                textTransform: 'uppercase', color: '#888',
                fontFamily: 'UberMoveText, system-ui, sans-serif',
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {MOCK_QUEUE.map((item, idx) => (
          <tr
            key={item.id}
            style={{
              borderBottom: idx < MOCK_QUEUE.length - 1 ? '1px solid #f0f0f0' : 'none',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fafafa'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {/* Thí sinh */}
            <td style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  backgroundColor: '#e8e8e8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700, color: '#555', flexShrink: 0,
                }}>
                  {getInitials(item.student)}
                </div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#000', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                  {item.student}
                </span>
              </div>
            </td>

            {/* Loại */}
            <td style={{ padding: '14px 16px' }}>
              <span style={{
                display: 'inline-block',
                padding: '3px 10px', borderRadius: '999px',
                fontSize: '11px', fontWeight: 700, letterSpacing: '0.4px',
                textTransform: 'uppercase',
                backgroundColor: item.type === 'writing' ? '#000' : '#efefef',
                color: item.type === 'writing' ? '#fff' : '#333',
                fontFamily: 'UberMoveText, system-ui, sans-serif',
              }}>
                {item.type}
              </span>
            </td>

            {/* Tên bài */}
            <td style={{ padding: '14px 16px' }}>
              <span style={{ fontSize: '14px', color: '#000', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                {item.taskName}
              </span>
            </td>

            {/* Trạng thái */}
            <td style={{ padding: '14px 16px' }}>
              {item.priority ? (
                <span style={{ fontSize: '13px', color: '#e53935', fontWeight: 600, fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                  Ưu tiên
                </span>
              ) : (
                <span style={{ fontSize: '13px', color: '#888', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                  {item.status === 'in_progress' ? 'Đang chấm' : 'Chờ chấm'}
                </span>
              )}
            </td>

            {/* Hạn chấm */}
            <td style={{ padding: '14px 16px' }}>
              <span style={{ fontSize: '13px', color: '#e53935', fontWeight: 500, fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                Hạn chấm:<br />
                <strong>{item.deadline}</strong>
              </span>
            </td>

            {/* Thao tác */}
            <td style={{ padding: '14px 16px' }}>
              <Link
                to={`/grading/tutor/grade/${item.type}/${item.id}`}
                style={{
                  display: 'inline-block',
                  padding: '7px 18px', borderRadius: '999px',
                  backgroundColor: '#000', color: '#fff',
                  fontSize: '13px', fontWeight: 600,
                  textDecoration: 'none',
                  fontFamily: 'UberMoveText, system-ui, sans-serif',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.status === 'in_progress' ? 'Tiếp tục' : 'Chấm →'}
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Recent Tests Widget ───────────────────────────────────────────────────────
const RecentTestsWidget = () => (
  <div style={{
    backgroundColor: '#fff', border: '1px solid #e8e8e8',
    borderRadius: '16px', padding: '20px',
    height: '100%',
  }}>
    <h3 style={{
      fontFamily: 'UberMove, system-ui, sans-serif',
      fontWeight: 700, fontSize: '16px', color: '#000', marginBottom: '16px',
    }}>
      Đề thi gần đây & Thống kê lượt thi
    </h3>

    {MOCK_RECENT_TESTS.map((test, idx) => (
      <div
        key={test.id}
        style={{
          paddingBottom: idx < MOCK_RECENT_TESTS.length - 1 ? '16px' : 0,
          marginBottom: idx < MOCK_RECENT_TESTS.length - 1 ? '16px' : 0,
          borderBottom: idx < MOCK_RECENT_TESTS.length - 1 ? '1px solid #f0f0f0' : 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <p style={{ fontWeight: 600, fontSize: '13px', color: '#000', margin: 0, fontFamily: 'UberMoveText, system-ui, sans-serif', lineHeight: 1.4, flex: 1, paddingRight: '12px' }}>
            {test.title}
          </p>
        </div>
        <p style={{ fontSize: '12px', color: '#888', margin: '0 0 10px', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
          {test.attempts} lượt thi
        </p>
        <MiniBarChart data={test.chartData} />
      </div>
    ))}

    {/* Full chart legend */}
    <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
        <span key={d} style={{ fontSize: '10px', color: '#bbb', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>{d}</span>
      ))}
    </div>
  </div>
);

// ─── TutorDashboard ────────────────────────────────────────────────────────────
const TutorDashboard = () => {
  const { user } = useAuth();
  const firstName = user?.full_name?.split(' ').pop() || 'Tutor';
  const total = MOCK_STATS.pendingWriting + MOCK_STATS.pendingSpeaking;

  return (
    <div style={{
      padding: '32px 32px 48px',
      maxWidth: '1300px',
    }}>

      {/* ── Greeting + CTA ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{
            fontFamily: 'UberMove, system-ui, sans-serif',
            fontWeight: 700, fontSize: '40px', color: '#000',
            lineHeight: 1.1, margin: '0 0 6px',
          }}>
            Xin chào, {firstName}
          </h1>
          <p style={{ fontSize: '16px', color: '#666', margin: 0 }}>
            {total > 0
              ? `Có ${total} bài đang chờ bạn chấm hôm nay`
              : 'Không có bài chờ chấm. Tận hưởng ngày của bạn!'}
          </p>
        </div>
        <Link
          to="/tutor/tests/new"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            backgroundColor: '#000', color: '#fff',
            padding: '12px 24px', borderRadius: '999px',
            fontWeight: 700, fontSize: '14px',
            textDecoration: 'none', whiteSpace: 'nowrap',
            fontFamily: 'UberMoveText, system-ui, sans-serif',
          }}
        >
          + Tạo đề thi mới
        </Link>
      </div>

      {/* ── Stats Row ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <StatCard
          label="Chờ chấm (Writing)"
          value={MOCK_STATS.pendingWriting}
          dark
          sublabel="Bài nộp"
          chartData={[2, 3, 5, 4, 6, 3, 5]}
        />
        <StatCard
          label="Chờ chấm (Speaking)"
          value={MOCK_STATS.pendingSpeaking}
          sublabel="Bài nộp"
          chartData={[1, 2, 3, 2, 4, 2, 3]}
        />
        <StatCard
          label="Đã chấm hôm nay"
          value={MOCK_STATS.gradedToday}
          sublabel="Bài hoàn thành"
          chartData={[3, 5, 8, 6, 9, 4, 8]}
        />
        <StatCard
          label="Đề thi đang publish"
          value={MOCK_STATS.publishedTests}
          sublabel={`/ ${MOCK_STATS.totalTests} tổng`}
          extra="+ Tạo đề mới"
        />
      </div>

      {/* ── 2-column: Queue + Recent Tests ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>

        {/* Cột trái: Hàng chờ chấm */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{
              fontFamily: 'UberMove, system-ui, sans-serif',
              fontWeight: 700, fontSize: '18px', color: '#000', margin: 0,
            }}>
              Hàng chờ chấm bài (Queue Chấm)
            </h2>
            <Link
              to="/grading/tutor/queue"
              style={{
                fontSize: '13px', fontWeight: 600,
                color: '#000', textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              Xem tất cả →
            </Link>
          </div>
          <QueueTable />
        </div>

        {/* Cột phải: Đề thi gần đây */}
        <RecentTestsWidget />
      </div>

    </div>
  );
};

export default TutorDashboard;
