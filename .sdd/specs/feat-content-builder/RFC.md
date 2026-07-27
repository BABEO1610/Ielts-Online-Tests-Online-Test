# RFC.md — Tổng hợp tính năng: CMS & Exam Builder (Kho Tài nguyên & Khung Đề thi)

**Tài liệu để học và trình bày trước hội đồng bảo vệ đồ án.**

---

## 1. Tổng quan

CMS & Exam Builder là phân hệ cốt lõi dành cho Giáo viên (Tutor) và Quản trị viên (Admin) trên nền tảng IELTSZone.
Tính năng này giúp:
- Xây dựng **Kho tài nguyên (Library)** an toàn: Nơi Tutor upload file Audio/PDF làm nguyên liệu nền tảng.
- Xây dựng **Khung đề thi động (Exam Builder)**: Công cụ soạn thảo câu hỏi hàng loạt (Bulk Insert) cho 4 kỹ năng.
- **Cơ chế Cập nhật an toàn (Hard Delete & Re-insert)**: Đảm bảo tính nguyên tử (Atomicity) và hiệu năng cực cao khi Tutor sửa lại toàn bộ cấu trúc của một đề thi.

## 2. Vì sao cần tính năng này?

- **Đối với Library**: Cần một nơi giống như "Google Drive nội bộ" để Tutor tải lên, quản lý và tái sử dụng các file Audio/PDF cho nhiều đề thi khác nhau.
- **Đối với Exam Builder**: Một đề thi IELTS Reading/Listening có 40 câu hỏi lồng ghép rất phức tạp. Hệ thống cần công cụ tạo/sửa đề nhanh chóng, mượt mà thay vì bắt Tutor cập nhật từng câu lắt nhắt.
- **Đối với cơ chế Cập nhật**: Cấu trúc đề thi gồm nhiều bảng lồng nhau (`mock_tests` → `test_passages` → `question_blocks` → `questions`). Nếu sửa đổi lắt nhắt từng bảng sẽ dẫn đến độ phức tạp cực lớn. Do đó, cần một giải pháp thay thế nội dung nhanh gọn và sạch sẽ.

## 3. Kiến trúc tổng quan

```text
┌──────────────────────────────┐
│       Giao diện (React)      │
│  TutorLibraryPage.jsx        │
│  TutorTestManagePage.jsx     │
│  TutorQuestionFormPage.jsx   │
└───────────┬──────────────────┘
            │ API Calls (GET/POST/PUT/DELETE)
            ▼
┌──────────────────────────────┐
│       Máy chủ (Express)      │
│  library.routes / tests.js   │
│  ├─ Middleware xác thực      │ ← Kiểm tra JWT & Role ('tutor', 'admin')
│  ├─ library.service.js       │ ← Upload Supabase, check Magic Bytes
│  ├─ test.service.js          │ ← Logic Bulk Insert, Xử lý Transaction
│  └─ audit.service.js         │ ← Ghi log mọi thao tác C/U/D
└───────────┬──────────────────┘
            │ Raw SQL Queries (pg)
            ▼
┌──────────────────────────────┐
│    Cơ sở dữ liệu PostgreSQL  │
│  library_resources           │
│  mock_tests                  │
│  test_passages               │
│  question_blocks             │
│  questions                   │
│  audit_logs                  │
└──────────────────────────────┘
```

## 4. Luồng yêu cầu chi tiết (Cơ chế Cập nhật)

1. Tutor vào giao diện sửa đề thi và ấn "Cập nhật".
2. Giao diện gửi JSON toàn bộ cấu trúc câu hỏi mới lên `PUT /api/v1/tests/:id`.
3. **Backend (`test.service.js`)** mở một **Database Transaction** (`BEGIN`).
4. Hệ thống thực hiện Hard Delete (xóa triệt để) các bản ghi cũ:
   - `DELETE FROM questions WHERE test_id = $1`
   - `DELETE FROM test_passages WHERE test_id = $1`
5. Hệ thống thực hiện Bulk Insert (chèn hàng loạt) dữ liệu mới:
   - Lặp qua các đoạn văn (Passages) và Insert.
   - Lặp qua các nhóm câu hỏi (Blocks) và Insert.
   - Lặp qua từng câu hỏi (Questions), tính toán lại `question_order` và Insert.
6. Nếu toàn bộ quá trình thành công, gọi `COMMIT` để lưu vào database. Nếu có bất kỳ lỗi nào (chẳng hạn thiếu đáp án đúng), gọi `ROLLBACK` để hoàn tác, không để lại dữ liệu rác.
7. Hệ thống gọi `AuditLogService.logAction()` để ghi lại dấu vết thao tác của Tutor.

## 5. Bảo mật và Toàn vẹn dữ liệu

| Biện pháp | Mô tả |
|---|---|
| Chống giả mạo file | Xác thực file upload bằng **Magic Bytes** (thư viện `file-type`), không tin tưởng đuôi extension (VD: đổi `virus.exe` thành `audio.mp3` sẽ bị chặn). |
| Chống SQL Injection | Không nối chuỗi SQL, sử dụng 100% Parameterized query (`$1, $2`) qua thư viện `pg`. |
| Hiệu suất & Atomicity | Sử dụng Database Transaction (`BEGIN`, `COMMIT`, `ROLLBACK`) kết hợp SQL thuần giúp insert 40 câu hỏi cùng lúc dưới 2000ms. Đảm bảo dữ liệu luôn nhất quán. |
| Role-based Access | Chặn chặt các API cập nhật nội dung bằng middleware `authorize(['tutor', 'admin'])`. Học sinh không thể truy cập API này. |

## 6. Lựa chọn thiết kế (Design Decisions)

### Tại sao lại dùng Hard Delete thay vì Soft Delete hoặc Versioning?
Theo triết lý **Lazy senior dev** (Boring over clever) của dự án, nhóm quyết định giữ hệ thống tinh gọn nhất có thể.
- **Versioning** yêu cầu tạo thêm cột, bảng phức tạp và tăng dung lượng lưu trữ.
- **Soft Delete** yêu cầu phải gắn thêm điều kiện `WHERE deleted_at IS NULL` vào MỌI câu query đọc dữ liệu trên toàn hệ thống.
- **Hard Delete + Re-insert** là giải pháp tối ưu nhất cho bài toán cập nhật cấu trúc phức tạp, giúp Database luôn "sạch", hiệu suất cao và code backend cực kỳ ngắn gọn.

### Vì sao không dùng ORM (Prisma/Sequelize)?
- Đồ án tuân thủ nghiêm ngặt nguyên tắc **Không dùng ORM**, tất cả phải viết SQL thuần bằng thư viện `pg`.
- Việc viết SQL thuần giúp kiểm soát hoàn toàn hiệu năng của câu lệnh Bulk Insert. Nếu dùng ORM, thao tác insert mảng lồng nhau (Passages → Blocks → Questions) thường tự động sinh ra hàng loạt câu lệnh `INSERT` đơn lẻ hoặc cơ chế liên kết phức tạp làm giảm hiệu năng.

## 7. Các giới hạn đã biết (Trade-offs)

- Việc sử dụng Hard Delete khi cập nhật đề thi đồng nghĩa với việc nếu đề thi đó ĐÃ có học sinh làm bài, dữ liệu khóa ngoại (Foreign Key) từ bảng `test_attempts` có thể bị phá vỡ.
- Quyết định: Đội ngũ chấp nhận sự đánh đổi này trong phạm vi đồ án hiện tại để đổi lấy kiến trúc đơn giản, dễ bảo trì. (Trong thực tế, Tutor sẽ được khuyến cáo không nên sửa cấu trúc của các đề thi đã public).

## 8. Cách trình bày trước hội đồng

### Đoạn nói mẫu (khoảng 2–3 phút):

> "Hệ thống IELTSZone của nhóm em có phân hệ CMS và Exam Builder dành riêng cho giáo viên. Tại đây giáo viên có thể upload các file tài nguyên an toàn thông qua lớp bảo vệ Magic Bytes, và có công cụ để soạn thảo đề thi động lên tới 40 câu hỏi chỉ trong một thao tác lưu.
> 
> Điểm nhấn kỹ thuật mà em đảm nhận ở phần này là tối ưu hóa hiệu năng và tính toàn vẹn của **cơ chế cập nhật cấu trúc đề thi**. Khi giáo viên muốn sửa một đề thi Reading có cấu trúc lồng ghép phức tạp (Đoạn văn chứa nhóm câu hỏi, nhóm câu hỏi chứa câu hỏi chi tiết), việc viết các lệnh Update thông thường sẽ vô cùng rắc rối.
> 
> Thay vì lạm dụng ORM làm phình to code và giảm hiệu năng, em đã thiết kế một luồng xử lý thuần SQL (Raw Query). Khi giáo viên ấn lưu, hệ thống mở một Database Transaction. Nó sẽ thực hiện Hard Delete xóa sạch cấu trúc câu hỏi cũ, sau đó sử dụng các lệnh INSERT vòng lặp để chèn lại toàn bộ dữ liệu mới một cách nguyên vẹn, đảm bảo tính toán lại chuẩn xác số thứ tự câu hỏi (question_order).
> 
> Việc bọc toàn bộ luồng này trong Transaction (`BEGIN/COMMIT/ROLLBACK`) mang lại tính nguyên tử (Atomicity) tuyệt đối: Hoặc là đề thi được cập nhật thành công hoàn toàn, hoặc là sẽ bị hoàn tác, tuyệt đối không để lại dữ liệu rác (orphan records). Giải pháp này tuân thủ nguyên lý Keep It Simple, giúp hiệu suất cực cao và tiết kiệm dung lượng Database."
