import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ChangePwdModal from '../components/profile/ChangePwdModal';
import '../styles/admin.css';
import '../styles/profile.css';

const bandScores = Array.from({ length: 19 }, (_, index) => (index * 0.5).toFixed(1));

const skillProgress = [
  { label: 'Listening', icon: 'bi-headphones', score: 5.0 },
  { label: 'Reading', icon: 'bi-book', score: 5.5 },
  { label: 'Writing', icon: 'bi-pencil', score: 5.0 },
  { label: 'Speaking', icon: 'bi-mic', score: 5.5 },
];

const achievements = [
  { label: 'Chuỗi 7 ngày', desc: 'Học tập đều đặn', icon: 'bi-fire', tone: 'hot' },
  { label: 'Goal Setter', desc: 'Đặt mục tiêu', icon: 'bi-bullseye', tone: 'goal' },
  { label: 'Practice Master', desc: 'Hoàn thành 10 bài', icon: 'bi-pencil-square', tone: 'practice' },
  { label: 'Time Keeper', desc: 'Học 5 giờ', icon: 'bi-stopwatch', tone: 'time' },
  { label: 'Sắp mở khóa', desc: 'Thử thách tiếp theo', icon: 'bi-lock', tone: 'locked' },
];

const practiceHistory = [
  { test: 'Listening Test 45', skill: 'Listening', score: '5.5', date: '09/06/2026', status: 'Hoàn thành' },
  { test: 'Reading Test 42', skill: 'Reading', score: '6.0', date: '08/06/2026', status: 'Hoàn thành' },
  { test: 'Writing Task 2 - Essays', skill: 'Writing', score: '5.0', date: '07/06/2026', status: 'Đã chấm' },
  { test: 'Speaking Part 1-3', skill: 'Speaking', score: '5.5', date: '07/06/2026', status: 'Hoàn thành' },
];

const formatBandScore = (score, fallback = '6.5') => (
  score !== null && score !== undefined ? Number(score).toFixed(1) : fallback
);

// Only these fields are persisted by PUT /users/me. Other profile fields
// (phone, birth date, gender, city, bio) have no backend column yet, so we
// intentionally omit them from the editable form to avoid misleading users.
const getInitialFormData = (user) => ({
  full_name: user?.full_name || '',
  email: user?.email || '',
  avatar_url: user?.avatar_url || '',
  target_band_score: formatBandScore(user?.target_band_score),
});

const formatJoinDate = (value) => {
  if (!value) return '---';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '---'
    : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const ProfileBadge = ({ children, tone = 'neutral' }) => (
  <span className={`iot-badge iot-badge--${tone}`}>{children || '---'}</span>
);

const SectionCard = ({ title, icon, action, children, className = '' }) => (
  <section className={`iot-card ${className}`}>
    <div className="iot-card__header">
      <div className="iot-card__title">
        {icon && <i className={`bi ${icon}`}></i>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const StudentHeroCard = ({ user, targetBandScore, onEdit, onPassword }) => {
  const initial = (user.full_name || user.email || 'U').charAt(0).toUpperCase();

  return (
    <section className="iot-card iot-hero-card">
      <div className="iot-hero-identity">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt={user.full_name || 'Avatar'} className="iot-hero-avatar" />
        ) : (
          <div className="iot-hero-avatar iot-hero-avatar--placeholder">{initial}</div>
        )}
        <div>
          <div className="iot-hero-name-row">
            <h2>{user.full_name || 'Học viên IELTS'}</h2>
            <button type="button" className="iot-icon-link" onClick={onEdit} aria-label="Chỉnh sửa hồ sơ">
              <i className="bi bi-pencil"></i>
            </button>
          </div>
          <p>{user.email}</p>
          <div className="iot-badge-row">
            <ProfileBadge tone="success">{user.status || 'active'}</ProfileBadge>
            <ProfileBadge>{user.role || 'student'}</ProfileBadge>
          </div>
        </div>
      </div>

      <div className="iot-hero-stats">
        <Metric label="Mục tiêu IELTS" value={targetBandScore} helper="Target score" accent />
        <Metric label="Trình độ hiện tại" value="5.0 - 5.5" helper="Ước tính hiện tại" />
        <Metric label="Chuỗi học tập" value="🔥 7 ngày" helper="Keep it up!" accent />
      </div>

      <div className="iot-hero-actions">
        <button type="button" className="iot-button iot-button--primary" onClick={onEdit}>
          <i className="bi bi-pencil"></i>
          Chỉnh sửa hồ sơ
        </button>
        <button type="button" className="iot-button iot-button--secondary" onClick={onPassword}>
          <i className="bi bi-lock"></i>
          Đổi mật khẩu
        </button>
      </div>
    </section>
  );
};

const Metric = ({ label, value, helper, accent = false }) => (
  <div className="iot-metric">
    <span>{label}</span>
    <strong className={accent ? 'iot-text-accent' : ''}>{value}</strong>
    <small>{helper}</small>
  </div>
);

const PersonalInfoCard = ({ user, formData, onEdit }) => (
  <SectionCard
    title="Thông tin cá nhân"
    icon="bi-person"
    action={<button type="button" className="iot-small-button" onClick={onEdit}>Chỉnh sửa</button>}
    className="iot-personal-card"
  >
    <div className="iot-info-split">
      <div className="iot-info-list">
        <InfoLine icon="bi-person" label="Họ và tên" value={formData.full_name || user.full_name || '---'} />
        <InfoLine icon="bi-envelope" label="Email" value={user.email} />
        <InfoLine icon="bi-bullseye" label="Mục tiêu IELTS" value={formatBandScore(user.target_band_score, formData.target_band_score)} />
        <InfoLine icon="bi-person-badge" label="Vai trò" value={user.role || 'student'} />
        <InfoLine icon="bi-shield-check" label="Trạng thái tài khoản" value={user.status || 'active'} />
        <InfoLine icon="bi-calendar-check" label="Thành viên từ" value={formatJoinDate(user.created_at)} />
      </div>
      <div className="iot-upload-preview">
        <span>Ảnh đại diện</span>
        {user.avatar_url ? (
          <img src={user.avatar_url} alt={user.full_name || 'Avatar'} style={{ width: '100%', borderRadius: '16px', objectFit: 'cover' }} />
        ) : (
          <div>
            <i className="bi bi-person-plus"></i>
            <strong>Chưa có ảnh</strong>
            <small>Thêm Avatar URL ở phần chỉnh sửa</small>
          </div>
        )}
      </div>
    </div>
  </SectionCard>
);

const InfoLine = ({ icon, label, value }) => (
  <div className="iot-info-line">
    <i className={`bi ${icon}`}></i>
    <span>{label}</span>
    <strong>{value || '---'}</strong>
  </div>
);

const GoalCard = ({ targetBandScore }) => (
  <SectionCard title="Mục tiêu IELTS" icon="bi-bullseye">
    <div className="iot-goal-list">
      <GoalRow label="Mục tiêu IELTS" value={targetBandScore} />
      <GoalRow label="Điểm ước tính hiện tại" value="5.0 - 5.5" />
      <div className="iot-goal-row iot-goal-row--skills">
        <span>Kỹ năng muốn cải thiện</span>
        <div className="iot-chip-row">
          <ProfileBadge tone="accent">Writing</ProfileBadge>
          <ProfileBadge tone="accent">Speaking</ProfileBadge>
          <ProfileBadge tone="accent">Vocabulary</ProfileBadge>
        </div>
      </div>
      <GoalRow label="Ngày thi dự kiến" value="30/12/2026" icon="bi-calendar-event" />
    </div>
  </SectionCard>
);

const GoalRow = ({ label, value, icon }) => (
  <div className="iot-goal-row">
    <span>{icon && <i className={`bi ${icon}`}></i>}{label}</span>
    <strong>{value}</strong>
  </div>
);

const SkillProgressCard = () => (
  <SectionCard
    title="Tiến độ kỹ năng"
    icon="bi-bar-chart"
    action={<a href="#practice-history-section" className="iot-card-action">Xem chi tiết</a>}
  >
    <div className="iot-skill-list">
      {skillProgress.map((skill) => (
        <div className="iot-skill-row" key={skill.label}>
          <div className="iot-skill-icon"><i className={`bi ${skill.icon}`}></i></div>
          <div className="iot-skill-main">
            <div>
              <strong>{skill.label}</strong>
              <span>{skill.score.toFixed(1)}</span>
            </div>
            <div className="iot-progress"><span style={{ width: `${(skill.score / 9) * 100}%` }} /></div>
          </div>
        </div>
      ))}
    </div>
  </SectionCard>
);

const AchievementCard = () => (
  <SectionCard
    title="Thành tích học tập"
    icon="bi-award"
    action={<a href="#practice-history-section" className="iot-card-action">Xem tất cả</a>}
  >
    <div className="iot-achievement-grid">
      {achievements.map((item) => (
        <div className={`iot-achievement iot-achievement--${item.tone}`} key={item.label}>
          <div><i className={`bi ${item.icon}`}></i></div>
          <strong>{item.label}</strong>
          <span>{item.desc}</span>
        </div>
      ))}
    </div>
  </SectionCard>
);

const PracticeHistoryCard = () => (
  <SectionCard
    title="Lịch sử luyện tập"
    icon="bi-calendar-check"
    action={<a href="#practice-history-section" className="iot-card-action">Xem tất cả</a>}
  >
    <div className="iot-history-table">
      <div className="iot-history-head">
        <span>Tên bài luyện tập</span>
        <span>Kỹ năng</span>
        <span>Điểm số</span>
        <span>Ngày</span>
        <span>Trạng thái</span>
      </div>
      {practiceHistory.map((item) => (
        <div className="iot-history-row" key={item.test}>
          <strong>{item.test}</strong>
          <span className="iot-history-skill">{item.skill}</span>
          <span>{item.score}</span>
          <span>{item.date}</span>
          <ProfileBadge tone="success">{item.status}</ProfileBadge>
        </div>
      ))}
    </div>
  </SectionCard>
);

const UpcomingScheduleCard = () => (
  <SectionCard title="Lịch học sắp tới" icon="bi-calendar3">
    <div className="iot-schedule-item">
      <strong>18:00 - 19:00</strong>
      <div>
        <b>Practice: Writing Task 2</b>
        <span>Luyện viết bài luận và nhận phản hồi</span>
      </div>
      <small>Hôm nay</small>
      <i className="bi bi-chevron-right"></i>
    </div>
  </SectionCard>
);

const QuickNoteCard = () => (
  <SectionCard
    title="Ghi chú nhanh"
    icon="bi-journal-text"
    action={<button type="button" className="iot-card-action iot-card-action--button">Thêm mới</button>}
  >
    <div className="iot-note">
      <p>Ôn tập collocations cho Writing Task 2. Tập trung cải thiện phát âm /θ/ và /ð/.</p>
      <span>09/06/2026</span>
      <i className="bi bi-pin-angle"></i>
    </div>
  </SectionCard>
);

const EditProfileForm = ({
  formData,
  loading,
  errorMsg,
  successMsg,
  onChange,
  onSubmit,
  onCancel,
  onOpenPassword,
}) => (
  <SectionCard title="Chỉnh sửa thông tin" icon="bi-pencil-square" className="iot-edit-card">
    <p className="iot-card-subtitle">Cập nhật thông tin hồ sơ. Email chỉ đọc và không thay đổi logic đăng nhập.</p>
    {successMsg && <div className="profile-alert profile-alert--success" data-testid="success-alert">{successMsg}</div>}
    {errorMsg && <div className="profile-alert profile-alert--error" data-testid="error-alert" role="alert">{errorMsg}</div>}

    <form onSubmit={onSubmit} noValidate className="profile-form">
      <div className="profile-form-grid">
        <Field label="Họ và tên">
          <input className="profile-input" type="text" name="full_name" value={formData.full_name} onChange={onChange} placeholder="Nhập họ và tên" data-testid="fullname-input" required />
        </Field>
        <Field label="Email">
          <input className="profile-input" type="email" value={formData.email} readOnly />
        </Field>
        <Field label="Avatar URL" className="profile-field--full">
          <input className="profile-input" type="url" name="avatar_url" value={formData.avatar_url} onChange={onChange} placeholder="https://example.com/avatar.jpg" data-testid="avatar-input" />
        </Field>
        <Field label="Mục tiêu IELTS">
          <select className="profile-input" name="target_band_score" value={formData.target_band_score} onChange={onChange} data-testid="bandscore-select">
            {bandScores.map((score) => <option key={score} value={score}>{score}</option>)}
          </select>
        </Field>
      </div>

      <div className="profile-actions">
        <button type="submit" className="iot-button iot-button--primary" disabled={loading} data-testid="submit-btn">
          {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
        <button type="button" className="iot-button iot-button--secondary" onClick={onCancel}>Hủy</button>
        <button type="button" className="iot-link-button" onClick={onOpenPassword}>Đổi mật khẩu</button>
      </div>
    </form>
  </SectionCard>
);

const Field = ({ label, children, className = '' }) => (
  <div className={`profile-field ${className}`}>
    <label className="profile-label">{label}</label>
    {children}
  </div>
);

const ProfilePageContent = ({ user, refreshUser }) => {
  const [formData, setFormData] = useState(() => getInitialFormData(user));
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const targetBandScore = useMemo(
    () => formatBandScore(user?.target_band_score, formData.target_band_score),
    [formData.target_band_score, user?.target_band_score],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleCancel = () => {
    setFormData(getInitialFormData(user));
    setShowEdit(false);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await api.put('/users/me', {
        full_name: formData.full_name,
        avatar_url: formData.avatar_url,
        target_band_score: Number(formData.target_band_score),
      });

      setSuccessMsg('Cập nhật hồ sơ thành công!');
      await refreshUser();
    } catch (error) {
      const detail = error.response?.data?.error?.message || error.response?.data?.error || error.message || '';
      setErrorMsg(`Lưu thay đổi thất bại. ${detail}`.trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="iot-profile-page">
        <header className="iot-page-header">
          <div>
            <h1>Hồ sơ học viên</h1>
            <p>Home <i className="bi bi-chevron-right"></i> My Profile</p>
          </div>
        </header>

        <section id="profile-section" className="profile-single-section">
          <StudentHeroCard
            user={user}
            targetBandScore={targetBandScore}
            onEdit={() => setShowEdit((value) => !value)}
            onPassword={() => setShowPwd(true)}
          />

          {showEdit && (
            <EditProfileForm
              formData={formData}
              loading={loading}
              errorMsg={errorMsg}
              successMsg={successMsg}
              onChange={handleChange}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              onOpenPassword={() => setShowPwd(true)}
            />
          )}

          <div className="iot-profile-grid">
            <div className="iot-main-column">
              <PersonalInfoCard user={user} formData={formData} onEdit={() => setShowEdit(true)} />
              <AchievementCard />
            </div>

            <div className="iot-middle-column">
              <GoalCard targetBandScore={targetBandScore} />
              <section id="practice-history-section" className="profile-performance-section">
                <PracticeHistoryCard />
              </section>
            </div>

            <div className="iot-side-column">
              <SkillProgressCard />
              <UpcomingScheduleCard />
              <QuickNoteCard />
            </div>
          </div>
        </section>
      </div>

      <ChangePwdModal isOpen={showPwd} onClose={() => setShowPwd(false)} />
    </>
  );
};

const UserProfilePage = () => {
  const { user, refreshUser } = useAuth();

  if (!user) return <div className="profile-loading">Đang tải thông tin...</div>;

  return <ProfilePageContent user={user} refreshUser={refreshUser} />;
};

export default UserProfilePage;
