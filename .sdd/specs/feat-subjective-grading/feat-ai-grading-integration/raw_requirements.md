# Yêu cầu thô: Luồng Chấm điểm Tự động bằng AI (Raw Requirements)

**Dự án**: IELTSZone  
**Tính năng**: `feat-ai-grading-integration`  
**Người thu thập (BA / Dev)**: Nhóm phát triển  
**Nguồn cung cấp yêu cầu**: Biên bản thảo luận Tech Lead, Chuyên gia IELTS, Product Owner  
**Ngày thu thập**: 2026-07-20  
**Tình trạng**: Đã tiếp nhận → Dùng làm đầu vào để chuẩn hóa thành [spec.md](./spec.md)

---

## 1. Bối cảnh & Vấn đề thực tế (Pain Points)

Trung tâm muốn tích hợp AI để chấm Writing và Speaking tự động nhưng đang gặp những thách thức:
1. **Chi phí API không kiểm soát**: Gọi AI mà không có bộ lọc trước thì bài nộp rác (vài từ) cũng tiêu thụ token như bài đầy đủ — tốn tiền vô ích.
2. **Kết quả AI không nhất quán**: Trước đây không có đủ 4 tiêu chí IELTS trong prompt nên AI trả về band score không đồng đều giữa các lần chấm.
3. **Không bảo vệ bài làm khi AI lỗi**: Nếu nhà cung cấp AI bị downtime, bài làm của học viên bị mất vì backend không xử lý lỗi đúng cách — xóa bài hoặc trả về trang trắng.
4. **Chấm lại tốn tiền**: Học viên bấm nút chấm lại nhiều lần, mỗi lần lại gọi API AI — chi phí nhân lên không cần thiết.
5. **Không theo dõi được chi phí**: Không biết một ngày tốn bao nhiêu token, bài nào tốn nhiều nhất để kiểm soát ngân sách.

---

## 2. Ghi chép yêu cầu thô từ khách hàng (Customer Voice / Raw Notes)

**Từ phía Product Owner:**
- *"Tôi cần AI chấm được cả bài Writing lẫn Speaking. Writing thì chấm theo Task, Speaking thì chấm chung cả 3 Parts như một phiên thi hoàn chỉnh."*
- *"Khi học viên nộp bài lần đầu, AI chấm ngay. Nếu học viên bấm chấm lại cùng bài đó thì không được gọi AI nữa — trả lại kết quả cũ là đủ, tránh tốn token."*
- *"Cần đánh giá theo đúng 4 tiêu chí thi IELTS thật, không phải điểm tổng chung chung."*
- *"Điểm tổng Writing phải tính 33% Task 1 + 67% Task 2 theo chuẩn IELTS. Làm tròn theo nấc 0.5 kiểu IELTS (ví dụ 6.25 → 6.5)."*
- *"AI Speaking thì chấm toàn bộ phiên 3 Parts, không chia band điểm theo từng Part riêng lẻ."*

**Từ phía Tech Lead:**
- *"Phải kiểm tra số từ trước khi gọi AI. Task 1 phải đủ ít nhất 50 từ, Task 2 ít nhất 100 từ. Bài không đủ từ thì từ chối ngay, không gọi API."*
- *"Khi AI lỗi (timeout, 5xx, mất mạng...) thì bài nộp của học viên phải giữ nguyên trong DB với status = pending. Không được tự động xóa bài hoặc chuyển bài sang hàng đợi Giáo viên."*
- *"Speaking thiếu transcript thì backend phải tự gọi ASR để tạo transcript trước, rồi mới đưa vào AI chấm."*
- *"Phải ghi lại mỗi lần gọi AI: tốn bao nhiêu token, model nào, thời gian phản hồi bao lâu — để sau theo dõi chi phí và debug."*
- *"AI có thể gọi qua OpenAI (gpt-4o-mini) hoặc Google Gemini — cần thiết kế để dễ chuyển đổi nhà cung cấp mà không phải sửa nhiều code."*

**Từ phía Chuyên gia IELTS:**
- *"4 tiêu chí Writing: Task Achievement (Task 1) / Task Response (Task 2), Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy."*
- *"4 tiêu chí Speaking: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation."*
- *"AI cần trả về không chỉ điểm số mà còn phần nhận xét, danh sách lỗi trong bài và bản viết lại được cải thiện (Improved Version) với Writing."*

---

## 3. Các câu hỏi làm rõ phát sinh trong quá trình phân tích (Clarification Questions)

1. **Hỏi**: *Khi Speaking thiếu transcript và hệ thống gọi ASR thất bại thì xử lý thế nào?*  
   **Trả lời**: *Bài nộp giữ nguyên status = 'pending', ghi lỗi vào ai_grading_reports với status = 'failed'. Không tự động chuyển sang Tutor. Học viên có thể yêu cầu chấm lại từ trang lịch sử.*
2. **Hỏi**: *Idempotency được tính theo cặp (bài nộp + task) hay theo toàn bộ nhóm (group_id)?*  
   **Trả lời**: *Theo từng bản ghi trong ai_grading_reports. Nếu đã có bản ghi với status = 'completed' cho submissionId đó thì trả về cached. Mỗi Task/Part có báo cáo riêng.*
3. **Hỏi**: *Có cần giới hạn số lần học viên được yêu cầu chấm AI trong ngày không?*  
   **Trả lời**: *Có, nhưng thuộc phần Quota — xử lý bởi aiQuota.service.js (module riêng). feat-ai-grading-integration chỉ chịu trách nhiệm về bước kiểm tra quota trước khi gọi, không tự quyết định hạn mức.*
