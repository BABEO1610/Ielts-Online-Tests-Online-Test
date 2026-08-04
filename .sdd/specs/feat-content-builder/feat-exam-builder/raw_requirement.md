# Yêu cầu thô — Công cụ Xây dựng Đề thi (Exam Builder)

* [ ] **Ngày ghi nhận**: 2026-05-18
  **Nguồn**: Buổi phỏng vấn nhu cầu nghiệp vụ với Giảng viên soạn đề tại IELTSZone
  **Người phỏng vấn**: Nhóm phân tích BA (Team IELTSZone)
  **Người được phỏng vấn**: Nguyễn Thị Lan Anh (Giảng viên, chuyên IELTS Reading & Listening, 5 năm kinh nghiệm), Trần Minh Quân (Giảng viên, chuyên IELTS toàn kỹ năng, đã soạn hơn 200 đề)
  **Tình trạng**: Đã tiếp nhận → Dùng làm đầu vào để chuẩn hoá thành `spec.md`

---

## 1. Bối cảnh & Vấn đề thực tế (Pain Points)

Qua phỏng vấn, các Giảng viên phản ánh các vấn đề sau trong quy trình soạn đề thi IELTS:

1. **Công cụ soạn đề hiện tại chậm và dễ gây lỗi**: Giảng viên phải nhập tay từng câu hỏi, không có form tự động. Khi thêm nhiều câu thứ tự bị lộn, phải sửa tay `question_order` rất mất công.
2. **Sợ mất dữ liệu khi sửa đề**: Khi cập nhật đề thi cũ, giảng viên lo ngại dữ liệu cũ còn sót lại và xung đột với dữ liệu mới. Từng xảy ra trường hợp câu hỏi cũ và mới cùng tồn tại gây đề bị trùng lặp.
3. **Không có validation trước khi lưu**: Đã xảy ra trường hợp đề thi được xuất bản nhưng một số câu hỏi không có đáp án đúng, học viên phản ánh không biết đáp án là gì.
4. **Không có lịch sử thay đổi**: Khi đề thi bị sửa nhầm, không có cách xem ai đã sửa và sửa gì. Cần phải truy vết để xử lý tranh chấp.
5. **Form nhập không phù hợp với cấu trúc IELTS thật**: Đề IELTS có cấu trúc lồng nhau (Passage → Block câu hỏi → Từng câu), nhưng form hiện tại phẳng, không phản ánh được cấu trúc này.
6. **Thêm nhiều câu hỏi một lúc rất chậm**: Không có tính năng thêm hàng loạt (bulk add), phải thêm từng câu một rất mất thời gian khi soạn bộ đề 40 câu.

---

## 2. Ghi chép yêu cầu thô từ khách hàng (Customer Voice / Raw Notes)

Dưới đây là nguyên văn các yêu cầu được ghi lại trong buổi phỏng vấn nhu cầu nghiệp vụ:

### Từ Nguyễn Thị Lan Anh (Giảng viên — chuyên IELTS Reading & Listening, soạn đề dạng cấu trúc lồng nhiều tầng):

- "Em soạn đề Reading thường có 3 passage, mỗi passage nhiều dạng câu hỏi khác nhau: True/False/Not Given, Matching, Fill in the blank. Form soạn đề phải cho em nhập đúng cấu trúc đó, không phải danh sách phẳng."
- "Khi em sửa câu hỏi của một bài cũ, em muốn chắc chắn câu hỏi cũ đã được thay hết, không để lại câu cũ xen lẫn câu mới. Hệ thống phải xóa cũ và chèn mới trong một lần, không cho sót."
- "Thứ tự câu hỏi phải tự động tính, em không muốn tự đánh số. Đề Reading 40 câu mà đánh số tay dễ nhầm lắm."
- "Nếu em quên điền đáp án đúng cho một câu, hệ thống phải báo ngay trước khi cho xuất bản, đừng để đề lỗi đến tay học viên."
- "Em muốn xem trước đề thi như học viên sẽ thấy — preview — trước khi bấm xuất bản. Đã từng xuất bản xong mới thấy format bị lệch."

### Từ Trần Minh Quân (Giảng viên — soạn đề toàn kỹ năng, hay soạn đề Listening có audio):

- "Đề Listening phải gắn được file audio vào passage. Mỗi section (Part 1, 2, 3, 4) nghe riêng, câu hỏi theo từng section. Form phải hỗ trợ upload audio vào từng passage."
- "Em muốn thêm nhiều câu hỏi cùng lúc, ví dụ dán vào một đoạn văn bản có cấu trúc, hệ thống tự parse ra thành câu hỏi. Hiện tại thêm từng câu một mà đề 40 câu thì mất cả buổi."
- "Khi cập nhật đề, nếu DB bị lỗi giữa chừng, đề gốc phải vẫn còn nguyên, không được mất luôn đề cũ mà lại không có đề mới."
- "Em muốn biết ai đã sửa đề của em — nếu Admin chỉnh sửa mà không báo em thì em bị bất ngờ. Phải có log."
- "Mỗi câu hỏi phải có loại rõ ràng: Multiple Choice, True/False/Not Given, Fill in the blank, Matching. Không phải lúc nào cũng là trắc nghiệm 4 đáp án."

---

## 3. Các câu hỏi làm rõ phát sinh trong quá trình phân tích (Clarification Questions)

Trước khi viết `spec.md`, nhóm phân tích đã đặt lại các câu hỏi sau cho khách hàng để làm rõ yêu cầu:

1. **Hỏi**: Khi cập nhật đề thi, hệ thống xóa cũ và chèn mới hay merge dữ liệu?
   **Trả lời**: Xóa toàn bộ và chèn mới (Hard Delete + Bulk Insert) trong một Database Transaction. Không merge. Đảm bảo không có câu hỏi cũ sót lại.

2. **Hỏi**: Nếu lỗi xảy ra giữa quá trình Bulk Insert thì sao?
   **Trả lời**: Phải tự động ROLLBACK. Đề gốc phải còn nguyên. Không được để trạng thái nửa vời.

3. **Hỏi**: `question_order` do client hay server tính?
   **Trả lời**: Server tự tính dựa trên vị trí trong mảng. Client gửi gì cũng bị bỏ qua. Tránh lỗi đánh số tay.

4. **Hỏi**: Validation chạy khi nào — trước hay sau khi ghi DB?
   **Trả lời**: Trước. Phải validate toàn bộ mảng câu hỏi trước khi bắt đầu bất kỳ thao tác ghi DB nào. Nếu có lỗi → trả HTTP 400, không ghi gì cả.

5. **Hỏi**: Có cần ghi log khi tạo/sửa/xóa đề thi không?
   **Trả lời**: Bắt buộc. Mỗi thao tác thành công phải gọi `AuditLogService.logAction` trước khi trả response. Log phải ghi trước response.

6. **Hỏi**: Đề thi Listening gắn audio ở đâu — level test hay level passage?
   **Trả lời**: Level passage. Mỗi passage (tương ứng Part 1/2/3/4) có `audio_url` riêng.

7. **Hỏi**: Nếu hai Giảng viên/Admin cùng sửa một đề lúc cùng giờ thì xử lý sao?
   **Trả lời**: Chưa quyết định. Cần thảo luận thêm giữa Optimistic Locking (trả 409) và Last-Write-Wins. (*→ Ghi nhận vào spec mục "NEEDS CLARIFICATION"*)

8. **Hỏi**: Có giới hạn số câu hỏi tối đa trong một đề không?
   **Trả lời**: Chưa có con số chính xác. Tạm thời không giới hạn cứng, nhưng cần theo dõi performance với đề trên 200 câu.

9. **Hỏi**: Tính năng Smart Mode (parse text thành câu hỏi) xử lý phía nào — client hay server?
   **Trả lời**: Client xử lý bằng Regex. Server chỉ nhận kết quả đã parse xong. Không gọi API trong quá trình parse.

10. **Hỏi**: Đề xuất bản hay chưa do ai quyết định?
    **Trả lời**: Giảng viên tự quyết định (`is_published` flag). Không có bước phê duyệt đề thi đa cấp trong phase này.
