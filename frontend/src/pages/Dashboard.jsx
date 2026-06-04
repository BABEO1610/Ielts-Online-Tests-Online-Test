import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentNavbar from '../components/layout/StudentNavbar';
import FeatureCard from '../components/dashboard/FeatureCard';
import PromoBand from '../components/dashboard/PromoBand';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="bg-white min-vh-100 pb-5">
      <StudentNavbar />

      <main className="container-fluid px-3 px-md-5 mt-4 mt-md-5" style={{ maxWidth: '1200px' }}>
        {/* Hero Band */}
        <div className="mb-5">
          <h1 className="fw-bold mb-2 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '52px' }}>
            Chào mừng trở lại, {user?.full_name?.split(' ')[0] || 'Học viên'}
          </h1>
          <p className="text-muted" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '20px' }}>
            Hôm nay bạn muốn rèn luyện kỹ năng nào?
          </p>
        </div>

        {/* Promo Band - Library */}
        <PromoBand
          title="Kho Tài Liệu IELTS Phong Phú"
          description="Khám phá hàng ngàn đề thi thật, bài mẫu tham khảo và từ vựng chuyên ngành được cập nhật liên tục để bứt phá điểm số."
          actionText="Truy cập Thư viện"
          actionLink="/library"
          illustrationUrl="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=1000&auto=format&fit=crop"
        />

        {/* Features Grid */}
        <div className="d-flex flex-column gap-5 mb-5">
          <FeatureCard
            title="Writing - Luyện viết cùng AI"
            description="Làm các bài thi Writing Task 1 & 2 với trải nghiệm như thi thật. Nhận điểm số band score và feedback chi tiết từ AI chỉ sau vài giây."
            imageSrc="https://uctlanguagecentre.com/hubfs/Imported_Blog_Media/IELTS-writing.jpg"
            actionText="Luyện Writing"
            actionLink="/writing"
            reverse={false}
          />

          <FeatureCard
            title="Speaking - Phòng thi mô phỏng"
            description="Trải nghiệm bài thi Speaking 1-1 với giám khảo AI qua giọng nói chân thực. Được đánh giá chi tiết theo 4 tiêu chí Fluency, Lexical, Grammar, Pronunciation."
            imageSrc="https://images.unsplash.com/photo-1588702547923-7093a6c3ba33?q=80&w=1000&auto=format&fit=crop"
            actionText="Luyện Speaking"
            actionLink="/speaking"
            reverse={true}
          />

          <FeatureCard
            title="Reading - Đọc hiểu chuyên sâu"
            description="Hệ thống bài tập Reading đa dạng chủ đề từ dễ đến khó. Giải thích đáp án chi tiết giúp bạn nhanh chóng nắm bắt các dạng câu hỏi khó."
            imageSrc="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1000&auto=format&fit=crop"
            actionText="Luyện Reading"
            actionLink="/reading"
            reverse={false}
          />

          <FeatureCard
            title="Listening - Nghe hiểu thực tế"
            description="Nâng cao khả năng phản xạ nghe với kho audio gốc. Đa dạng tốc độ và accent, mô phỏng hoàn hảo môi trường làm bài thi thực tế."
            imageSrc="https://ap-southeast-2-seek-apac.graphassets.com/AEzBCRO50TYyqbV6XzRDQz/nTcfImLRB2iPo9zNq4nP"
            actionText="Luyện Listening"
            actionLink="/listening"
            reverse={true}
          />
        </div>

      </main>
    </div>
  );
};

export default Dashboard;
