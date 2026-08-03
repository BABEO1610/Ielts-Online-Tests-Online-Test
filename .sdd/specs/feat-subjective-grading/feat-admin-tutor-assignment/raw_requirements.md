# Yêu cầu thô: Phân công Giảng viên chấm bài (Raw Requirements)

**Dự án**: IELTSZone  
**Tính năng**: `feat-admin-tutor-assignment`  
**Người thu thập (BA / Dev)**: Nhóm phát triển  
**Nguồn cung cấp yêu cầu**: Biên bản phỏng vấn Quản trị viên Trung tâm (Admin) & Trưởng bộ môn IELTS  
**Ngày thu thập**: 2026-07-20  
**Tình trạng**: Đã tiếp nhận → Dùng làm đầu vào để chuẩn hóa thành [spec.md](./spec.md)

---

## 1. Bối cảnh & Vấn đề thực tế (Pain Points)

Hiện tại trung tâm đang gặp các vấn đề sau trong quy trình chấm bài tự luận (Writing & Speaking):
1. **Dồn ứ và mất kiểm soát**: Học viên nộp bài thi Writing và Speaking lên hệ thống ngày càng nhiều nhưng chưa có người điều phối tập trung.
2. **Chấm trùng hoặc bỏ sót**: Các giáo viên (Tutor) tự vào hệ thống tìm bài để chấm, dẫn đến tình trạng bài dễ thì nhiều người tranh nhau chấm, bài khó hoặc bài của học viên điểm thấp thì bị bỏ quên; đôi khi 2 giáo viên cùng mở một bài ra chấm gây xung đột dữ liệu.
3. **Thiếu minh bạch**: Cuối tháng không thống kê được chính xác Admin nào đã giao bài cho Giáo viên nào để tính thù lao chấm bài và theo dõi tiến độ (SLA).

---

## 2. Ghi chép yêu cầu thô từ khách hàng (Customer Voice / Raw Notes)

Dưới đây là nguyên văn các yêu cầu được ghi lại trong buổi phỏng vấn nhu cầu nghiệp vụ:

- *"Tôi là Admin, tôi cần một trang riêng để nhìn thấy tất cả các bài nộp Writing và Speaking của học viên đang chờ chấm. Phải xem được tên học viên, bài thi nào, nộp lúc mấy giờ và mục tiêu band điểm của họ."*
- *"Trên danh sách đó, dòng nào chưa có người chấm thì phải làm nổi bật lên (ví dụ bôi vàng hoặc có icon cảnh báo) để tôi biết đường xử lý gấp."*
- *"Tôi muốn có một ô chọn (Dropdown) danh sách tất cả các thầy cô giáo đang hoạt động trong hệ thống. Tôi chọn thầy A một cái là bài đó được gán cho thầy A luôn, bên tài khoản của thầy A sẽ hiện bài này lên."*
- *"Nếu thầy A bận đột xuất hoặc xin nghỉ, tôi có thể bấm đổi sang cô B, hoặc chọn 'Chưa phân công' để nhả bài đó ra cho người khác."*
- *"Chỉ có tài khoản Admin của trung tâm mới được vào trang này. Học sinh hay giáo viên tuyệt đối không được tự ý vào đây phân công lung tung."*
- *"Hệ thống phải ghi lại nhật ký (Log): Ngày giờ nào, Admin nào đã giao bài của học sinh nào cho giáo viên nào. Cái này rất quan trọng để đối soát thù lao cuối tháng và xử lý khi học viên khiếu nại."*
- *"Nếu bài đó mà giáo viên đã chấm xong rồi thì Admin không được đổi người nữa, tránh làm sai lệch kết quả đã trả cho học viên."*
- *"Thao tác bấm chọn giáo viên phải nhanh, không bị đơ giật hay bắt load lại cả trang web."*

---

## 3. Bảng phân loại Yêu cầu thô & Ánh xạ sang Đặc tả (Mapping to Spec)

Quá trình phân tích từ **Ngôn ngữ thô (Raw)** sang **Ngôn ngữ kỹ thuật đặc tả (Spec)**:

| Yêu cầu thô (Khách hàng nói) | Phân loại nghiệp vụ | Ánh xạ sang `spec.md` |
|---|---|---|
| Admin cần trang xem danh sách bài nộp chờ chấm kèm thông tin học viên, target band | Chức năng xem & lọc danh sách | **User Story 1**, `FR-001`, `FR-002` |
| Bôi màu/cảnh báo các bài nộp chưa có người chấm | Giao diện & Trải nghiệm (UI/UX) | **User Story 1 (Acceptance 2)** |
| Dropdown chọn giáo viên để gán bài | Chức năng phân công | **User Story 2**, `FR-003` |
| Cho phép đổi giáo viên hoặc hủy gán | Chức năng điều chuyển/hủy gán | **User Story 2 (Acceptance 2)** |
| Chỉ Admin mới có quyền truy cập | Phân quyền bảo mật (RBAC) | `FR-001`, `SC-003` (Chặn 403 Forbidden) |
| Tự động ghi lại lịch sử phân công | Kiểm toán hệ thống (Audit Log) | `FR-004`, `SC-002` (`audit_logs`) |
| Bài đã chấm xong thì không cho đổi phân công | Ràng buộc nghiệp vụ (Business Rule) | **Edge Cases (§Trường hợp biên)** |
| Bấm phân công phải nhanh, dưới 1 giây | Yêu cầu phi chức năng (Performance) | `SC-004` (Thời gian phản hồi < 800ms) |

---

## 4. Các câu hỏi làm rõ phát sinh trong quá trình phân tích (Clarification Questions)

Trước khi viết `spec.md`, nhóm phân tích đã đặt lại các câu hỏi sau cho khách hàng để làm rõ yêu cầu:

1. **Hỏi**: *Một bài nộp Speaking có 3 Part (Part 1, 2, 3), khi Admin phân công thì gán từng Part hay gán cả bài?*  
   **Trả lời**: *Gán cả bài (cùng `speaking_group_id`) cho 1 giảng viên duy nhất để đảm bảo tính nhất quán khi chấm.*
2. **Hỏi**: *Giáo viên có được quyền tự nhận bài chưa ai gán không?*  
   **Trả lời**: *Có, nếu bài ở trạng thái tự do (`assigned_tutor_id IS NULL`), giáo viên có thể vào nhận chấm, nhưng ưu tiên bài Admin đã phân công trực tiếp.*
3. **Hỏi**: *Khi hủy phân công (Unassign) thì trạng thái bài thi về đâu?*  
   **Trả lời**: *Về lại trạng thái tự do `assigned_tutor_id = NULL` để hiển thị cảnh báo cho Admin tiếp tục giao sau.*
