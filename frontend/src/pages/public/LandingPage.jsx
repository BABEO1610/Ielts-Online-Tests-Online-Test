import React, { useRef, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    motion,
    useScroll,
    useTransform,
    useSpring,
    useMotionValue,
    useInView,
    animate,
} from 'framer-motion';

// ─── DESIGN TOKENS (per DESIGN.md) ───────────────────────────────────────────
// Primary: #000000  Canvas: #ffffff  Canvas-Soft: #efefef  Canvas-Softer: #f3f3f3
// Body text: #5e5e5e  Mute: #afafaf  On-dark: #ffffff  Black-elevated: #282828
// Font display: Inter 700 (sub for UberMove)  Font text: Inter 400/500
// Pill: 999px  Card: 16px (rounded.xl)
// Shadows: Level1 rgba(0,0,0,0.12) 0 4px 16px  Level3 rgba(0,0,0,0.16) 0 2px 8px

// ─── Magnetic hover button ────────────────────────────────────────────────────
const MagneticButton = ({ children }) => {
    const ref = useRef(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, { damping: 15, stiffness: 150, mass: 0.1 });
    const sy = useSpring(y, { damping: 15, stiffness: 150, mass: 0.1 });
    return (
        <motion.div
            ref={ref}
            onMouseMove={(e) => {
                if (!ref.current) return;
                const r = ref.current.getBoundingClientRect();
                x.set((e.clientX - (r.left + r.width / 2)) * 0.2);
                y.set((e.clientY - (r.top + r.height / 2)) * 0.2);
            }}
            onMouseLeave={() => { x.set(0); y.set(0); }}
            style={{ x: sx, y: sy, display: 'inline-block' }}
            whileTap={{ scale: 0.97 }}
        >
            {children}
        </motion.div>
    );
};

// ─── 3D Tilt card ─────────────────────────────────────────────────────────────
const TiltCard = ({ children, style }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(useSpring(y, { stiffness: 150, damping: 20 }), [-0.5, 0.5], ['5deg', '-5deg']);
    const rotateY = useTransform(useSpring(x, { stiffness: 150, damping: 20 }), [-0.5, 0.5], ['-5deg', '5deg']);
    return (
        <motion.div
            onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                x.set((e.clientX - rect.left) / rect.width - 0.5);
                y.set((e.clientY - rect.top) / rect.height - 0.5);
            }}
            onMouseLeave={() => { x.set(0); y.set(0); }}
            style={{ perspective: 1000, rotateX, rotateY, transformStyle: 'preserve-3d', ...style }}
        >
            <div style={{ transform: 'translateZ(20px)', transition: 'transform 0.1s' }}>
                {children}
            </div>
        </motion.div>
    );
};

// ─── Animated number counter ───────────────────────────────────────────────────
const Counter = ({ to, suffix = '', prefix = '', decimals = 0, duration = 2 }) => {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });
    useEffect(() => {
        if (!isInView) return;
        const ctrl = animate(0, to, {
            duration,
            ease: 'easeOut',
            onUpdate: (v) => setCount(decimals > 0 ? parseFloat(v.toFixed(decimals)) : Math.round(v)),
        });
        return ctrl.stop;
    }, [isInView, to, duration, decimals]);
    return (
        <span ref={ref}>
            {prefix}{decimals > 0 ? count.toFixed(decimals) : count.toLocaleString('vi-VN')}{suffix}
        </span>
    );
};

// ─── LANDING NAVBAR ───────────────────────────────────────────────────────────
// Per DESIGN.md: canvas background, ink text, body-md-strong (16px/500), pill CTAs
// Includes full nav links so guests can explore Listening/Reading/Writing/Speaking/Library

const LandingNavbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/');
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const navLinks = [
        { to: '/listening', label: 'Listening' },
        { to: '/reading', label: 'Reading' },
        { to: '/writing', label: 'Writing' },
        { to: '/speaking', label: 'Speaking' },
        { to: '/library', label: 'Library' },
    ];

    return (
        <nav style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
            height: '68px',
            padding: '0 32px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            // nav-bar: canvas bg, border-bottom on scroll
            backgroundColor: scrolled ? 'rgba(255,255,255,0.96)' : 'var(--canvas)',
            backdropFilter: scrolled ? 'blur(16px)' : 'none',
            borderBottom: scrolled ? '1px solid #e2e2e2' : '1px solid transparent',
            transition: 'border-color 0.3s ease, backdrop-filter 0.3s ease',
            fontFamily: 'Inter, system-ui, sans-serif',
        }}>
            {/* Logo */}
            <Link to="/" style={{ textDecoration: 'none' }}>
                <span style={{
                    fontWeight: 700, fontSize: '22px', color: 'var(--ink)',
                    letterSpacing: '-0.02em',
                    fontFamily: 'Inter, system-ui, sans-serif',
                }}>
                    IELTSZone
                </span>
            </Link>

            {/* Center nav links — guests can visit all skill pages */}
            <ul style={{
                display: 'flex', alignItems: 'center', gap: '0',
                listStyle: 'none', margin: 0, padding: 0,
            }}>
                {navLinks.map(({ to, label }) => {
                    const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
                    return (
                        <li key={to} style={{ position: 'relative' }}>
                            <Link
                                to={to}
                                style={{
                                    display: 'block',
                                    padding: '6px 16px',
                                    fontSize: '16px',
                                    fontWeight: 500,
                                    color: isActive ? 'var(--ink)' : 'var(--body)',
                                    textDecoration: 'none',
                                    fontFamily: 'Inter, system-ui, sans-serif',
                                    transition: 'color 0.2s ease',
                                    borderRadius: '999px',
                                }}
                                onMouseEnter={(e) => { if (!isActive) e.target.style.color = 'var(--ink)'; }}
                                onMouseLeave={(e) => { if (!isActive) e.target.style.color = 'var(--body)'; }}
                            >
                                {label}
                            </Link>
                            {/* Active underline indicator */}
                            {isActive && (
                                <motion.div
                                    layoutId="nav-indicator-landing"
                                    style={{
                                        position: 'absolute', bottom: '-2px', left: '16px',
                                        right: '16px', height: '2px',
                                        backgroundColor: 'var(--ink)', borderRadius: '2px',
                                    }}
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                                />
                            )}
                        </li>
                    );
                })}
            </ul>

            {/* Right: auth CTAs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {user ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {(user.role === 'admin' || user.role === 'tutor') && (
                            <Link
                                to={user.role === 'admin' ? '/admin' : '/tutor/dashboard'}
                                style={{
                                    textDecoration: 'none', padding: '10px 20px', borderRadius: '999px',
                                    fontSize: '15px', fontWeight: 500, color: 'var(--on-primary)',
                                    backgroundColor: 'var(--primary)', fontFamily: 'Inter, system-ui, sans-serif'
                                }}
                            >
                                Về bảng điều khiển
                            </Link>
                        )}
                        <Link to="/profile" style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            textDecoration: 'none', padding: '6px 16px', borderRadius: '999px',
                            backgroundColor: 'var(--canvas-soft)', color: 'var(--ink)',
                            fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, fontSize: '15px'
                        }}>
                            {user.avatar_url ? (
                                <img src={user.avatar_url} alt="Avatar" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{
                                    width: '24px', height: '24px', borderRadius: '50%',
                                    backgroundColor: 'var(--primary)', color: 'var(--on-primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '12px'
                                }}>
                                    {user.full_name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                            )}
                            {user.full_name || 'Học viên'}
                        </Link>
                        <button
                            onClick={handleLogout}
                            style={{
                                border: 'none', background: 'none', color: '#ff3b3b', cursor: 'pointer',
                                fontSize: '15px', fontWeight: 500, fontFamily: 'Inter, system-ui, sans-serif'
                            }}
                        >
                            Đăng xuất
                        </button>
                    </div>
                ) : (
                    <>
                        <Link to="/login" style={{
                            textDecoration: 'none',
                            padding: '10px 20px',
                            borderRadius: '999px',
                            fontSize: '16px',
                            fontWeight: 500,
                            color: 'var(--ink)',
                            fontFamily: 'Inter, system-ui, sans-serif',
                            backgroundColor: 'var(--canvas-soft)',
                            transition: 'background-color 0.2s ease',
                        }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--surface-pressed)'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--canvas-soft)'}
                        >
                            Đăng nhập
                        </Link>
                        <MagneticButton>
                            <Link to="/register" style={{
                                textDecoration: 'none',
                                display: 'inline-flex', alignItems: 'center',
                                padding: '10px 20px', borderRadius: '999px',
                                fontSize: '16px', fontWeight: 500,
                                color: 'var(--canvas)', backgroundColor: 'var(--ink)',
                                fontFamily: 'Inter, system-ui, sans-serif',
                                transition: 'background-color 0.2s ease',
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--black-elevated)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--ink)'}
                            >
                                Đăng ký
                            </Link>
                        </MagneticButton>
                    </>
                )}
            </div>
        </nav>
    );
};

// ─── Hero: Product mockup card (B&W design system) ───────────────────────────
const HeroMockUI = () => {
    const bars = [
        { label: 'Task Achievement', score: 8.0 },
        { label: 'Coherence & Cohesion', score: 7.5 },
        { label: 'Lexical Resource', score: 7.0 },
        { label: 'Grammar Range', score: 8.0 },
    ];
    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.4, duration: 1, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'relative', width: '100%', maxWidth: '480px', margin: '0 auto' }}
        >
            {/* Floating pill — Level 3 shadow per DESIGN.md */}
            <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                    position: 'absolute', top: '-20px', right: '10%', zIndex: 10,
                    background: 'var(--canvas)', borderRadius: '999px',
                    padding: '10px 18px',
                    boxShadow: 'rgba(0,0,0,0.16) 0px 2px 8px 0px',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontFamily: 'Inter, system-ui, sans-serif',
                }}
            >
                <span style={{ fontSize: '18px' }}>🎉</span>
                <div>
                    <div style={{ fontSize: '11px', color: 'var(--mute)', fontWeight: 500 }}>Band Score</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>7.5</div>
                </div>
            </motion.div>

            {/* Floating pill — AI Feedback */}
            <motion.div
                animate={{ y: [0, 9, 0] }}
                transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                style={{
                    position: 'absolute', bottom: '20%', left: '-5%', zIndex: 10,
                    background: 'var(--canvas)', borderRadius: '999px',
                    padding: '10px 18px',
                    boxShadow: 'rgba(0,0,0,0.16) 0px 2px 8px 0px',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontFamily: 'Inter, system-ui, sans-serif', whiteSpace: 'nowrap',
                }}
            >
                <span style={{ fontSize: '16px' }}>✨</span>
                <div>
                    <div style={{ fontSize: '11px', color: 'var(--mute)', fontWeight: 500 }}>AI Feedback</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>Coherence: Excellent</div>
                </div>
            </motion.div>

            {/* Main card — card-elevated: canvas bg, 16px radius, Level 1 shadow */}
            <motion.div
                whileHover={{ y: -3 }}
                transition={{ duration: 0.3 }}
                style={{
                    background: 'var(--canvas)',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: 'rgba(0,0,0,0.12) 0px 4px 16px 0px',
                    fontFamily: 'Inter, system-ui, sans-serif',
                }}
            >
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '8px',
                            backgroundColor: 'var(--ink)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '16px',
                        }}>✍️</div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>Writing Task 2</div>
                            <div style={{ fontSize: '12px', color: 'var(--mute)' }}>Academic · 40 phút</div>
                        </div>
                    </div>
                    {/* Pill chip */}
                    <span style={{
                        backgroundColor: 'var(--canvas-soft)', color: 'var(--ink)',
                        fontSize: '11px', fontWeight: 500,
                        padding: '4px 12px', borderRadius: '999px',
                    }}>✓ Đã nộp</span>
                </div>

                {/* Score bars */}
                {bars.map((item) => (
                    <div key={item.label} style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--body)', fontWeight: 400 }}>{item.label}</span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>{item.score.toFixed(1)}</span>
                        </div>
                        <div style={{ background: 'var(--canvas-soft)', borderRadius: '999px', height: '5px', overflow: 'hidden' }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(item.score / 9) * 100}%` }}
                                transition={{ delay: 0.8, duration: 1.2, ease: 'easeOut' }}
                                style={{ height: '100%', borderRadius: '999px', background: 'var(--ink)' }}
                            />
                        </div>
                    </div>
                ))}

                {/* AI comment — soft tinted card */}
                <div style={{
                    backgroundColor: 'var(--canvas-softer)',
                    borderRadius: '8px',
                    padding: '14px 16px',
                    marginTop: '16px',
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                }}>
                    <span style={{ fontSize: '16px' }}>🤖</span>
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '3px' }}>
                            AI Nhận xét
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--body)', lineHeight: '1.6' }}>
                            Bài viết có lập luận logic rõ ràng. Bổ sung ví dụ cụ thể để tăng điểm Task Achievement.
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ─── MAIN LANDING PAGE ────────────────────────────────────────────────────────
const LandingPage = () => {
    const { user } = useAuth();
    const { scrollYProgress } = useScroll();
    // Subtle parallax — keep it minimal, no color blobs
    const yBg = useTransform(scrollYProgress, [0, 1], [0, 200]);

    const stats = [
        { to: 50000, suffix: '+', label: 'Học viên đã tham gia' },
        { to: 98, suffix: '%', label: 'Tỉ lệ tăng band score' },
        { to: 10000, suffix: '+', label: 'Bài luyện tập' },
        { to: 4.9, suffix: '/5', label: 'Đánh giá', prefix: '⭐ ', decimals: 1 },
    ];

    const steps = [
        { num: '01', icon: '🎯', title: 'Đặt mục tiêu band', desc: 'Nhập band điểm hiện tại và mục tiêu. Hệ thống phân tích lỗ hổng và tạo lộ trình cá nhân hóa cho riêng bạn.' },
        { num: '02', icon: '✍️', title: 'Luyện tập thực tế', desc: 'Làm bài với đề thi chuẩn Cambridge được cập nhật liên tục, đủ 4 kỹ năng Listening, Reading, Writing, Speaking.' },
        { num: '03', icon: '🤖', title: 'AI chấm & phản hồi', desc: 'Nhận điểm số và nhận xét chi tiết từ AI trong vài giây. Biết rõ điểm mạnh và điểm cần cải thiện ngay lập tức.' },
    ];

    const featureCards = [
        { icon: '🎧', title: 'Listening', desc: 'Bài nghe chuẩn IELTS với script và giải thích đáp án chi tiết.' },
        { icon: '📖', title: 'Reading', desc: 'Đề đọc từ Cambridge với phân tích logic từng câu hỏi.' },
        { icon: '✍️', title: 'Writing AI', desc: 'AI chấm Task 1 & 2 theo 4 tiêu chí chuẩn Band Descriptor.' },
        { icon: '🎤', title: 'Speaking', desc: 'Luyện nói với gợi ý đề IELTS, đánh giá coherence tự động.' },
        { icon: '📚', title: 'Thư viện', desc: 'Hàng ngàn bài mẫu Writing & Speaking band 7+ kèm phân tích.' },
        { icon: '📊', title: 'Progress', desc: 'Biểu đồ tiến trình theo tuần, so sánh với mục tiêu band.' },
    ];

    // Per DESIGN.md: alternating white & black bands
    const featureSections = [
        {
            dark: false,
            badge: 'AI-POWERED',
            title: 'Chấm bài Writing & Speaking bằng AI tức thì',
            desc: 'Nhận điểm số và phản hồi chi tiết ngay lập tức theo 4 tiêu chí chuẩn IELTS. Không còn chờ hàng tuần — AI chấm bài chính xác trong vài giây.',
            bullets: [
                'Chấm điểm theo 4 tiêu chí chuẩn Band Descriptor',
                'Gợi ý cải thiện cụ thể từng câu, từng đoạn',
                'Lịch sử điểm số và biểu đồ tiến trình theo thời gian',
            ],
            img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1000&auto=format&fit=crop',
            imgAlt: 'AI Grading',
            imgInitial: { scale: 1.15, filter: 'blur(12px)' },
            imgAnimate: { scale: 1, filter: 'blur(0px)' },
            ctaText: 'Thử AI chấm bài ngay',
            imageLeft: false,
        },
        {
            dark: true,
            badge: 'THƯ VIỆN',
            title: 'Kho tài liệu khổng lồ, cập nhật liên tục',
            desc: 'Truy cập hàng ngàn bài mẫu Writing, Speaking, đề thi thực tế từ Cambridge được phân loại theo band, topic và kỹ năng.',
            bullets: [
                '5.000+ đề thi thực tế từ Cambridge IELTS',
                'Bài mẫu band 8.0+ kèm phân tích cấu trúc',
                'Vocabulary theo chủ đề IELTS phổ biến nhất',
            ],
            img: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=1000&auto=format&fit=crop',
            imgAlt: 'Library',
            imgInitial: { x: '-100%', opacity: 0.5 },
            imgAnimate: { x: 0, opacity: 1 },
            ctaText: 'Khám phá thư viện',
            imageLeft: true,
        },
        {
            dark: false,
            badge: 'LỘ TRÌNH',
            title: 'Lộ trình học tập cá nhân hóa thông minh',
            desc: 'Hệ thống phân tích điểm yếu và tự động tạo lộ trình học tập tối ưu, giúp đạt band điểm mục tiêu nhanh nhất có thể.',
            bullets: [
                'Phân tích điểm yếu và ưu tiên kỹ năng cần cải thiện',
                'Lịch học điều chỉnh theo thời gian biểu của bạn',
                'Nhắc nhở và milestone để duy trì động lực',
            ],
            img: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1000&auto=format&fit=crop',
            imgAlt: 'Personalized Path',
            imgInitial: { scale: 0.88, opacity: 0 },
            imgAnimate: { scale: 1, opacity: 1 },
            ctaText: 'Xem lộ trình mẫu',
            imageLeft: false,
        },
    ];

    const testimonials = [
        { name: 'Nguyễn Minh Anh', role: 'Sinh viên Y khoa', avatar: 'N', before: '5.5', after: '7.0', text: 'Luyện 2 tháng với IELTSZone, tôi tăng từ 5.5 lên 7.0! AI chấm Writing chi tiết đến mức tôi hiểu chính xác từng lỗi sai và cách sửa.' },
        { name: 'Trần Hữu Phúc', role: 'Kỹ sư phần mềm', avatar: 'T', before: '6.0', after: '7.5', text: 'Sau 3 tháng, điểm Speaking cải thiện từ 6.0 lên 7.5. Feedback từ AI rất cụ thể và actionable, không còn mơ hồ như luyện thi truyền thống.' },
        { name: 'Lê Thu Hương', role: 'Giáo viên tiếng Anh', avatar: 'L', before: '7.0', after: '8.0', text: 'Cần 8.0 để xin học bổng. Kho tài liệu khổng lồ và AI writing scorer của IELTSZone đã giúp tôi đạt mục tiêu chỉ trong 45 ngày.' },
    ];

    const footerCols = {
        'Kỹ năng': [['Listening', '/listening'], ['Reading', '/reading'], ['Writing', '/writing'], ['Speaking', '/speaking']],
        'Tài nguyên': [['Thư viện', '/library'], ['Blog', '#'], ['Bài mẫu', '#'], ['Mock Tests', '#']],
        'Công ty': [['Về chúng tôi', '#'], ['Liên hệ', '#'], ['Điều khoản', '#'], ['Bảo mật', '#']],
        'Theo dõi': [['Facebook', '#'], ['Instagram', '#'], ['YouTube', '#'], ['TikTok', '#']],
    };

    const ease = [0.22, 1, 0.36, 1];
    const FONT = 'Inter, system-ui, Helvetica Neue, Arial, sans-serif';

    return (
        <div style={{ fontFamily: FONT, backgroundColor: 'var(--canvas)', overflowX: 'hidden' }}>
            <LandingNavbar />

            {/* Subtle dot grid bg — B&W only */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: 0,
                pointerEvents: 'none',
                backgroundImage: 'radial-gradient(#d5d5d5 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                opacity: 0.45,
            }} />

            {/* ── HERO BAND LIGHT (hero-band-light) ── */}
            <section style={{
                position: 'relative', zIndex: 1,
                minHeight: '100vh',
                padding: 'clamp(100px, 12vw, 140px) 32px 80px',
                display: 'flex', alignItems: 'center',
                backgroundColor: 'var(--canvas)',
            }}>
                <div className="container">
                    <div className="row align-items-center g-5">
                        {/* Left copy */}
                        <div className="col-12 col-lg-6">
                            {/* Eyebrow — uppercase per DESIGN.md for eyebrow only */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                style={{ marginBottom: '20px' }}
                            >
                                <span style={{
                                    display: 'inline-block',
                                    backgroundColor: 'var(--canvas-soft)', color: 'var(--ink)',
                                    fontSize: '12px', fontWeight: 500,
                                    padding: '5px 14px', borderRadius: '999px',
                                    letterSpacing: '0.06em', textTransform: 'uppercase',
                                }}>
                                    Chấm bài bằng AI · Tăng 1 band trong 60 ngày
                                </span>
                            </motion.div>

                            {/* Display headline — display-xxl: 52px/700 per DESIGN.md */}
                            <motion.h1
                                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.08, duration: 0.8, ease }}
                                style={{
                                    fontSize: 'clamp(36px, 5vw, 52px)',
                                    fontWeight: 700, lineHeight: '1.22',
                                    color: 'var(--ink)', marginBottom: '20px',
                                    letterSpacing: '-0.02em',
                                    fontFamily: FONT,
                                }}
                            >
                                Luyện thi IELTS thông minh hơn với AI
                            </motion.h1>

                            {/* Lead paragraph — body-lg: 18px/500 */}
                            <motion.p
                                initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.18, duration: 0.7, ease }}
                                style={{
                                    fontSize: '18px', fontWeight: 500, lineHeight: '28px',
                                    color: 'var(--body)', marginBottom: '32px', maxWidth: '480px',
                                }}
                            >
                                Nền tảng luyện thi IELTS tích hợp AI chấm bài tức thì, phản hồi chi tiết và lộ trình cá nhân hóa. Hàng nghìn học viên đã tăng band score nhờ IELTSZone.
                            </motion.p>

                            {/* CTA pills — button-primary + button-subtle */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.6 }}
                                style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '40px' }}
                            >
                                {!user ? (
                                    <>
                                        <MagneticButton>
                                            <Link to="/register" style={{
                                                display: 'inline-flex', alignItems: 'center',
                                                padding: '14px 28px', borderRadius: '999px',
                                                backgroundColor: 'var(--ink)', color: 'var(--canvas)',
                                                fontWeight: 500, fontSize: '16px', textDecoration: 'none',
                                                transition: 'background-color 0.2s ease',
                                            }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--black-elevated)'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--ink)'}
                                            >
                                                Bắt đầu miễn phí
                                            </Link>
                                        </MagneticButton>
                                        <Link to="/listening" style={{
                                            display: 'inline-flex', alignItems: 'center',
                                            padding: '14px 28px', borderRadius: '999px',
                                            backgroundColor: 'var(--canvas-soft)', color: 'var(--ink)',
                                            fontWeight: 500, fontSize: '16px', textDecoration: 'none',
                                            transition: 'background-color 0.2s ease',
                                        }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-pressed)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--canvas-soft)'}
                                        >
                                            Xem đề thi thử
                                        </Link>
                                    </>
                                ) : (
                                    <MagneticButton>
                                        <Link to="/listening" style={{
                                            display: 'inline-flex', alignItems: 'center',
                                            padding: '14px 28px', borderRadius: '999px',
                                            backgroundColor: 'var(--ink)', color: 'var(--canvas)',
                                            fontWeight: 500, fontSize: '16px', textDecoration: 'none',
                                            transition: 'background-color 0.2s ease',
                                        }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--black-elevated)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--ink)'}
                                        >
                                            Tiếp tục luyện tập
                                        </Link>
                                    </MagneticButton>
                                )}
                            </motion.div>

                            {/* Trust bar */}
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                transition={{ delay: 0.5, duration: 0.7 }}
                                style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}
                            >
                                <div style={{ display: 'flex' }}>
                                    {['N', 'T', 'L', 'M', 'H'].map((init, i) => (
                                        <div key={i} style={{
                                            width: '32px', height: '32px', borderRadius: '9999px',
                                            backgroundColor: ['var(--ink)', 'var(--hairline-mid)', 'var(--body)', 'var(--ink)', 'var(--hairline-mid)'][i],
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'var(--canvas)', fontWeight: 700, fontSize: '13px',
                                            border: '2px solid #ffffff', marginLeft: i === 0 ? 0 : '-8px',
                                        }}>{init}</div>
                                    ))}
                                </div>
                                <div style={{ fontSize: '14px', color: 'var(--body)', fontWeight: 400 }}>
                                    Được tin dùng bởi <strong style={{ color: 'var(--ink)', fontWeight: 700 }}>50.000+</strong> học viên ⭐⭐⭐⭐⭐
                                </div>
                            </motion.div>
                        </div>

                        {/* Right: product mockup */}
                        <div className="col-12 col-lg-6 d-flex justify-content-center justify-content-lg-end">
                            <HeroMockUI />
                        </div>
                    </div>
                </div>
            </section>

            {/* ── STATS BAR ── */}
            {/* canvas-soft band */}
            <section style={{
                position: 'relative', zIndex: 1,
                padding: 'clamp(40px, 5vw, 60px) 32px',
                backgroundColor: 'var(--canvas-soft)',
            }}>
                <div className="container">
                    <div className="row g-4 text-center">
                        {stats.map((s, i) => (
                            <motion.div
                                key={i} className="col-6 col-md-3"
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1, duration: 0.6 }}
                            >
                                <div style={{
                                    fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700,
                                    color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1,
                                }}>
                                    <Counter to={s.to} suffix={s.suffix} prefix={s.prefix || ''} decimals={s.decimals || 0} />
                                </div>
                                <div style={{ fontSize: '14px', color: 'var(--body)', fontWeight: 400, marginTop: '8px' }}>
                                    {s.label}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            {/* canvas (white) band */}
            <section style={{ position: 'relative', zIndex: 1, padding: 'clamp(60px, 8vw, 96px) 32px', backgroundColor: 'var(--canvas)' }}>
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ duration: 0.6 }}
                        style={{ textAlign: 'center', marginBottom: '56px' }}
                    >
                        {/* Eyebrow uppercase — only exception per DESIGN.md */}
                        <span style={{
                            display: 'inline-block',
                            backgroundColor: 'var(--canvas-soft)', color: 'var(--ink)',
                            fontSize: '12px', fontWeight: 500,
                            padding: '4px 14px', borderRadius: '999px',
                            marginBottom: '16px', letterSpacing: '0.06em', textTransform: 'uppercase',
                        }}>Cách hoạt động</span>
                        {/* display-xl: 36px/700 */}
                        <h2 style={{
                            fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 700,
                            color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: '16px',
                            lineHeight: '44px',
                        }}>
                            3 bước đến band điểm mơ ước
                        </h2>
                        <p style={{ fontSize: '16px', color: 'var(--body)', maxWidth: '480px', margin: '0 auto', lineHeight: '24px' }}>
                            Quy trình đơn giản, được thiết kế để học viên đạt kết quả nhanh nhất.
                        </p>
                    </motion.div>

                    <div className="row g-4">
                        {steps.map((step, i) => (
                            <motion.div
                                key={i} className="col-12 col-md-4"
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.12, duration: 0.7, ease }}
                            >
                                {/* card-soft-tinted: canvas-soft bg, 16px radius */}
                                <motion.div
                                    whileHover={{ y: -4, boxShadow: 'rgba(0,0,0,0.12) 0px 4px 16px 0px' }}
                                    transition={{ duration: 0.25 }}
                                    style={{
                                        backgroundColor: 'var(--canvas-soft)',
                                        borderRadius: '16px',
                                        padding: '28px', height: '100%',
                                        position: 'relative', overflow: 'hidden',
                                    }}
                                >
                                    <div style={{
                                        position: 'absolute', top: '20px', right: '20px',
                                        fontSize: '36px', fontWeight: 700, color: 'rgba(0,0,0,0.08)',
                                        lineHeight: 1, fontFamily: FONT,
                                    }}>{step.num}</div>
                                    <div style={{ fontSize: '28px', marginBottom: '18px' }}>{step.icon}</div>
                                    {/* display-sm: 20px/700 */}
                                    <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', marginBottom: '10px', lineHeight: '28px' }}>
                                        {step.title}
                                    </h3>
                                    <p style={{ fontSize: '16px', color: 'var(--body)', lineHeight: '24px', margin: 0 }}>
                                        {step.desc}
                                    </p>
                                </motion.div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── ALTERNATING PROMO BANDS ── */}
            {/* Per DESIGN.md: white → black → white alternating rhythm */}
            {featureSections.map((section, idx) => (
                <section
                    key={idx}
                    style={{
                        padding: 'clamp(28px, 4vw, 48px) 32px',
                        position: 'relative', zIndex: 1,
                        // alternating: even=canvas-soft, odd=canvas
                        backgroundColor: section.dark
                            ? 'var(--canvas)'   // wrapper bg contrasts the dark card
                            : 'var(--canvas-soft)',
                    }}
                >
                    <div className="container">
                        <motion.div
                            className="row align-items-center g-0 overflow-hidden"
                            style={{
                                // promo-card-illustrated / promo-card-on-dark
                                backgroundColor: section.dark ? 'var(--ink)' : 'var(--canvas)',
                                borderRadius: '16px',
                                boxShadow: 'rgba(0,0,0,0.12) 0px 4px 16px 0px',
                            }}
                            initial={{ opacity: 0, y: 60 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-10%' }}
                            transition={{ duration: 0.9, ease }}
                        >
                            {/* Image column */}
                            <div
                                className={`col-12 col-md-6 p-0 ${section.imageLeft ? 'order-1' : 'order-1 order-md-2'}`}
                                style={{ minHeight: '400px', position: 'relative', overflow: 'hidden', borderRadius: section.imageLeft ? '16px 0 0 16px' : '0 16px 16px 0' }}
                            >
                                <motion.div
                                    initial={section.imgInitial} whileInView={section.imgAnimate}
                                    viewport={{ once: true }}
                                    transition={{ duration: 1.2, ease }}
                                    style={{ position: 'absolute', inset: 0 }}
                                >
                                    <img
                                        src={section.img} alt={section.imgAlt}
                                        style={{
                                            width: '100%', height: '100%', objectFit: 'cover',
                                            filter: section.dark ? 'brightness(0.6) grayscale(0.3)' : 'grayscale(0.1)',
                                        }}
                                    />
                                    {/* Gradient overlay for blending into card */}
                                    <div style={{
                                        position: 'absolute', inset: 0,
                                        background: section.dark
                                            ? (section.imageLeft ? 'linear-gradient(to left, #000000 0%, transparent 60%)' : 'linear-gradient(to right, #000000 0%, transparent 60%)')
                                            : (section.imageLeft ? 'linear-gradient(to left, #ffffff 0%, transparent 50%)' : 'linear-gradient(to right, #ffffff 0%, transparent 50%)'),
                                    }} />
                                </motion.div>
                            </div>

                            {/* Text column */}
                            <div className={`col-12 col-md-6 p-4 p-md-5 ${section.imageLeft ? 'order-2' : 'order-2 order-md-1'}`}>
                                <TiltCard>
                                    {/* Eyebrow uppercase */}
                                    <span style={{
                                        display: 'inline-block',
                                        backgroundColor: section.dark ? 'rgba(255,255,255,0.12)' : 'var(--canvas-soft)',
                                        color: section.dark ? 'var(--canvas)' : 'var(--ink)',
                                        fontSize: '11px', fontWeight: 500,
                                        padding: '4px 12px', borderRadius: '999px',
                                        marginBottom: '18px', letterSpacing: '0.07em', textTransform: 'uppercase',
                                    }}>
                                        {section.badge}
                                    </span>

                                    {/* display-lg: 32px/700 */}
                                    <h2 style={{
                                        fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700,
                                        color: section.dark ? 'var(--canvas)' : 'var(--ink)',
                                        lineHeight: 1.25, letterSpacing: '-0.02em', marginBottom: '14px',
                                    }}>
                                        {section.title}
                                    </h2>

                                    <p style={{
                                        fontSize: '16px', color: section.dark ? 'var(--mute)' : 'var(--body)',
                                        lineHeight: '24px', marginBottom: '22px',
                                    }}>
                                        {section.desc}
                                    </p>

                                    {/* Bullet points */}
                                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 26px' }}>
                                        {section.bullets.map((b) => (
                                            <li key={b} style={{
                                                display: 'flex', alignItems: 'flex-start', gap: '10px',
                                                marginBottom: '9px', fontSize: '14px',
                                                color: section.dark ? 'var(--mute)' : 'var(--body)',
                                                lineHeight: '20px',
                                            }}>
                                                <span style={{
                                                    width: '18px', height: '18px', borderRadius: '9999px',
                                                    backgroundColor: section.dark ? 'var(--canvas)' : 'var(--ink)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: section.dark ? 'var(--ink)' : 'var(--canvas)',
                                                    fontSize: '10px', flexShrink: 0, marginTop: '1px',
                                                }}>✓</span>
                                                {b}
                                            </li>
                                        ))}
                                    </ul>

                                    {/* button-subtle on light / button-floating on dark */}
                                    <MagneticButton>
                                        <Link to="/register" style={{
                                            display: 'inline-flex', alignItems: 'center',
                                            padding: '12px 24px', borderRadius: '999px',
                                            backgroundColor: section.dark ? 'var(--canvas)' : 'var(--ink)',
                                            color: section.dark ? 'var(--ink)' : 'var(--canvas)',
                                            fontWeight: 500, fontSize: '16px', textDecoration: 'none',
                                            boxShadow: section.dark ? 'rgba(0,0,0,0.16) 0px 2px 8px 0px' : 'none',
                                            transition: 'background-color 0.2s ease',
                                        }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = section.dark ? 'var(--canvas-soft)' : 'var(--black-elevated)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = section.dark ? 'var(--canvas)' : 'var(--ink)'}
                                        >
                                            {section.ctaText}
                                        </Link>
                                    </MagneticButton>
                                </TiltCard>
                            </div>
                        </motion.div>
                    </div>
                </section>
            ))}

            {/* ── FEATURES GRID ── */}
            {/* canvas-soft background */}
            <section style={{ padding: 'clamp(60px, 8vw, 96px) 32px', position: 'relative', zIndex: 1, backgroundColor: 'var(--canvas-soft)' }}>
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ duration: 0.6 }}
                        style={{ textAlign: 'center', marginBottom: '44px' }}
                    >
                        <span style={{ display: 'inline-block', backgroundColor: 'var(--canvas)', color: 'var(--ink)', fontSize: '12px', fontWeight: 500, padding: '4px 14px', borderRadius: '999px', marginBottom: '14px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                            Tính năng
                        </span>
                        <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: '44px' }}>
                            Mọi thứ bạn cần để chinh phục IELTS
                        </h2>
                    </motion.div>

                    <div className="row g-3">
                        {featureCards.map((f, i) => (
                            <motion.div
                                key={i} className="col-12 col-sm-6 col-lg-4"
                                initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.07, duration: 0.55 }}
                            >
                                {/* card-content: canvas bg, 16px */}
                                <motion.div
                                    whileHover={{ y: -4, boxShadow: 'rgba(0,0,0,0.12) 0px 4px 16px 0px' }}
                                    transition={{ duration: 0.2 }}
                                    style={{ backgroundColor: 'var(--canvas)', borderRadius: '16px', padding: '24px', height: '100%' }}
                                >
                                    <div style={{ fontSize: '28px', marginBottom: '12px' }}>{f.icon}</div>
                                    {/* display-sm: 20px/700 */}
                                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}>{f.title}</h3>
                                    <p style={{ fontSize: '14px', color: 'var(--body)', lineHeight: '20px', margin: 0 }}>{f.desc}</p>
                                </motion.div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── TESTIMONIALS ── */}
            {/* canvas (white) band */}
            <section style={{ padding: 'clamp(60px, 8vw, 96px) 32px', position: 'relative', zIndex: 1, backgroundColor: 'var(--canvas)' }}>
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ duration: 0.6 }}
                        style={{ textAlign: 'center', marginBottom: '52px' }}
                    >
                        <span style={{ display: 'inline-block', backgroundColor: 'var(--canvas-soft)', color: 'var(--ink)', fontSize: '12px', fontWeight: 500, padding: '4px 14px', borderRadius: '999px', marginBottom: '14px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                            Testimonials
                        </span>
                        <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: '44px', marginBottom: '12px' }}>
                            Học viên nói gì về IELTSZone?
                        </h2>
                        <p style={{ fontSize: '16px', color: 'var(--body)', maxWidth: '440px', margin: '0 auto' }}>
                            Hàng ngàn học viên đã đạt band điểm mục tiêu với sự hỗ trợ của IELTSZone.
                        </p>
                    </motion.div>

                    <div className="row g-4">
                        {testimonials.map((t, i) => (
                            <motion.div
                                key={i} className="col-12 col-md-4"
                                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.12, duration: 0.65 }}
                            >
                                {/* card-elevated: canvas bg, 16px, Level 1 shadow */}
                                <motion.div
                                    whileHover={{ y: -5, boxShadow: 'rgba(0,0,0,0.16) 0px 4px 16px 0px' }}
                                    transition={{ duration: 0.25 }}
                                    style={{
                                        backgroundColor: 'var(--canvas)', borderRadius: '16px', padding: '24px',
                                        border: '1px solid #efefef', height: '100%',
                                        display: 'flex', flexDirection: 'column',
                                        boxShadow: 'rgba(0,0,0,0.06) 0px 2px 8px 0px',
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '2px', marginBottom: '14px' }}>
                                        {[...Array(5)].map((_, j) => <span key={j} style={{ fontSize: '14px' }}>⭐</span>)}
                                    </div>
                                    <p style={{ fontSize: '15px', color: 'var(--body)', lineHeight: '24px', flex: 1, marginBottom: '20px' }}>
                                        "{t.text}"
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {/* avatar pill */}
                                            <div style={{
                                                width: '38px', height: '38px', borderRadius: '9999px',
                                                backgroundColor: 'var(--ink)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'var(--canvas)', fontWeight: 700, fontSize: '15px',
                                            }}>{t.avatar}</div>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>{t.name}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--mute)' }}>{t.role}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '11px', color: 'var(--mute)', marginBottom: '2px' }}>Band</div>
                                            <div style={{ fontSize: '14px', fontWeight: 700 }}>
                                                <span style={{ color: 'var(--mute)' }}>{t.before}</span>
                                                <span style={{ color: 'var(--mute)', margin: '0 4px' }}>→</span>
                                                <span style={{ color: 'var(--ink)' }}>{t.after}</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FINAL CTA ── */}
            {/* hero-band-dark: ink bg per DESIGN.md */}
            {!user && (
            <section style={{ padding: 'clamp(28px, 4vw, 48px) 32px clamp(60px, 8vw, 80px)', position: 'relative', zIndex: 1, backgroundColor: 'var(--canvas)' }}>
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0, y: 48, scale: 0.97 }}
                        whileInView={{ opacity: 1, y: 0, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease }}
                        style={{
                            backgroundColor: 'var(--ink)',
                            borderRadius: '16px',
                            padding: 'clamp(48px, 6vw, 72px) clamp(28px, 6vw, 72px)',
                            textAlign: 'center', position: 'relative', overflow: 'hidden',
                        }}
                    >
                        {/* Subtle dot pattern on dark surface */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
                            backgroundSize: '32px 32px',
                            pointerEvents: 'none',
                        }} />

                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <motion.div
                                initial={{ scale: 0, rotate: -20 }} whileInView={{ scale: 1, rotate: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 14 }}
                                style={{ fontSize: '48px', marginBottom: '22px' }}
                            >🚀</motion.div>

                            {/* display-xxl: 52px/700 on dark */}
                            <h2 style={{
                                fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700,
                                color: 'var(--canvas)', letterSpacing: '-0.02em',
                                lineHeight: 1.2, marginBottom: '16px',
                            }}>
                                Bắt đầu hành trình IELTS của bạn
                            </h2>
                            <p style={{
                                fontSize: '18px', color: 'rgba(255,255,255,0.55)',
                                maxWidth: '440px', margin: '0 auto 36px', lineHeight: '28px',
                                fontWeight: 500,
                            }}>
                                Hoàn toàn miễn phí. Không cần thẻ tín dụng. Nhận phản hồi AI đầu tiên ngay trong 5 phút.
                            </p>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <MagneticButton>
                                    {/* button-secondary (white pill) on dark band */}
                                    <Link to="/register" style={{
                                        display: 'inline-flex', alignItems: 'center',
                                        padding: '14px 32px', borderRadius: '999px',
                                        backgroundColor: 'var(--canvas)', color: 'var(--ink)',
                                        fontWeight: 500, fontSize: '16px', textDecoration: 'none',
                                        boxShadow: 'rgba(0,0,0,0.16) 0px 2px 8px 0px',
                                        transition: 'background-color 0.2s ease',
                                    }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--canvas-soft)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--canvas)'}
                                    >
                                        Đăng ký miễn phí ngay
                                    </Link>
                                </MagneticButton>
                                <Link to="/login" style={{
                                    display: 'inline-flex', alignItems: 'center',
                                    padding: '14px 32px', borderRadius: '999px',
                                    border: '1px solid rgba(255,255,255,0.25)',
                                    color: 'rgba(255,255,255,0.75)',
                                    fontWeight: 500, fontSize: '16px', textDecoration: 'none',
                                    transition: 'border-color 0.2s ease',
                                }}>
                                    Đã có tài khoản
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>
            )}

            {/* ── FOOTER ── */}
            {/* footer: primary (black) bg per DESIGN.md */}
            <footer style={{
                backgroundColor: 'var(--ink)',
                padding: 'clamp(40px, 5vw, 56px) 32px 32px',
                position: 'relative', zIndex: 1,
                fontFamily: FONT,
            }}>
                <div className="container">
                    <div className="row g-4" style={{ marginBottom: '40px' }}>
                        {/* Brand */}
                        <div className="col-12 col-md-4">
                            <Link to="/" style={{ textDecoration: 'none' }}>
                                <div style={{ fontWeight: 700, fontSize: '20px', color: 'var(--canvas)', letterSpacing: '-0.02em', marginBottom: '12px' }}>
                                    IELTSZone
                                </div>
                            </Link>
                            <p style={{ fontSize: '14px', color: 'var(--hairline-mid)', lineHeight: '20px', maxWidth: '240px' }}>
                                Nền tảng luyện thi IELTS thông minh, tích hợp AI chấm bài và lộ trình cá nhân hóa.
                            </p>
                        </div>

                        {/* Link columns — footer body-sm + body-md-strong eyebrows */}
                        {Object.entries(footerCols).map(([title, links]) => (
                            <div key={title} className="col-6 col-md-2">
                                <div style={{
                                    fontSize: '14px', fontWeight: 500, color: 'var(--canvas)',
                                    marginBottom: '14px',
                                }}>{title}</div>
                                {links.map(([label, href]) => (
                                    <div key={label} style={{ marginBottom: '10px' }}>
                                        <Link
                                            to={href}
                                            style={{ fontSize: '14px', color: 'var(--hairline-mid)', textDecoration: 'none', transition: 'color 0.2s' }}
                                            onMouseEnter={(e) => (e.target.style.color = 'var(--mute)')}
                                            onMouseLeave={(e) => (e.target.style.color = 'var(--hairline-mid)')}
                                        >{label}</Link>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Bottom bar */}
                    <div style={{
                        borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        flexWrap: 'wrap', gap: '12px',
                    }}>
                        <div style={{ fontSize: '12px', color: 'var(--hairline-mid)' }}>
                            © 2026 IELTSZone. All rights reserved.
                        </div>
                        {/* app-download-pill style language buttons */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {['🇻🇳 Tiếng Việt', '🇬🇧 English'].map((lang) => (
                                <button key={lang} style={{
                                    backgroundColor: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'var(--hairline-mid)', fontSize: '12px',
                                    padding: '5px 12px', borderRadius: '999px', cursor: 'pointer',
                                    fontFamily: FONT,
                                }}>{lang}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
