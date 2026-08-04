# Yêu cầu thô: Giao diện Thi Reading (Raw Requirements)

**Dự án**: IELTSZone  
**Tính năng**: `feat-reading-ui`  
**Người thu thập (BA / Dev)**: Nhóm phát triển  
**Nguồn cung cấp yêu cầu**: Biên bản phỏng vấn Học viên & Giảng viên IELTS Reading  
**Ngày thu thập**: 2026-07-20  
**Tình trạng**: Đã tiếp nhận → Dùng làm đầu vào để chuẩn hóa thành [spec.md](./SPEC.md)

---

## 1. Bối cảnh & Vấn đề thực tế (Pain Points)

Hiện tại hệ thống chưa có giao diện thi Reading chuyên biệt, gây ra các vấn đề sau:
1. **Không đọc bài và làm câu hỏi cùng lúc được**: Học viên phải cuộn lên cuộn xuống liên tục giữa đoạn văn và câu hỏi — gây mất thời gian, mất tập trung, không phản ánh đúng trải nghiệm thi IELTS thực tế với 2 trang thi song song.
2. **Mất đáp án khi điều hướng**: Khi học viên đang điền fill-in-blank rồi click sang câu khác, nội dung đã gõ bị xóa sạch — buộc họ phải nhớ lại và gõ lại gây bức xúc.
3. **Không hỗ trợ luyện tập một phần (Partial Practice)**: IELTS Reading có 3 Passage, nhưng hệ thống buộc học viên phải làm cả 3 — không có cách nào chọn chỉ làm Passage 1 hoặc 2 để luyện tập chuyên sâu.

---

## 2. Ghi chép yêu cầu thô từ khách hàng (Customer Voice / Raw Notes)

Dưới đây là nguyên văn các yêu cầu được ghi lại trong buổi phỏng vấn nhu cầu nghiệp vụ:

### Từ Lê Bích Ngọc (Học viên — Đang ôn luyện Reading chuyên sâu):
- *"Trang thi Reading bắt buộc phải chia đôi màn hình (Split-view). Bên trái là toàn bộ bài đọc (Passage), bên phải là cột câu hỏi. Tôi cuộn (scroll) bên bài đọc thì bên câu hỏi phải đứng yên, và ngược lại. Nếu bắt tôi cuộn lên cuộn xuống liên tục như mấy web cũ thì tôi chóng mặt lắm."*
- *"Tôi điền chữ vào ô trống rồi click sang câu hỏi khác, khi quay lại thì chữ vẫn phải còn đó. Đừng để load lại DOM rồi xóa mất đáp án của tôi."*
- *"Cho tôi chọn luyện tập từng phần. Ví dụ IELTS Reading có 3 Passage, hôm nay tôi chỉ muốn luyện Passage 1 thôi thì hệ thống phải cho phép, đừng bắt tôi tạo đề có đủ cả 3 Passage."*
- *"Câu hỏi có nhiều dạng: trắc nghiệm 1 đáp án, chọn nhiều đáp án, True/False/Not Given, Matching Headings, Điền từ ngắn. Tất cả phải hiển thị mượt mà trên cùng một cột bên phải."*

### Từ Thầy Tuấn (Giáo viên IELTS Reading):
- *"Rất cần một cái Navigation Grid (Bảng tổng quan) chứa danh sách các câu từ 1-40. Học sinh bấm vào câu số 15 thì cột bên phải tự động cuộn đến câu 15, và đặc biệt là cột bên trái cũng phải tự động chuyển sang Passage chứa câu 15 đó."*
- *"Đồng hồ đếm ngược là bắt buộc, hết 60 phút phải tự thu bài."*
- *"Nếu bài đọc có hình ảnh minh hoạ (ví dụ sơ đồ Diagram Labeling) hoặc bảng số liệu thì hình đó phải gắn liền với block câu hỏi tương ứng bên phải, để học viên không phải nhìn sang trái tìm hình."*
- *"Khi học viên bôi đen (highlight) một đoạn text bên bài đọc, hệ thống nên giữ lại phần bôi đen đó (tính năng Highlight Text). Thi thật trên máy tính BC/IDP có tính năng này, giúp học viên đánh dấu keywords rất tốt."*

### Từ Đội ngũ Kỹ thuật / UX:
- *"Giao diện chia đôi màn hình chỉ phù hợp với Desktop và Tablet màn hình ngang (>= 1024px). Nếu học viên dùng màn hình nhỏ hơn (như Tablet dọc hoặc Mobile) thì phải đổi sang bố cục dọc (Stack view): Bài đọc nằm trên, câu hỏi nằm dưới."*
- *"Khi dữ liệu đề chưa tải xong, cần có màn hình Skeleton loading (hiệu ứng khung xương) thay vì màn hình trắng bóc, để người dùng biết hệ thống vẫn đang hoạt động."*

---

## 3. Các câu hỏi làm rõ phát sinh trong quá trình phân tích (Clarification Questions)

Trước khi viết `SPEC.md`, nhóm phân tích đã đặt lại các câu hỏi sau cho khách hàng để làm rõ yêu cầu:

1. **Hỏi**: *Tính năng Highlight Text bên bài đọc có cần lưu lại vào database không (để lần sau mở lên vẫn thấy bôi đen)?*  
   **Trả lời**: *Không. Việc highlight chỉ lưu ở bộ nhớ tạm (DOM/State) trong suốt quá trình làm bài. Refresh trang hoặc nộp bài xong là mất. Mục đích chỉ để hỗ trợ visual lúc làm bài.*

2. **Hỏi**: *Khi học viên click vào ô câu hỏi trong Navigation Grid (thuộc Passage 2) trong khi màn hình đang hiển thị Passage 1, hệ thống xử lý thế nào?*  
   **Trả lời**: *Hệ thống phải làm 2 việc đồng thời: Tự động chuyển Tab (switch) sang Passage 2 ở cột bên trái, và cuộn (scroll) tới đúng vị trí câu hỏi đó ở cột bên phải.*

3. **Hỏi**: *Nếu ô điền trống (fill-in-blank) bị bỏ trống khi nộp bài thì chấm điểm thế nào?*  
   **Trả lời**: *Backend sẽ tự động chấm là sai (0 điểm). Phía Frontend không cần hiện thông báo cảnh báo kiểu "Bạn chưa điền câu X", cứ âm thầm nộp bài bình thường.*

4. **Hỏi**: *Sẽ ra sao nếu học viên dùng màn hình điện thoại (Mobile < 768px) để làm bài Reading?*  
   **Trả lời**: *Reading trên Mobile là một trải nghiệm cực hình do text quá nhiều. MVP v1 tạm thời chưa cần optimize sâu cho Mobile, cứ dùng Stack View (bài đọc trên, câu hỏi dưới). Sẽ cải thiện ở Phase 2.*

5. **Hỏi**: *Tính năng 'Review Answers' sau khi thi xong ở chế độ Reading thì hiển thị thế nào?*  
   **Trả lời**: *Tái sử dụng layout Split-view. Tuy nhiên, thay vì chỉ hiện câu hỏi, các ô input bị vô hiệu hóa. Hiển thị chữ xanh/viền xanh cho câu đúng, chữ đỏ/viền đỏ cho câu sai. Dưới mỗi câu hiện đáp án đúng và ô Giải thích (Explanation) nếu Admin có nhập giải thích lúc tạo đề.*

6. **Hỏi**: *Khi cuộn (scroll) cột bài đọc bên trái, tiêu đề của Passage có trôi đi mất không?*  
   **Trả lời**: *Tiêu đề Passage (ví dụ: "READING PASSAGE 1") và bộ đếm thời gian nên được ghim (sticky) ở trên cùng của trang để học viên luôn biết mình đang làm phần nào và còn bao nhiêu thời gian.*
