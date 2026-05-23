# CONTEXT.md — Subjective Grading System (Writing & Speaking)
# Người viết: Tech Lead (Minh) | Ngày: 2026-05-21

## 1. PROBLEM STATEMENT
- Học viên luyện thi IELTS cần feedback chi tiết cho bài Writing và Speaking nhưng giáo viên không thể chấm bài 24/7.
- Hệ thống cần tự động hóa việc chấm điểm (AI) để có kết quả tức thì, đồng thời vẫn giữ lựa chọn chấm thủ công bởi Tutor khi học viên cần nhận xét chuyên sâu.

## 2. DOMAIN KNOWLEDGE
- **Writing Criteria (4 tiêu chí):** Task Achievement (TA), Coherence and Cohesion (CC), Lexical Resource (LR), Grammatical Range and Accuracy (GRA).
- **Speaking Criteria (4 tiêu chí):** Fluency and Coherence (FC), Lexical Resource (LR), Grammatical Range and Accuracy (GRA), Pronunciation (P).
- **Asynchronous Processing:** Việc chấm điểm bài tự luận (đặc biệt là Speaking audio) tốn nhiều tài nguyên. AI không trả kết quả ngay trong HTTP request mà phải đẩy vào hàng đợi.

## 3. STAKEHOLDERS
- **Student:** Người gửi bài, người nhận feedback.
- **Tutor:** Người chấm điểm thay thế/bổ sung, người cung cấp feedback sâu (audio/text).
- **AI System:** Thực thi các tác vụ tính toán nặng: Speech-to-Text, Grading, Error Detection.

## 4. CONSTRAINTS
- **Performance:** Không được block thread chính của server trong lúc AI đang chấm.
- **Realtime:** Kết quả chấm điểm khi hoàn tất phải được đẩy về Frontend ngay qua Socket.io.
- **Security:** Bài thi audio/essay của học viên phải được bảo mật, không được log nội dung nhạy cảm ra file log server.
- **Audio:** Định dạng `.mp3`, max 11-15 phút phút, max 36MB.

## 5. ASSUMPTIONS
- Giả định hệ thống AI Core (thông qua API) đã ổn định và trả về kết quả định dạng JSON.
- Giả định Tutor có Dashboard riêng để nhận các bài thi được chỉ định (status `PENDING_TUTOR`).
- Giả định hệ thống Socket.io đã được config trên cả Backend và Frontend.

## 6. OPEN QUESTIONS & DECISIONS
- *Q: Nếu Tutor chấm bài xong thì điểm của AI có bị ghi đè không?*
  -> *Decision:* Điểm của Tutor luôn là ưu tiên cao nhất (Source of Truth). Nếu Tutor chấm, hệ thống cập nhật lại điểm cuối cùng.
- *Q: Làm sao để AI chấm sơ bộ trước cho Tutor?*
  -> *Decision:* Mọi bài nộp Writing đều chạy qua AI chấm sơ bộ để lấy gợi ý Grammar/Vocab trước khi Tutor vào xem (theo đúng yêu cầu Tutor-03).

  NGUYEN BA QUANG MINH