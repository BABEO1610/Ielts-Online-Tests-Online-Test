# Yêu cầu thô: Không gian chấm bài dành cho Giáo viên (Raw Requirements)

**Dự án**: IELTSZone  
**Tính năng**: `feat-tutor-grading-workspace`  
**Người thu thập (BA / Dev)**: Nhóm phát triển  
**Nguồn cung cấp yêu cầu**: Biên bản phỏng vấn Giáo viên (Tutor) & Trưởng bộ môn  
**Ngày thu thập**: 2026-07-20  
**Tình trạng**: Đã tiếp nhận → Dùng làm đầu vào để chuẩn hóa thành [spec.md](./spec.md)

---

## 1. Bối cảnh & Vấn đề thực tế (Pain Points)

Giáo viên hiện đang chấm bài qua email và file Word, gây ra hàng loạt vấn đề:
1. **Chấm trùng bài**: Hai giáo viên cùng nhận bài từ Admin qua email, cùng mở và chấm song song → Một bài có 2 bộ nhận xét trái chiều, học viên không biết lấy cái nào.
2. **Mất bình luận giữa chừng**: Giáo viên đang gõ nhận xét, điện mất hoặc tab bị đóng là mất hết. Không có autosave.
3. **Không có tiêu chí chuẩn**: Mỗi giáo viên tự nghĩ tiêu chí, cho điểm theo cảm tính — không theo đúng rubric IELTS 4 tiêu chí.
4. **Mất thời gian cho bài dễ**: Giáo viên tốn 15-20 phút cho bài Writing cơ bản trong khi AI có thể cho ra bản nháp sơ bộ để giáo viên chỉ cần điều chỉnh.
5. **Không kiểm tra được lịch sử**: Giáo viên không xem lại được bài mình đã chấm tháng trước để tham khảo hoặc sửa khi phát hiện lỗi.

---

## 2. Ghi chép yêu cầu thô từ khách hàng (Customer Voice / Raw Notes)

**Từ Giáo viên (Tutor) — đại diện cho người dùng chính:**
- *"Tôi cần vào một trang và thấy danh sách các bài đang chờ chấm của mình, hoặc bài nào chưa ai nhận thì tôi có thể nhận chấm luôn."*
- *"Phải có tìm kiếm theo tên học viên, và lọc được Writing hoặc Speaking riêng — đừng để tất cả lẫn lộn."*
- *"Khi tôi bấm nhận bài thì bài đó phải bị khóa lại cho tôi, không được để giáo viên khác cũng mở bài đó lên chấm cùng lúc."*
- *"Màn hình chấm Writing phải hiện cả đề bài Task 1 và Task 2, và bài làm của học viên bên cạnh — không phải để tôi tự mở file Word ra đối chiếu."*
- *"Chấm Speaking thì tôi cần nghe được file audio của cả 3 Part ngay trên trang, không phải download về máy."*
- *"Form chấm điểm phải có đủ 4 ô điểm theo tiêu chí IELTS, không phải chỉ một ô điểm tổng."*
- *"Điểm phải theo nấc 0.5 (0.0, 0.5, 1.0... 9.0) — đây là quy tắc IELTS, không phải điểm thập phân tự do."*
- *"Tôi muốn có nút 'Gợi ý AI' — bấm vào thì AI điền sẵn điểm và nhận xét nháp cho tôi, tôi chỉ cần xem lại và sửa. Tiết kiệm thời gian hơn nhiều."*
- *"Nhưng gợi ý AI chỉ là tham khảo, không được tự động lưu. Tôi vẫn phải tự bấm 'Lưu kết quả' thì mới chính thức."*
- *"Tôi muốn xem lại danh sách bài tôi đã chấm. Nếu phát hiện chấm sai thì phải được sửa hoặc thu hồi — không thể để kết quả sai ảnh hưởng đến học viên."*
- *"Thu hồi thì chỉ tôi mới được thu hồi bài của tôi, giáo viên khác không được đụng vào bài của tôi."*

**Từ phía Tech Lead về bảo mật:**
- *"Khi 20 giáo viên cùng bấm nhận một bài lúc 9h tối thì chỉ đúng 1 người được nhận thôi. Cần lock nguyên tử ở DB level."*
- *"Giáo viên chỉ được xem bài của học viên được gán cho mình, không phải toàn bộ bài nộp trong hệ thống."*
- *"Điểm AI và điểm Giáo viên phải lưu ở cột riêng biệt — không được để giáo viên nhập điểm ghi đè lên overall_ai_band."*
- *"Mọi thao tác chấm bài, sửa điểm, thu hồi phải được ghi vào audit_logs."*

---
## 3. Các câu hỏi làm rõ phát sinh trong quá trình phân tích (Clarification Questions)

1. **Hỏi**: *Giáo viên có thể chấm bài mà không cần Admin phân công trước không?*  
   **Trả lời**: *Có. Giáo viên xem được bài chưa có assigned_tutor_id (tự do) và có thể tự nhận chấm. Admin cũng có thể phân công trước qua feat-admin-tutor-assignment. Cả hai luồng đều cho phép.*
2. **Hỏi**: *Khi "Gợi ý AI" bấm nhưng AI trả về lỗi thì hiện gì?*  
   **Trả lời**: *Hiển thị thông báo lỗi bằng tiếng Việt, form điểm vẫn trống để giáo viên tự nhập. Không để form bị kẹt loading.*
3. **Hỏi**: *Giáo viên xem bài AI đã chấm trước đó để tham khảo — có phải bật tính năng riêng không?*  
   **Trả lời**: *Có, là tính năng "Tham khảo AI" (/tutor/ai-reference) ở chế độ chỉ đọc (Read-only). Giáo viên xem được bài AI đã chấm nhưng không thể sửa hay lấy điểm AI làm điểm chính thức.*
