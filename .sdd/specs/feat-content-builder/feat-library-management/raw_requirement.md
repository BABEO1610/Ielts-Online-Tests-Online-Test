# Yêu cầu thô — Quản lý Thư viện Tài nguyên (Library Management)

* [ ] **Ngày ghi nhận**: 2026-05-16
  **Nguồn**: Buổi phỏng vấn nhu cầu nghiệp vụ với Giảng viên và Admin nội dung tại IELTSZone
  **Người phỏng vấn**: Nhóm phân tích BA (Team IELTSZone)
  **Người được phỏng vấn**: Phạm Thị Thu Hà (Giảng viên, soạn đề Listening, hay upload audio), Lê Văn Bình (Admin nội dung, phụ trách phê duyệt tài liệu)
  **Tình trạng**: Đã tiếp nhận → Dùng làm đầu vào để chuẩn hoá thành `spec.md`

---

## 1. Bối cảnh & Vấn đề thực tế (Pain Points)

Qua phỏng vấn, Giảng viên và Admin phản ánh các vấn đề sau trong quy trình quản lý tài nguyên IELTS:

1. **Không kiểm soát được file upload**: Hệ thống chỉ kiểm tra extension file (`.mp3`, `.pdf`) không kiểm tra nội dung thực tế. Đã xảy ra trường hợp ai đó đổi tên file `.exe` thành `.mp3` và upload thành công.
2. **Tài liệu chưa duyệt hiển thị ngay cho học viên**: Giảng viên upload xong, tài liệu xuất hiện ngay trong thư viện dù Admin chưa xem nội dung. Có tài liệu chất lượng kém hoặc sai nội dung đến tay học viên trước khi được kiểm tra.
3. **Không quản lý được tài nguyên của mình**: Giảng viên không có trang xem riêng tài liệu của mình (kể cả tài liệu đang chờ duyệt). Phải hỏi Admin mới biết tài liệu mình upload đang ở trạng thái gì.
4. **File trên storage bị mồ côi**: Khi xóa tài liệu trong DB, file vật lý trên cloud vẫn còn. Sau vài tháng bucket phình to nhưng không biết file nào đang dùng, file nào rác.
5. **File lớn gây crash server**: Đã có người upload file ZIP ~500MB qua form, server hết RAM trong khi đọc toàn bộ file vào bộ nhớ. Cần giới hạn và kiểm tra sớm.
6. **Không phân loại tài liệu rõ ràng**: Tài liệu PDF bài đọc, file audio Listening, file nén bộ đề lộn xộn trong cùng một danh sách, không lọc được theo loại hay kỹ năng.

---

## 2. Ghi chép yêu cầu thô từ khách hàng (Customer Voice / Raw Notes)

Dưới đây là nguyên văn các yêu cầu được ghi lại trong buổi phỏng vấn nhu cầu nghiệp vụ:

### Từ Phạm Thị Thu Hà (Giảng viên — chuyên upload audio cho đề Listening):

- "Em upload file MP3 xong là muốn thấy ngay trong danh sách tài liệu của mình, dù chưa được Admin duyệt. Không cần hiện cho học viên nhưng em phải thấy được."
- "Em muốn biết tài liệu của mình đang ở trạng thái gì — chờ duyệt, đã duyệt, hay bị từ chối. Hiện tại em không biết gì sau khi upload xong."
- "Nếu Admin từ chối tài liệu của em, em cần biết lý do để sửa lại và nộp lại. Đừng chỉ hiện 'bị từ chối' mà không nói tại sao."
- "File audio của em đôi khi lớn đến 100–150 MB vì chất lượng cao. Hệ thống phải chịu được file đó, đừng báo lỗi ngay khi vừa chọn file."
- "Em đổi tên file và upload nhiều lần dễ nhầm. Hệ thống nên kiểm tra file thực sự là audio chứ không phải chỉ tin vào tên file em đặt."
- "Khi em xóa tài liệu, file phải mất hẳn, không chiếm chỗ trên server. Hồi trước upload nhầm mà xóa xong vẫn thấy dung lượng không giảm."

### Từ Lê Văn Bình (Admin nội dung — phụ trách duyệt và quản lý thư viện):

- "Tôi cần xem được tất cả tài liệu chưa duyệt của mọi Giảng viên, không chỉ của một người. Phải có trang quản trị riêng."
- "Tài liệu phải qua tay tôi kiểm tra trước khi học viên thấy. Không được có chuyện Giảng viên upload xong là học viên đọc được ngay."
- "Nếu nội dung tài liệu không đạt (sai thông tin, vi phạm bản quyền), tôi cần từ chối và Giảng viên phải biết."
- "Tôi muốn lọc tài liệu theo loại (audio, PDF, file nén), theo kỹ năng (Listening, Reading) để tìm nhanh khi có nhiều tài nguyên."
- "Phải chặn file giả mạo. Tôi đã thấy ai đó đổi tên file Word thành PDF để bypass filter — hệ thống cần đọc nội dung thực tế của file."
- "Khi xóa tài liệu, xóa cả file trên cloud luôn. Đừng để rác trên bucket."

---

## 3. Các câu hỏi làm rõ phát sinh trong quá trình phân tích (Clarification Questions)

Trước khi viết `spec.md`, nhóm phân tích đã đặt lại các câu hỏi sau cho khách hàng để làm rõ yêu cầu:

1. **Hỏi**: Kiểm tra định dạng file bằng cách nào? Extension hay nội dung thực tế?
   **Trả lời**: Nội dung thực tế bằng Magic Bytes (thư viện `file-type`). Không tin vào extension hay Content-Type do trình duyệt gửi lên.

2. **Hỏi**: Những định dạng file nào được hỗ trợ?
   **Trả lời**: Audio (MP3, WAV, WebM, M4A, OGG), tài liệu (PDF), file nén (ZIP, RAR, 7Z). Không nhận các định dạng khác.

3. **Hỏi**: Giới hạn kích thước file là bao nhiêu?
   **Trả lời**: Tối đa 200 MB mỗi file. Từ chối HTTP 413 trước khi đọc toàn bộ file vào bộ nhớ.

4. **Hỏi**: Tài liệu mới upload mặc định ở trạng thái gì?
   **Trả lời**: Mặc định `pending`. Chỉ xuất hiện trong thư viện công khai sau khi Admin chuyển sang `approved`.

5. **Hỏi**: Giảng viên có xem được tài liệu của Giảng viên khác không?
   **Trả lời**: Không. Mỗi Giảng viên chỉ xem tài nguyên của mình qua endpoint `/mine`. Danh sách công khai chỉ hiện tài nguyên đã được duyệt.

6. **Hỏi**: Khi xóa tài liệu trong DB, file trên Supabase xóa luôn không?
   **Trả lời**: Có. Phải xóa cả file vật lý trên bucket cùng lúc với xóa DB record. Không để orphan file.

7. **Hỏi**: Tài liệu bị từ chối (rejected) có bị xóa tự động không?
   **Trả lời**: Chưa quyết định. Cần thảo luận thêm: giữ lại để Giảng viên sửa và nộp lại, hay tự động xóa sau N ngày? (*→ Ghi nhận vào spec mục "NEEDS CLARIFICATION"*)

8. **Hỏi**: File upload lên qua server hay trực tiếp lên cloud storage?
   **Trả lời**: Qua server (multipart upload). Server đọc buffer để kiểm tra Magic Bytes trước, sau đó upload lên Supabase. Không dùng pre-signed URL vì cần validate trước.

9. **Hỏi**: Nếu xóa DB record thành công nhưng xóa file trên Supabase thất bại thì xử lý sao?
   **Trả lời**: Ghi nhận lỗi xóa storage vào log nhưng vẫn trả success cho client. File mồ côi sẽ được dọn dẹp định kỳ bởi maintenance job. (*→ Ghi nhận vào spec để xử lý sau*)

10. **Hỏi**: Tên file trùng nhau trên bucket xử lý sao?
    **Trả lời**: Dùng UUID làm tên file trên bucket thay vì giữ tên gốc. Tránh collision hoàn toàn, tên hiển thị lưu riêng trong DB.
