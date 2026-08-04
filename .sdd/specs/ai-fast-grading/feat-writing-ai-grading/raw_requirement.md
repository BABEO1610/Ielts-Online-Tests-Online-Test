# Yêu cầu thô — Chấm nhanh Writing bằng AI (AI Fast Grading - Writing)

* [x] **Ngày ghi nhận**: 2026-05-15
  **Nguồn**: Buổi phỏng vấn nhu cầu nghiệp vụ lần 1 với Học viên và Product Owner
  **Người phỏng vấn**: Nhóm phân tích BA (Team IELTSZone)
  **Người được phỏng vấn**: Nguyễn Duy Mạnh (Học viên), Trần Thị Bích (Product Owner)
  **Tình trạng**: Đã tiếp nhận → Dùng làm đầu vào để chuẩn hoá thành `spec.md`

---

## 1. Bối cảnh & Vấn đề thực tế (Pain Points)

Qua phỏng vấn, khách hàng phản ánh các vấn đề sau trong quy trình luyện tập và chấm bài Writing hiện tại:

1. **Phản hồi chậm trễ**: Học viên nộp bài Writing Task 1 và Task 2 thường phải chờ từ 2-5 ngày để giáo viên chấm và nhận xét. Việc này làm đứt gãy mạch học tập vì học viên muốn biết lỗi sai ngay lập tức để cải thiện ở bài viết tiếp theo.
2. **Chi phí luyện tập cao**: Việc chấm bài thủ công tốn nhiều chi phí nhân sự, do đó số lượng bài học viên được chấm trong khóa học rất giới hạn. Rất khó để học viên rèn luyện viết hàng ngày nếu không có công cụ tự động.
3. **Thiếu cơ sở đánh giá nhất quán**: Đôi khi điểm giữa các giáo viên khác nhau có sự chênh lệch. Cần một hệ thống chấm chuẩn dựa trên 4 tiêu chí của IELTS để làm tham chiếu cho người học.
4. **Nộp bài lắt nhắt gây khó khăn tổng hợp điểm**: Hiện tại học viên đôi khi nộp rời rạc Task 1 và Task 2, khiến việc tính điểm Overall Writing bị khó khăn và không phản ánh đúng một kỳ thi thực tế.

---

## 2. Ghi chép yêu cầu thô từ khách hàng (Customer Voice / Raw Notes)

Dưới đây là nguyên văn các yêu cầu được ghi lại trong buổi phỏng vấn nhu cầu nghiệp vụ:

### Từ Nguyễn Duy Mạnh (Học viên — góc nhìn người dùng cuối):

- "Em muốn khi viết xong bài, em có quyền lựa chọn gửi cho AI chấm lấy kết quả ngay, hoặc gửi cho giáo viên chấm chi tiết."
- "Kết quả chấm của AI không chỉ là điểm số, mà em muốn xem chi tiết (feedback report) bao gồm điểm từng tiêu chí, phần đánh dấu lỗi sai và các gợi ý sửa lỗi để em rút kinh nghiệm."
- "Em muốn nộp cả Task 1 và Task 2 cùng một lúc giống như thi thật, nộp xong thì AI tự động trả về điểm tổng Overall của cả 2 bài chứ không phải tự cộng tay."
- *(Tham chiếu từ User Stories)*:
  - **STU-07**: As a Student, I want to type or upload my Writing Task responses, so that I can choose to submit them either to the AI or to a Tutor for evaluation.
  - **STU-09**: As a Student, I want to view a detailed feedback report (Band Score, error highlights, suggestions) after my Writing or Speaking test has been graded.

### Từ Trần Thị Bích (Product Owner — góc nhìn hệ thống và nghiệp vụ):

- "Hệ thống AI phải đánh giá đúng 4 tiêu chí của IELTS: Task Achievement/Response, Coherence & Cohesion, Lexical Resource, và Grammatical Range & Accuracy."
- "Để tránh lạm dụng, mỗi người dùng chỉ được dùng tối đa 10 lượt chấm AI Writing một ngày (tính theo giờ UTC). Ngoài ra, hệ thống phải chặn tình trạng bấm nộp đúp (double submit) khi mạng lag."
- "Phải kiểm tra độ dài bài viết: Task 1 ít nhất 50 từ, Task 2 ít nhất 100 từ. Nếu học viên viết quá ngắn thì từ chối chấm luôn để tiết kiệm tiền API."
- *(Tham chiếu từ User Stories)*:
  - **AI-01**: As an AI System, I want to analyze students’ Writing responses and estimate a Band Score based on Task Achievement, Coherence & Cohesion, Lexical Resource, and Grammatical Range & Accuracy, so that students can receive detailed automated IELTS Writing feedback.

---

## 3. Các câu hỏi làm rõ phát sinh trong quá trình phân tích (Clarification Questions)

Trước khi viết `spec.md`, nhóm phân tích đã đặt lại các câu hỏi sau cho khách hàng để làm rõ yêu cầu:

1. **Hỏi**: Điểm tổng (Overall Writing Band) được tính như thế nào?
   **Trả lời**: Hệ thống backend tự động tính với trọng số: Task 1 chiếm 1/3 điểm, Task 2 chiếm 2/3 điểm. Sau đó làm tròn đến nửa band gần nhất (0.5) theo đúng chuẩn IELTS.
2. **Hỏi**: Quá trình chấm bài sẽ mất vài giây đến vài phút. Trong trường hợp AI chấm lỗi một Task (ví dụ Task 2 thành công nhưng Task 1 bị lỗi do API provider) thì hiển thị thế nào?
   **Trả lời**: Nếu bất kỳ Task nào bị lỗi, trạng thái chung của cả lần nộp đó (group) sẽ bị đánh dấu là `failed` và điểm Overall là `null`. Không được công bố kết quả tổng hợp một phần.
3. **Hỏi**: Xử lý tình trạng nộp đúp (double submit) trên backend bằng cách nào?
   **Trả lời**: Client phải gửi kèm `Idempotency-Key`. Nếu backend nhận được request có cùng key trong một khoảng thời gian, hệ thống sẽ trả về kết quả của job cũ thay vì tạo bài chấm mới và không trừ thêm lượt quota.
4. **Hỏi**: Worker xử lý AI Writing chạy ở đâu? Nó có dùng chung queue với Speaking không?
   **Trả lời**: Không. Hiện tại luồng chấm Writing chạy xử lý nền ngay trong API process (`processWritingTasksAsync()`) không chờ (fire-and-forget), chứ chưa được tách ra worker bền vững như Speaking. Giữ nguyên kiến trúc này trong giai đoạn hiện tại.
