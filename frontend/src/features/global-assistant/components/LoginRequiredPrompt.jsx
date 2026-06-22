import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';

const LoginRequiredPrompt = () => (
  <div className="assistant-login-prompt">
    <div className="assistant-login-prompt__icon">
      <LogIn size={22} aria-hidden="true" />
    </div>
    <div>
      <h2>Đăng nhập để sử dụng trợ lý IELTS</h2>
      <p>Bạn cần đăng nhập trước khi gửi câu hỏi, tìm tài liệu hoặc xem giải thích đáp án.</p>
    </div>
    <div className="assistant-login-prompt__actions">
      <Link to="/login" className="assistant-primary-link">Đăng nhập</Link>
      <Link to="/register" className="assistant-secondary-link">Tạo tài khoản</Link>
    </div>
  </div>
);

export default LoginRequiredPrompt;
