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

### Từ Trần Minh Khang (Học viên — Đang luyện thi IELTS cấp tốc, quen thuộc với các platform luyện thi):
- *"Khi thi thật (Simulation) thì audio phải tự phát luôn giống hệt thi IELTS trên máy tính của BC/IDP. Học viên không được bấm pause hay tua đi tua lại, lỡ đoạn nào là mất điểm đoạn đó. Phải thật sự ép mình vào áp lực phòng thi."*
- *"Nhưng khi ở chế độ luyện tập (Practice), tôi muốn tự do kiểm soát audio. Phải có nút pause, có thanh kéo để tua tới lui. Quan trọng nhất là nút tua lại 10 giây (Rewind 10s) vì có những đoạn đọc nhanh quá tôi muốn nghe lại ngay lập tức."*
- *"Tôi muốn chọn luyện tập riêng từng Part, ví dụ hôm nay tôi chỉ yếu Part 3 thì tôi chỉ chọn làm Part 3 thôi, không muốn phải làm Part 1, 2, 4 mất thời gian."*
- *"Cần có tính năng chỉnh tốc độ phát audio (Playback speed) như 0.75x, 1x, 1.25x. Nghe quen 1.25x ở nhà thì vào thi nghe 1x sẽ thấy chậm và dễ bắt từ hơn."*

### Từ Cô Phương Lan (Giáo viên IELTS Listening & Reading):
- *"Phải có đồng hồ đếm ngược hiển thị to rõ ở góc màn hình. Khi đồng hồ chỉ 00:00 thì hệ thống phải tự động đóng bài thi và nộp bài, không cho học sinh gõ thêm bất cứ chữ nào nữa."*
- *"Khi hết giờ, ngoài việc tự nộp bài, hệ thống phải hiện thông báo Pop-up kiểu 'Hết thời gian làm bài, hệ thống đang nộp bài của bạn'."*
- *"Phải có một bảng Overview (Navigation grid) để học sinh biết câu nào đã điền đáp án (tô màu xanh) và câu nào chưa làm (chưa tô màu). Khi click vào số câu trên bảng Overview thì trang phải tự cuộn (scroll) đến đúng câu hỏi đó."*

### Từ Đội ngũ Kỹ thuật / UX:
- *"Nút 'Nộp bài' (Submit) phải xử lý trạng thái đang nộp (loading) và vô hiệu hóa (disabled) ngay lập tức sau cú click đầu tiên, tránh việc học sinh cuống cuồng bấm 3-4 lần dẫn đến gọi API nhiều lần."*
- *"Giao diện phải hỗ trợ tốt các dạng câu hỏi đặc thù của Listening như Multiple Choice, Form Completion, Matching, Map Labelling. Dạng Map Labelling đặc biệt cần hình ảnh to và rõ."*
- *"Chú ý chính sách autoplay của trình duyệt. Trình duyệt hiện nay chặn tự động phát audio nếu người dùng chưa tương tác (click) vào trang. Cần có màn hình 'Click to Start Test' trước khi bắt đầu."*

---

## 3. Các câu hỏi làm rõ phát sinh trong quá trình phân tích (Clarification Questions)

Trước khi viết `SPEC.md`, nhóm phân tích đã đặt lại các câu hỏi sau cho khách hàng để làm rõ yêu cầu:

1. **Hỏi**: *Chính sách Auto-play của trình duyệt thường chặn phát âm thanh tự động nếu người dùng chưa tương tác. Làm sao để giải quyết trong chế độ Simulation?*  
   **Trả lời**: *Trước khi vào giao diện thi chính thức, hiện một màn hình "Ready? Click Start". Khi user bấm nút Start (có tương tác click), lúc đó mới load giao diện thi và gọi hàm play() của audio.*

2. **Hỏi**: *Khi học viên ở chế độ Simulation cố tình dùng phím tắt trên bàn phím (như phím Space hoặc phím Media Play/Pause) để dừng audio, hệ thống làm thế nào?*  
   **Trả lời**: *Cần bắt sự kiện (event listener) trên thẻ `<audio>`. Nếu phát hiện event `pause` mà không phải do hệ thống chủ động gọi, hãy ép nó chạy lại ngay (`audio.play()`).*

3. **Hỏi**: *Nếu rớt mạng (mất kết nối internet) giữa chừng khi đang thi Listening, hệ thống xử lý thế nào?*  
   **Trả lời**: *Phần audio file phải được preload (tải trước) hoặc buffer tốt để tránh giật lag. Nếu rớt mạng lúc nộp bài thì lưu trữ đáp án ở Local Storage và hiện thông báo yêu cầu học viên kiểm tra kết nối, có nút "Thử nộp lại".*

4. **Hỏi**: *Nếu học viên vô tình nhấn F5 hoặc nút Back của trình duyệt, đáp án đã điền có được lưu lại không?*  
   **Trả lời**: *Trong phạm vi v1 (MVP), chưa có cơ chế Auto-save theo chu kỳ. Trình duyệt có thể hiện cảnh báo (BeforeUnload event) "Bạn có chắc muốn rời đi, dữ liệu sẽ bị mất?". Nếu học viên vẫn rời đi thì chấp nhận mất.*

5. **Hỏi**: *Chế độ Practice có đặt giới hạn thời gian không, hay đếm tiến mãi không giới hạn?*  
   **Trả lời**: *Mặc định Practice không đếm ngược mà chỉ là bộ đếm tiến (tính tổng thời gian đã làm). Tuy nhiên, nếu user muốn thử thách bản thân, họ có thể thiết lập `customTimeLimit` trước khi bắt đầu.*

6. **Hỏi**: *Nếu 1 đề Listening chỉ có Part 1 và Part 2 (Partial Test), phần bảng Overview có hiện các số câu từ 21-40 không?*  
   **Trả lời**: *Không. Bảng Overview sinh động (dynamic) theo tổng số câu hỏi thực tế của đề thi. Nếu đề chỉ có 20 câu thì chỉ hiện grid từ 1-20.*

7. **Hỏi**: *Tính năng 'Review Answers' sau khi thi xong ở chế độ Listening thì hiển thị thế nào?*  
   **Trả lời**: *Tái sử dụng lại giao diện bài thi nhưng toàn bộ các input/select bị vô hiệu hóa (disabled). Câu đúng hiện viền xanh chữ xanh, câu sai hiện viền đỏ chữ đỏ và kèm theo đáp án đúng ở bên dưới, cùng với Transcript ở bên cạnh để đối chiếu.*
