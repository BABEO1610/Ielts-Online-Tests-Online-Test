import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import StudentNavbar from '../components/layout/StudentNavbar';

// --- Sub-components for heavy animations ---

const MagneticButton = ({ children, className, style, onClick }) => {
    const ref = useRef(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
    const springX = useSpring(x, springConfig);
    const springY = useSpring(y, springConfig);

    const handleMouseMove = (e) => {
        if (!ref.current) return;
        const { clientX, clientY } = e;
        const { height, width, left, top } = ref.current.getBoundingClientRect();
        const middleX = clientX - (left + width / 2);
        const middleY = clientY - (top + height / 2);
        x.set(middleX * 0.2); // Magnetic pull strength
        y.set(middleY * 0.2);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ x: springX, y: springY }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="d-inline-block"
        >
            <div className={className} style={style} onClick={onClick}>
                {children}
            </div>
        </motion.div>
    );
};

const TiltCard = ({ children, className, style }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
    const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                perspective: 1000,
                rotateY,
                rotateX,
                transformStyle: "preserve-3d",
                ...style
            }}
            className={className}
        >
            <div style={{ transform: "translateZ(40px)", transition: "transform 0.1s" }}>
                {children}
            </div>
        </motion.div>
    );
};

const TextReveal = ({ text, className, style }) => {
    const words = text.split(" ");

    const container = {
        hidden: { opacity: 0 },
        visible: (i = 1) => ({
            opacity: 1,
            transition: { staggerChildren: 0.08, delayChildren: 0.04 * i },
        }),
    };

    const child = {
        visible: {
            opacity: 1,
            y: 0,
            rotate: 0,
            transition: {
                type: "spring",
                damping: 12,
                stiffness: 100,
            },
        },
        hidden: {
            opacity: 0,
            y: 50,
            rotate: 5,
        },
    };

    return (
        <motion.div
            style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", ...style }}
            className={className}
            variants={container}
            initial="hidden"
            animate="visible"
        >
            {words.map((word, index) => (
                <motion.span
                    variants={child}
                    style={{ marginRight: "0.25em", display: "inline-block" }}
                    key={index}
                >
                    {word}
                </motion.span>
            ))}
        </motion.div>
    );
};

const AnimatedBackground = () => {
    return (
        <div className="position-fixed w-100 h-100" style={{ top: 0, left: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {/* Floating Pills */}
            {[...Array(8)].map((_, i) => (
                <motion.div
                    key={i}
                    className="position-absolute"
                    style={{
                        width: `${Math.random() * 300 + 150}px`,
                        height: `${Math.random() * 80 + 40}px`,
                        borderRadius: '999px',
                        backgroundColor: i % 2 === 0 ? '#efefef' : '#f3f3f3',
                        opacity: 0.7,
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                    }}
                    animate={{
                        x: [0, Math.random() * 200 - 100, 0],
                        y: [0, Math.random() * 200 - 100, 0],
                        rotate: [0, 180, 360],
                    }}
                    transition={{
                        duration: Math.random() * 30 + 30,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                />
            ))}
            {/* Animated Grid overlay for texture */}
            <motion.div 
                className="w-100 h-100 position-absolute" 
                style={{ 
                    top: 0, left: 0,
                    backgroundImage: 'radial-gradient(#d5d5d5 1px, transparent 1px)', 
                    backgroundSize: '40px 40px',
                    opacity: 0.4
                }}
                animate={{
                    backgroundPosition: ['0px 0px', '40px 40px']
                }}
                transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "linear"
                }}
            />
        </div>
    );
};

// --- Main Page ---

const LandingPage = () => {
    const { scrollYProgress } = useScroll();
    
    // Parallax background elements
    const yBg1 = useTransform(scrollYProgress, [0, 1], [0, 500]);
    const yBg2 = useTransform(scrollYProgress, [0, 1], [0, -500]);
    
    // Parallax image transforms
    const { scrollY } = useScroll();
    const yImageParallax1 = useTransform(scrollY, [0, 1000], [0, -80]);
    const yImageParallax2 = useTransform(scrollY, [500, 1500], [0, -80]);
    const yImageParallax3 = useTransform(scrollY, [1000, 2000], [0, -80]);

    return (
        <div className="landing-page min-vh-100 position-relative overflow-hidden" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', backgroundColor: '#ffffff' }}>
            
            <StudentNavbar />
            
            <AnimatedBackground />

            {/* Continuous Background Floating Elements */}
            <motion.div 
                className="position-absolute rounded-circle" 
                style={{ width: '40vw', height: '40vw', backgroundColor: '#efefef', filter: 'blur(100px)', top: '-10vw', left: '-10vw', zIndex: 0, y: yBg1 }} 
            />
            <motion.div 
                className="position-absolute rounded-circle" 
                style={{ width: '50vw', height: '50vw', backgroundColor: '#f3f3f3', filter: 'blur(120px)', bottom: '10%', right: '-15vw', zIndex: 0, y: yBg2 }} 
            />

            {/* Hero Section */}
            <section className="position-relative d-flex align-items-center" style={{ padding: '160px 32px 140px', zIndex: 1, minHeight: '80vh' }}>
                <div className="container text-center">
                    <TextReveal 
                        text="Master IELTS with AI Precision" 
                        className="fw-bold mb-4 mx-auto" 
                        style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: 'clamp(40px, 6vw, 64px)', color: '#000000', lineHeight: '1.1', letterSpacing: '-0.03em', maxWidth: '900px' }} 
                    />
                    
                    <motion.p 
                        className="mb-5 mx-auto" 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        style={{ maxWidth: '600px', fontSize: '18px', fontWeight: '500', color: '#5e5e5e', lineHeight: '28px' }}
                    >
                        Nền tảng luyện thi trực tuyến thông minh, tích hợp chấm bài bằng AI và hệ thống thư viện tài liệu phong phú giúp bạn đạt band điểm mục tiêu nhanh chóng.
                    </motion.p>
                    
                    <motion.div 
                        className="d-flex justify-content-center gap-3 flex-wrap"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
                    >
                        <MagneticButton>
                            <Link to="/register" className="btn rounded-pill fw-bold text-white text-decoration-none d-inline-flex align-items-center justify-content-center" style={{ backgroundColor: '#000000', fontSize: '16px', padding: '14px 28px', height: '54px', border: '2px solid #000000', minWidth: '180px', transition: 'background-color 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#282828'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#000000'}>
                                Bắt đầu ngay
                            </Link>
                        </MagneticButton>
                        <MagneticButton>
                            <Link to="/login" className="btn rounded-pill fw-bold text-dark text-decoration-none d-inline-flex align-items-center justify-content-center" style={{ backgroundColor: '#efefef', fontSize: '16px', padding: '14px 28px', height: '54px', border: '2px solid transparent', minWidth: '180px', transition: 'background-color 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e2e2'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#efefef'}>
                                Đăng nhập
                            </Link>
                        </MagneticButton>
                    </motion.div>
                </div>
            </section>

            {/* Alternating Promo Bands with Tilt & Reveal */}
            
            {/* Section 1 (Chấm bài bằng AI) - Light surface */}
            <section className="py-5 position-relative" style={{ zIndex: 1 }}>
                <div className="container">
                    <motion.div 
                        className="row align-items-center overflow-hidden" 
                        style={{ backgroundColor: '#efefef', borderRadius: '24px' }}
                        initial={{ opacity: 0, y: 80 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-10%" }}
                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <motion.div className="col-12 col-md-6 p-4 p-md-5 p-lg-6 order-2 order-md-1">
                            <TiltCard>
                                <h2 className="fw-bold mb-4" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: 'clamp(28px, 4vw, 40px)', color: '#000000', lineHeight: '1.2', letterSpacing: '-0.02em' }}>
                                    Chấm bài bằng AI
                                </h2>
                                <p style={{ fontSize: '18px', color: '#5e5e5e', lineHeight: '28px' }} className="mb-4">
                                    Nhận feedback chi tiết và chấm điểm chính xác nhờ công nghệ AI tiên tiến, tối ưu hóa quá trình học. Không còn phải chờ đợi dài ngày để biết được kết quả làm bài của bạn.
                                </p>
                                <MagneticButton>
                                    <button className="btn rounded-pill fw-bold text-dark border-0 shadow-sm" style={{ backgroundColor: '#ffffff', fontSize: '16px', padding: '14px 28px', transition: 'box-shadow 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'} onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'}>
                                        Tìm hiểu thêm
                                    </button>
                                </MagneticButton>
                            </TiltCard>
                        </motion.div>
                        <motion.div className="col-12 col-md-6 p-0 order-1 order-md-2 h-100 position-relative overflow-hidden" style={{ minHeight: '400px' }}>
                            <motion.div 
                                initial={{ scale: 1.3, filter: 'blur(20px)' }}
                                whileInView={{ scale: 1, filter: 'blur(0px)' }}
                                viewport={{ once: true }}
                                transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                                style={{ y: yImageParallax1, width: '100%', height: '120%', position: 'absolute', top: '-10%' }}
                            >
                                <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1000&auto=format&fit=crop" alt="AI Grading" className="w-100 h-100 object-fit-cover" />
                            </motion.div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Section 2 (Thư viện tài liệu) - Polarity-flipped Dark surface */}
            <section className="py-5 position-relative" style={{ zIndex: 1 }}>
                <div className="container">
                    <motion.div 
                        className="row align-items-center overflow-hidden" 
                        style={{ backgroundColor: '#000000', borderRadius: '24px' }}
                        initial={{ opacity: 0, y: 80 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-10%" }}
                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <motion.div className="col-12 col-md-6 p-0 order-1 order-md-1 h-100 position-relative overflow-hidden" style={{ minHeight: '400px' }}>
                            <motion.div 
                                initial={{ x: '-100%', opacity: 0.5 }}
                                whileInView={{ x: 0, opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                                style={{ y: yImageParallax2, width: '100%', height: '120%', position: 'absolute', top: '-10%' }}
                            >
                                <img src="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=1000&auto=format&fit=crop" alt="Library" className="w-100 h-100 object-fit-cover" style={{ filter: 'brightness(0.9)' }} />
                            </motion.div>
                        </motion.div>
                        <motion.div className="col-12 col-md-6 p-4 p-md-5 p-lg-6 order-2 order-md-2">
                            <TiltCard>
                                <h2 className="fw-bold mb-4 text-white" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: '1.2', letterSpacing: '-0.02em' }}>
                                    Thư viện tài liệu
                                </h2>
                                <p style={{ fontSize: '18px', color: '#afafaf', lineHeight: '28px' }} className="mb-4">
                                    Kho tài liệu khổng lồ, được cập nhật liên tục để hỗ trợ bạn luyện thi ở mọi kỹ năng một cách tốt nhất. Truy cập hàng ngàn bài mẫu writing và speaking độc quyền.
                                </p>
                                <MagneticButton>
                                    <button className="btn rounded-pill fw-bold text-dark border-0" style={{ backgroundColor: '#ffffff', fontSize: '16px', padding: '14px 28px', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 20px rgba(255,255,255,0.4)'} onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}>
                                        Khám phá thư viện
                                    </button>
                                </MagneticButton>
                            </TiltCard>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Section 3 (Lộ trình cá nhân hóa) - Light surface */}
            <section className="py-5 position-relative" style={{ zIndex: 1 }}>
                <div className="container">
                    <motion.div 
                        className="row align-items-center overflow-hidden" 
                        style={{ backgroundColor: '#efefef', borderRadius: '24px' }}
                        initial={{ opacity: 0, y: 80 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-10%" }}
                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <motion.div className="col-12 col-md-6 p-4 p-md-5 p-lg-6 order-2 order-md-1">
                            <TiltCard>
                                <h2 className="fw-bold mb-4" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: 'clamp(28px, 4vw, 40px)', color: '#000000', lineHeight: '1.2', letterSpacing: '-0.02em' }}>
                                    Lộ trình cá nhân hóa
                                </h2>
                                <p style={{ fontSize: '18px', color: '#5e5e5e', lineHeight: '28px' }} className="mb-4">
                                    Lộ trình học tập được thiết kế riêng biệt để phù hợp với trình độ, giúp bạn đạt band điểm mục tiêu hiệu quả nhất mà không lãng phí thời gian.
                                </p>
                                <MagneticButton>
                                    <button className="btn rounded-pill fw-bold text-dark border-0 shadow-sm" style={{ backgroundColor: '#ffffff', fontSize: '16px', padding: '14px 28px', transition: 'box-shadow 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'} onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'}>
                                        Xem lộ trình
                                    </button>
                                </MagneticButton>
                            </TiltCard>
                        </motion.div>
                        <motion.div className="col-12 col-md-6 p-0 order-1 order-md-2 h-100 position-relative overflow-hidden" style={{ minHeight: '400px' }}>
                            <motion.div
                                initial={{ scale: 0.8, borderRadius: '50%' }}
                                whileInView={{ scale: 1, borderRadius: '0%' }}
                                viewport={{ once: true }}
                                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                                style={{ y: yImageParallax3, width: '100%', height: '120%', position: 'absolute', top: '-10%' }}
                            >
                                <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1000&auto=format&fit=crop" alt="Personalized Path" className="w-100 h-100 object-fit-cover" />
                            </motion.div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <motion.footer 
                className="mt-5 position-relative" 
                style={{ backgroundColor: '#000000', padding: '80px 32px', zIndex: 1 }}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
                <div className="container">
                    <div className="row">
                        <div className="col-12 text-white text-center">
                            <h4 className="fw-bold mb-3" style={{ fontFamily: 'UberMove, system-ui, sans-serif', letterSpacing: '-0.02em', fontSize: '32px' }}>IELTSZone</h4>
                            <p style={{ fontSize: '14px', color: '#afafaf' }}>© 2026 IELTSZone. All rights reserved. Master your English skills.</p>
                            
                            <motion.div 
                                className="mt-4"
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                            >
                                <div style={{ width: '40px', height: '4px', backgroundColor: '#ffffff', margin: '0 auto', borderRadius: '2px' }} />
                            </motion.div>
                        </div>
                    </div>
                </div>
            </motion.footer>
        </div>
    );
};

export default LandingPage;
