# Yêu cầu thô: Giao diện Thi Listening (Raw Requirements)

**Dự án**: IELTSZone  
**Tính năng**: `feat-listening-ui`  
**Người thu thập (BA / Dev)**: Nhóm phát triển  
**Nguồn cung cấp yêu cầu**: Biên bản phỏng vấn Học viên & Giảng viên IELTS Listening  
**Ngày thu thập**: 2026-07-20  
**Tình trạng**: Đã tiếp nhận → Dùng làm đầu vào để chuẩn hóa thành [spec.md](./SPEC.md)

---

## 1. Bối cảnh & Vấn đề thực tế (Pain Points)

Hiện tại hệ thống chưa có giao diện thi Listening dành riêng, gây ra các vấn đề sau:
1. **Trải nghiệm thi không sát thực tế**: Học viên muốn luyện thi theo đúng format IELTS thật (nghe audio 1 lần, không được tua lại) nhưng hệ thống hiện tại không kiểm soát được hành vi audio — ai cũng có thể nghe đi nghe lại tùy ý, làm mất đi tính nghiêm túc của bài thi.
2. **Thiếu chế độ Practice linh hoạt**: Học viên muốn tự luyện từng Part, muốn có nút tua lại 10 giây để ôn kỹ đoạn khó, nhưng hệ thống không hỗ trợ — buộc họ phải dùng trình phát ngoài, làm gián đoạn trải nghiệm.
3. **Không quản lý thời gian tự động**: Bài thi Listening có thời hạn cố định nhưng hệ thống không đếm giờ và không tự nộp bài khi hết giờ — học viên hoặc quên nộp, hoặc nộp trễ gây sai lệch kết quả.

---

## 2. Ghi chép yêu cầu thô từ khách hàng (Customer Voice / Raw Notes)

Dưới đây là nguyên văn các yêu cầu được ghi lại trong buổi phỏng vấn nhu cầu nghiệp vụ:

- *"Khi thi thật thì audio phải tự phát luôn, học viên không được bấm pause hay tua đi tua lại. Phải giống như thi IELTS ngoài trung tâm British Council."*
- *"Nhưng khi luyện tập thì khác — tôi muốn có nút pause, có thanh kéo để tua lui, có nút tua lại 10 giây để nghe lại chỗ khó."*
- *"Tôi muốn chọn luyện tập riêng từng Part, ví dụ hôm nay chỉ làm Part 1 và Part 2 thôi, không cần làm cả 4 Part."*
- *"Phải có đồng hồ đếm ngược, khi hết giờ thì hệ thống tự nộp bài cho tôi. Tôi không muốn bấm nộp nhầm lúc."*
- *"Khi hết giờ thì hiện thông báo ra để tôi biết, đừng để bài tự submit mà tôi không hay."*
- *"Cần có bảng tổng quan để tôi biết mình đã làm câu nào, chưa làm câu nào — dạng lưới bấm vào để nhảy tới câu đó."*
- *"Nút Nộp bài phải chỉ bấm được một lần thôi, bấm xong là disable luôn, tránh bấm 2 lần bị lỗi."*
- *"Câu hỏi có đủ loại: MCQ, điền vào chỗ trống, matching, chọn nhiều đáp án — tất cả phải làm được trên cùng một trang."*

---

## 3. Các câu hỏi làm rõ phát sinh trong quá trình phân tích (Clarification Questions)

Trước khi viết `SPEC.md`, nhóm phân tích đã đặt lại các câu hỏi sau cho khách hàng để làm rõ yêu cầu:

1. **Hỏi**: *Khi học viên ở chế độ Simulation cố tình pause audio qua DevTools hay phím tắt trình duyệt, hệ thống xử lý thế nào?*  
   **Trả lời**: *Hệ thống phải force-play lại ngay lập tức — không được phép dừng audio trong Simulation mode.*

2. **Hỏi**: *Nếu học viên refresh trang giữa chừng, đáp án đã điền có được lưu lại không?*  
   **Trả lời**: *Không — v1 không có auto-save. Học viên mất toàn bộ draft khi refresh. Đây là known limitation được chấp nhận.*

3. **Hỏi**: *Chế độ Practice có đặt giới hạn thời gian không, hay đếm tiến mãi không giới hạn?*  
   **Trả lời**: *Mặc định Practice đếm tiến không giới hạn. Nếu muốn custom time limit thì truyền qua `customTimeLimit` — lúc đó đếm ngược bình thường.*
