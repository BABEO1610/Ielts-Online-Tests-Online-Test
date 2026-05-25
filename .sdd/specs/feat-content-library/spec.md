2. Actors & Roles (Tác nhân hệ thống)

Student: Truy cập tài liệu học liệu được phân quyền; không có quyền upload.
Tutor: Upload, sửa, xóa tài liệu do chính mình tạo ra.
Admin: Quản lý toàn bộ ngân hàng câu hỏi/đề thi dạng structured (JSON/DB); phê duyệt hoặc gỡ nội dung của Tutor.


3. Functional Requirements (FR — Áp dụng EARS Notation)
FR-01 (Event-driven): WHEN Tutor upload file, THE hệ thống SHALL xác thực MIME type thật, lưu metadata vào bảng content_items với status = 'pending_review' và uploader_id = tutor_id.
FR-02 (Event-driven): WHEN Admin phê duyệt nội dung, THE hệ thống SHALL cập nhật status = 'published', kích hoạt nội dung hiển thị cho Student theo visibility_scope.
FR-03 (State-driven): WHILE nội dung có status = 'pending_review', THE hệ thống SHALL chỉ hiển thị nội dung đó cho Tutor chủ sở hữu và Admin, ẩn hoàn toàn với Student.
FR-04 (Event-driven): WHEN Admin tạo hoặc cập nhật câu hỏi dạng structured, THE hệ thống SHALL validate schema JSON trước khi insert/update vào bảng question_bank.
FR-05 (Event-driven): WHEN Student truy cập nội dung, THE hệ thống SHALL kiểm tra visibility_scope và enrollment của Student trước khi trả về file URL hoặc metadata.

4. Non-Functional Requirements (NFR)
NFR-01 (Performance): API trả danh sách nội dung SHALL phản hồi trong tối đa 500ms với phân trang (limit/offset).
NFR-02 (Security): Backend SHALL sử dụng thư viện file-type để xác thực MIME type thật của file upload; từ chối mọi file giả mạo extension. Các MIME type được chấp nhận:
LoạiMIME types hợp lệTài liệuapplication/pdfẢnhimage/jpeg, image/png, image/webpAudioaudio/mp3, audio/wav, audio/webm, audio/ogg, audio/mp4Videovideo/mp4, video/webm
NFR-03 (Storage): File vật lý SHALL được lưu trên Object Storage (S3-compatible). Bảng content_items chỉ lưu storage_key, không lưu binary trực tiếp vào DB.
NFR-04 (Access Control): Presigned URL cho file SHALL có TTL tối đa 15 phút; không trả về URL vĩnh viễn cho bất kỳ role nào.

5. Data Model Schema
Tính năng thao tác trực tiếp lên 2 bảng vật lý và 1 View:
Bảng nội dung (content_items): Lưu metadata file upload của Tutor. Cột chính: id, uploader_id (FK → users), content_type ENUM(pdf, audio, video, image), storage_key, status ENUM(pending_review, published, rejected), visibility_scope ENUM(public, enrolled_only), created_at.
Bảng câu hỏi (question_bank): Lưu đề thi/câu hỏi dạng structured do Admin quản lý. Cột chính: id, skill_type ENUM(writing, speaking), band_target NUMERIC(3,1), prompt_text, metadata JSONB, created_by (FK → users), created_at.
View danh sách công khai (v_published_content): Trích xuất các bản ghi từ content_items có status = 'published', join với thông tin uploader để phục vụ Student truy cập.

6. Error Handling (Xử lý lỗi & Điều kiện biên)
ERR-01 (File Size): WHERE file upload > 50MB, THE hệ thống SHALL ngắt stream và từ chối request với mã HTTP 413 (Payload Too Large).
ERR-02 (MIME Invalid): WHERE file-type trả về MIME không nằm trong danh sách NFR-02, THE hệ thống SHALL từ chối với HTTP 415 (Unsupported Media Type) và không lưu bất kỳ dữ liệu nào.
ERR-03 (Schema Invalid): WHERE JSON của câu hỏi trong question_bank không pass validation schema, THE hệ thống SHALL trả về HTTP 422 với danh sách field lỗi cụ thể; không insert vào DB.
ERR-04 (Unauthorized Access): WHERE Student truy cập nội dung không thuộc visibility_scope hoặc không có enrollment hợp lệ, THE hệ thống SHALL trả về HTTP 403 (Forbidden), không tiết lộ sự tồn tại của resource.

7. Acceptance Criteria (AC)

 AC-01: Nội dung status = 'pending_review' tuyệt đối không xuất hiện trên v_published_content hoặc bất kỳ API endpoint nào Student có thể gọi.
 AC-02: Presigned URL trả về cho Student phải hết hạn sau tối đa 15 phút; gọi lại URL cũ phải nhận HTTP 403.
 AC-03: File upload có MIME type giả mạo (đổi extension) phải bị từ chối ở tầng backend, không phụ thuộc vào validation phía client.
 AC-04: Câu hỏi trong question_bank có band_target ngoài khoảng [0.0, 9.0] hoặc không theo bước 0.5 phải bị reject ở tầng DB (CHECK constraint) và tầng service.


8. Out of Scope (Ngoài phạm vi Sprint này)

Tính năng tìm kiếm full-text nội dung (search by keyword).
CDN cache / streaming video.
Hệ thống bình luận / rating nội dung của Student.
Đồng bộ nội dung từ nguồn ngoài (Google Drive, Dropbox).


9. Agent Steering Instructions (Chỉ thị điều khiển AI)
9.1. Transaction & Consistency
BẮT BUỘC dùng Database Transaction khi Admin phê duyệt nội dung: cập nhật status trong content_items và ghi log vào bảng audit_logs phải là atomic. Lỗi 1 trong 2 bước phải ROLLBACK toàn bộ.
9.2. Query Constraints
KHÔNG sử dụng ORM. Sử dụng thuần thư viện pg với Parameterized Query ($1, $2) để chống SQL Injection. Mọi query lên content_items của Student PHẢI include điều kiện status = 'published' tường minh.
9.3. Storage Key Convention
storage_key lưu trong DB theo format: {content_type}/{year}/{month}/{uuid}.{ext}. Presigned URL được generate tại runtime, không được cache phía server quá 10 phút.
9.4. Liên kết với feat-subjective-grading
Khi Student nộp bài Writing/Speaking (FR-01 của feat-subjective-grading), backend SHALL cho phép đính kèm question_id từ question_bank. Nếu question_id được cung cấp, bắt buộc validate tồn tại và skill_type phải khớp với loại bài nộp trước khi insert vào writing_submissions / speaking_submissions.
