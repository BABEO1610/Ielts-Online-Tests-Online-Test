import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ChangePwdModal from '../../components/profile/ChangePwdModal';

/**
 * TutorDashboard.jsx — Trang chủ của Tutor
 *
 * Các chức năng hiển thị (dựa theo spec):
 * ── feat-subjective-grading:
 *    • Queue chờ chấm (writing + speaking pending)
 *    • Đang chấm (in_progress)
 *    • Đã chấm hôm nay
 *    • Link → /grading/tutor/queue (TutorQueuePage)
 *    • Link → /grading/tutor/grade/:type/:id (TutorGradingPage)
 *
 * ── feat-objective-testing:
 *    • Quản lý đề thi (mock_tests) — CRUD
 *    • Link → /tutor/tests (TutorTestManagePage)
 *    • Link → /tutor/tests/new (TutorTestFormPage)
 *
 * DESIGN: DESIGN.md — Uber-inspired, black/white duet, pill shape (999px),
 *         card (rounded.xl = 16px), UberMove/UberMoveText, sentence-case.
 */

// ─── MOCK STATS (sẽ thay bằng API call) ──────────────────────────────────────
const MOCK_STATS = {
  pendingWriting: 5,
  pendingSpeaking: 3,
  inProgress: 1,
  gradedToday: 8,
  totalTests: 12,
  publishedTests: 9
};

// ─── MOCK PENDING QUEUE (5 bài gần nhất) ──────────────────────────────────────
const MOCK_QUEUE = [
  { id: 'sub-w-001', type: 'writing', task: 'Task 2', student: 'Nguyễn Văn A', submitted_at: '2026-06-05T08:30:00Z', status: 'pending' },
  { id: 'sub-s-002', type: 'speaking', task: 'Part 1', student: 'Trần Thị B', submitted_at: '2026-06-05T08:15:00Z', status: 'pending' },
  { id: 'sub-w-003', type: 'writing', task: 'Task 1', student: 'Lê Văn C', submitted_at: '2026-06-05T07:50:00Z', status: 'in_progress' },
  { id: 'sub-s-004', type: 'speaking', task: 'Part 2', student: 'Phạm Thị D', submitted_at: '2026-06-05T07:20:00Z', status: 'pending' },
  { id: 'sub-w-005', type: 'writing', task: 'Task 2', student: 'Hoàng Văn E', submitted_at: '2026-06-04T23:45:00Z', status: 'pending' },
];

// ─── MOCK RECENT TESTS (3 đề gần nhất) ────────────────────────────────────────
const MOCK_RECENT_TESTS = [
  { id: '1', title: 'Cambridge IELTS 18 — Reading Test 1', skill: 'reading', difficulty: 'intermediate', is_published: true, version: 2, attempts: 47 },
  { id: '2', title: 'Cambridge IELTS 18 — Listening Test 1', skill: 'listening', difficulty: 'intermediate', is_published: true, version: 1, attempts: 38 },
  { id: '3', title: 'Academic Reading — Coral Reefs', skill: 'reading', difficulty: 'advanced', is_published: false, version: 1, attempts: 0 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const STATUS_STYLE = {
  pending:     { bg: '#efefef', color: '#5e5e5e', label: 'Chờ chấm' },
  in_progress: { bg: '#000',    color: '#fff',    label: 'Đang chấm' }
};

const SKILL_STYLE = {
  reading:   { bg: '#000', color: '#fff' },
  listening: { bg: '#282828', color: '#afafaf' },
  writing:   { bg: '#efefef', color: '#5e5e5e' },
  speaking:  { bg: '#efefef', color: '#5e5e5e' }
};

// ─── TutorNavbar ──────────────────────────────────────────────────────────────
const TutorNavbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav
      className="w-100 d-flex align-items-center justify-content-between px-4 px-md-5"
      style={{
        height: '64px', backgroundColor: '#fff',
        borderBottom: '1px solid #e2e2e2',
        position: 'sticky', top: 0, zIndex: 100,
        fontFamily: 'UberMoveText, system-ui, sans-serif'
      }}
    >
      {/* Logo + Role badge */}
      <div className="d-flex align-items-center gap-3">
        <Link to="/tutor/dashboard" style={{ textDecoration: 'none' }}>
          <span className="fw-bold text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '20px' }}>
            IELTSZone
          </span>
        </Link>
        <span
          className="rounded-pill px-3 py-1 fw-medium"
          style={{ backgroundColor: '#000', color: '#fff', fontSize: '12px' }}
        >
          Tutor
        </span>
      </div>

      {/* Nav links */}
      <div className="d-none d-md-flex align-items-center gap-4">
        <Link
          to="/grading/tutor/queue"
          className="text-dark fw-medium text-decoration-none"
          style={{ fontSize: '16px', fontFamily: 'UberMoveText, system-ui, sans-serif' }}
        >
          Hàng chờ chấm
          {(MOCK_STATS.pendingWriting + MOCK_STATS.pendingSpeaking) > 0 && (
            <span
              className="ms-2 rounded-pill px-2"
              style={{ backgroundColor: '#000', color: '#fff', fontSize: '12px', fontWeight: 700 }}
            >
              {MOCK_STATS.pendingWriting + MOCK_STATS.pendingSpeaking}
            </span>
          )}
        </Link>
        <Link
          to="/tutor/tests"
          className="text-dark fw-medium text-decoration-none"
          style={{ fontSize: '16px' }}
        >
          Quản lý đề thi
        </Link>
        <Link
          to="/admin/audit-logs"
          className="text-dark fw-medium text-decoration-none"
          style={{ fontSize: '16px' }}
        >
          Nhật ký
        </Link>
      </div>

      {/* Profile Dropdown */}
      <div className="position-relative">
        <button
          className="btn d-flex align-items-center gap-2 rounded-pill px-3 py-2 border"
          style={{ backgroundColor: '#fff', fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '15px', fontWeight: 500 }}
          onClick={() => setDropdownOpen(p => !p)}
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar" className="rounded-circle" style={{ width: '28px', height: '28px', objectFit: 'cover' }} />
          ) : (
            <div
              className="d-flex align-items-center justify-content-center fw-bold"
              style={{ width: '28px', height: '28px', borderRadius: '999px', backgroundColor: '#000', color: '#fff', fontSize: '13px' }}
            >
              {user?.full_name?.charAt(0)?.toUpperCase() || 'T'}
            </div>
          )}
          <span>{user?.full_name || 'Tutor'}</span>
        </button>
        {dropdownOpen && (
          <ul
            className="position-absolute end-0 mt-2 p-2 bg-white rounded-4 shadow"
            style={{ minWidth: '180px', listStyle: 'none', padding: 0, border: '1px solid #e2e2e2', zIndex: 200 }}
            onMouseLeave={() => setDropdownOpen(false)}
          >
            <li>
              <Link className="dropdown-item rounded-3 py-2" to="/profile" onClick={() => setDropdownOpen(false)}>
                Hồ sơ cá nhân
              </Link>
            </li>
            <li>
              <button className="dropdown-item rounded-3 py-2" onClick={() => { setDropdownOpen(false); setShowPwdModal(true); }}>
                Đổi mật khẩu
              </button>
            </li>
            <li><hr className="dropdown-divider" /></li>
            <li>
              <button className="dropdown-item rounded-3 py-2 text-danger" onClick={handleLogout}>
                Đăng xuất
              </button>
            </li>
          </ul>
        )}
      </div>

      <ChangePwdModal 
        isOpen={showPwdModal}
        onClose={() => setShowPwdModal(false)}
      />
    </nav>
  );
};

// ─── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, dark = false, sublabel }) => (
  <div
    className="p-4 rounded-4 d-flex flex-column justify-content-between"
    style={{ backgroundColor: dark ? '#000' : '#efefef', color: dark ? '#fff' : '#000', minHeight: '130px' }}
  >
    <p className="mb-2 fw-medium" style={{ fontSize: '13px', fontFamily: 'UberMoveText, system-ui, sans-serif', color: dark ? '#afafaf' : '#5e5e5e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {label}
    </p>
    <p className="mb-0 fw-bold" style={{ fontSize: '48px', fontFamily: 'UberMove, system-ui, sans-serif', lineHeight: 1 }}>
      {value}
    </p>
    {sublabel && (
      <p className="mt-1 mb-0" style={{ fontSize: '13px', color: dark ? '#afafaf' : '#5e5e5e', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
        {sublabel}
      </p>
    )}
  </div>
);

// ─── TutorDashboard ────────────────────────────────────────────────────────────
const TutorDashboard = () => {
  const { user } = useAuth();
  const total = MOCK_STATS.pendingWriting + MOCK_STATS.pendingSpeaking;

  return (
    <div className="bg-white min-vh-100 pb-5">
      <TutorNavbar />

      <main className="container-fluid px-3 px-md-5 mt-4 mt-md-5" style={{ maxWidth: '1200px' }}>

        {/* ── Greeting ── */}
        <div className="mb-5">
          <h1 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '52px' }}>
            Xin chào, {user?.full_name?.split(' ').pop() || 'Tutor'} 👋
          </h1>
          <p className="text-muted mb-0" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '20px' }}>
            {total > 0
              ? `Có ${total} bài đang chờ bạn chấm hôm nay.`
              : 'Không có bài chờ chấm. Tận hưởng ngày của bạn!'}
          </p>
        </div>

        {/* ── Stats ── */}
        <div className="row g-3 mb-5">
          <div className="col-6 col-md-3">
            <StatCard label="Chờ chấm (Writing)" value={MOCK_STATS.pendingWriting} dark sublabel="Bài nộp" />
          </div>
          <div className="col-6 col-md-3">
            <StatCard label="Chờ chấm (Speaking)" value={MOCK_STATS.pendingSpeaking} sublabel="Bài nộp" />
          </div>
          <div className="col-6 col-md-3">
            <StatCard label="Đã chấm hôm nay" value={MOCK_STATS.gradedToday} sublabel="Bài hoàn thành" />
          </div>
          <div className="col-6 col-md-3">
            <StatCard label="Đề thi đang publish" value={MOCK_STATS.publishedTests} sublabel={`/ ${MOCK_STATS.totalTests} tổng`} />
          </div>
        </div>

        {/* ── 2 cột: Queue + Tests ── */}
        <div className="row g-4 mb-5">

          {/* Cột 1: Hàng chờ chấm */}
          <div className="col-lg-7">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="fw-bold mb-0 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '24px' }}>
                Hàng chờ chấm bài
              </h2>
              <Link
                to="/grading/tutor/queue"
                className="btn rounded-pill px-4 py-2 fw-medium border-0"
                style={{ backgroundColor: '#efefef', color: '#000', fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '14px', textDecoration: 'none' }}
              >
                Xem tất cả →
              </Link>
            </div>

            <div className="d-flex flex-column gap-2">
              {MOCK_QUEUE.map((item) => {
                const st = STATUS_STYLE[item.status];
                return (
                  <div
                    key={item.id}
                    className="d-flex align-items-center justify-content-between p-3 rounded-4"
                    style={{ border: '1px solid #e2e2e2', transition: 'background 0.15s ease' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f3f3f3'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                  >
                    <div className="d-flex align-items-center gap-3">
                      {/* Type badge */}
                      <span
                        className="rounded-pill px-3 py-1 fw-bold flex-shrink-0"
                        style={{ fontSize: '12px', fontFamily: 'UberMoveText, system-ui, sans-serif', textTransform: 'uppercase', backgroundColor: item.type === 'writing' ? '#000' : '#efefef', color: item.type === 'writing' ? '#fff' : '#000' }}
                      >
                        {item.type}
                      </span>
                      <div>
                        <p className="mb-0 fw-bold text-dark" style={{ fontSize: '15px', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                          {item.student} — {item.task}
                        </p>
                        <p className="mb-0 text-muted" style={{ fontSize: '13px' }}>
                          {formatTime(item.submitted_at)}
                        </p>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-2 flex-shrink-0">
                      <span
                        className="rounded-pill px-3 py-1 fw-medium"
                        style={{ fontSize: '12px', fontFamily: 'UberMoveText, system-ui, sans-serif', backgroundColor: st.bg, color: st.color }}
                      >
                        {st.label}
                      </span>
                      <Link
                        to={`/grading/tutor/grade/${item.type}/${item.id}`}
                        className="btn btn-dark rounded-pill px-3 py-1 fw-medium"
                        style={{ fontSize: '13px', textDecoration: 'none' }}
                      >
                        {item.status === 'in_progress' ? 'Tiếp tục' : 'Chấm →'}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cột 2: Quản lý đề thi */}
          <div className="col-lg-5">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="fw-bold mb-0 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '24px' }}>
                Đề thi gần đây
              </h2>
              <Link
                to="/tutor/tests"
                className="btn rounded-pill px-4 py-2 fw-medium border-0"
                style={{ backgroundColor: '#efefef', color: '#000', fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '14px', textDecoration: 'none' }}
              >
                Tất cả đề →
              </Link>
            </div>

            <div className="d-flex flex-column gap-2 mb-3">
              {MOCK_RECENT_TESTS.map((test) => {
                const sk = SKILL_STYLE[test.skill] || SKILL_STYLE.reading;
                return (
                  <div
                    key={test.id}
                    className="p-3 rounded-4"
                    style={{ border: '1px solid #e2e2e2', transition: 'background 0.15s ease' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f3f3f3'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="d-flex gap-2">
                        <span className="rounded-pill px-3 py-1 fw-bold" style={{ fontSize: '11px', backgroundColor: sk.bg, color: sk.color, fontFamily: 'UberMoveText, system-ui, sans-serif', textTransform: 'uppercase' }}>
                          {test.skill}
                        </span>
                        <span className="rounded-pill px-3 py-1 fw-medium" style={{ fontSize: '11px', backgroundColor: test.is_published ? '#000' : '#efefef', color: test.is_published ? '#fff' : '#5e5e5e', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                          {test.is_published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <span className="text-muted" style={{ fontSize: '12px' }}>v{test.version}</span>
                    </div>
                    <p className="mb-1 fw-bold text-dark" style={{ fontSize: '15px', fontFamily: 'UberMoveText, system-ui, sans-serif', lineHeight: '1.4' }}>
                      {test.title}
                    </p>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted" style={{ fontSize: '13px' }}>
                        {test.attempts} lượt thi
                      </span>
                      <div className="d-flex gap-2">
                        <Link
                          to={`/tutor/tests/${test.id}/edit`}
                          className="btn rounded-pill px-3 py-1 fw-medium"
                          style={{ fontSize: '12px', backgroundColor: '#efefef', border: 'none', textDecoration: 'none', color: '#000' }}
                        >
                          Sửa
                        </Link>
                        <Link
                          to={`/tutor/tests/${test.id}/questions/new`}
                          className="btn btn-dark rounded-pill px-3 py-1 fw-medium"
                          style={{ fontSize: '12px', textDecoration: 'none' }}
                        >
                          + Câu hỏi
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA: Tạo đề mới */}
            <Link
              to="/tutor/tests/new"
              className="btn btn-dark rounded-pill w-100 py-3 fw-bold"
              style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '16px', textDecoration: 'none' }}
            >
              + Tạo đề thi mới
            </Link>
          </div>

        </div>

        {/* ── Quick Actions Band ── */}
        <div className="rounded-4 p-4 p-md-5" style={{ backgroundColor: '#000' }}>
          <h3 className="fw-bold mb-4" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '28px', color: '#fff' }}>
            Hành động nhanh
          </h3>
          <div className="row g-3">
            {[
              { label: 'Chấm bài Writing', desc: `${MOCK_STATS.pendingWriting} bài chờ`, href: '/grading/tutor/queue', primary: true },
              { label: 'Chấm bài Speaking', desc: `${MOCK_STATS.pendingSpeaking} bài chờ`, href: '/grading/tutor/queue', primary: false },
              { label: 'Tạo đề Reading/Listening mới', desc: 'Thêm câu hỏi, publish đề', href: '/tutor/tests/new', primary: false },
              { label: 'Xem nhật ký hệ thống', desc: 'Audit log mọi thay đổi đề thi', href: '/admin/audit-logs', primary: false },
            ].map((action, i) => (
              <div key={i} className="col-6 col-md-3">
                <Link
                  to={action.href}
                  className="d-block p-3 rounded-4 text-decoration-none"
                  style={{
                    backgroundColor: action.primary ? '#fff' : '#282828',
                    color: action.primary ? '#000' : '#fff',
                    transition: 'opacity 0.15s ease',
                    height: '100%'
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <p className="fw-bold mb-1" style={{ fontSize: '15px', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                    {action.label}
                  </p>
                  <p className="mb-0" style={{ fontSize: '13px', color: action.primary ? '#5e5e5e' : '#afafaf', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                    {action.desc}
                  </p>
                </Link>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
};

export default TutorDashboard;
