# Phân chia Công việc & Lộ trình Triển khai (feat-objective-testing)

**Ngày tạo:** 2026-06-03  
**Dựa trên:** PLAN.md + SPEC.md  
**Tổng thời gian dự kiến:** ~11 ngày (có thể làm song song)  
**Sprint:** Sprint 2 — Hệ thống Đánh giá
**Công nghệ:** Bootstrap 5 cho Frontend

---

## Tổng quan: Các Giai đoạn Triển khai

```
Giai đoạn 1 (Ngày 1–2):   Cơ sở dữ liệu & Hạ tầng lõi
Giai đoạn 2 (Ngày 3–4):   Backend Services & Controllers
Giai đoạn 3 (Ngày 5–6):   Tutor Endpoints & Versioning
Giai đoạn 4 (Ngày 7–9):   Phát triển Giao diện Frontend (Bootstrap 5) - TRỌNG TÂM
Giai đoạn 5 (Ngày 10):    Kiểm thử & Tích hợp
Giai đoạn 6 (Ngày 11):    Code Review & Bàn giao
```

---

## GIAI ĐOẠN 1: CƠ SỞ DỮ LIỆU & HẠ TẦNG LÕI

### Task 1.1: DB Migrations — Tạo Bảng Chính
**Ước tính:** 1 ngày (Backend)  
**Mô tả:** Tạo toàn bộ bảng PostgreSQL, enums, indexes, và ràng buộc cho tính năng thi trắc nghiệm.

| # | Nhiệm vụ con | Tiêu chí nghiệm thu (AC) |
|---|---|---|
| 1.1.1 | Tạo ENUM types: `skill_type`, `difficulty`, `question_type`, `attempt_mode`. | Enums được tạo thành công trong DB. |
| 1.1.2 | Tạo bảng `mock_tests` với các cột chuẩn, thêm index cho full-text search. | Bảng và index được tạo thành công. |
| 1.1.3 | Tạo bảng `questions` với ràng buộc UNIQUE `(test_id, question_order)`. | Bảng tạo thành công, chặn trùng lặp số thứ tự câu. |
| 1.1.4 | Tạo bảng `test_attempts` (lịch sử làm bài). | Bảng tạo thành công. |
| 1.1.5 | Tạo bảng `question_answers` (chi tiết đáp án nộp). | Bảng tạo thành công, ràng buộc UNIQUE tốt. |
| 1.1.6 | Tạo bảng `ai_explain_requests` và bảng `audit_logs`. | Các bảng tracking được tạo đầy đủ. |
| 1.1.7 | Viết file script migration up/down. | Chạy `npm run migrate:up/down` mượt mà, không lỗi. |

---

## GIAI ĐOẠN 2 & 3: BACKEND API & LOGIC

### Task 2.1: AutoGrader Service (Chấm điểm tự động)
**Ước tính:** 0.5 ngày (Backend)  
**Mô tả:** Viết thuật toán chấm điểm thuần không đụng DB, xử lý chuẩn hóa chuỗi và tính Band Score.

### Task 2.2: DB Queries (Truy vấn CSDL)
**Ước tính:** 1 ngày (Backend)  
**Mô tả:** Viết hàm thao tác DB bằng SQL thuần, bắt buộc dùng tham số hóa ($1, $2), tuyệt đối không nối chuỗi. 

### Task 2.3: Controllers & API Endpoints
**Ước tính:** 2 ngày (Backend)  
**Mô tả:** Viết các logic xử lý request/response cho cả Học viên (start, submit, kết quả) và Giáo viên (CRUD đề, câu hỏi). Có Audit Logging đầy đủ.

---

## GIAI ĐOẠN 4: PHÁT TRIỂN GIAO DIỆN FRONTEND (TRỌNG TÂM)
**Ước tính:** 3 ngày (Frontend)  
**Công nghệ:** HTML, CSS, JavaScript, **Bootstrap 5** (Bắt buộc dùng các class của Bootstrap để style). Đảm bảo Responsive tốt trên Tablet và Desktop.

*Lưu ý: Nhiệm vụ ưu tiên cao là hoàn thành 14 màn hình này để nộp vào ngày mai.*

### Task 4.1: Màn hình Dành cho Học viên (Student Views)
| # | Màn hình | Tiêu chí nghiệm thu (AC) | Styling (Bootstrap 5) |
|---|---|---|---|
| 4.1.1 | **Trang danh sách đề thi** | Giao diện dạng lưới (grid) hiển thị card các bài test (Title, Skill, Difficulty). Có form lọc bên trên. Phân trang bên dưới. | Dùng lưới `row`, `col-md-4`, `card`, `badge`, form inputs của Bootstrap. |
| 4.1.2 | **Trang chi tiết đề thi** | Thông tin chi tiết, số câu, thời gian làm bài, quy định. Nút "Bắt đầu thi" lớn ở trung tâm. | Bố cục `container`, `jumbotron` (hoặc div tương tự), nút `btn btn-primary btn-lg`. |
| 4.1.3 | **Trang Lịch sử thi** | Danh sách các lần thi dạng bảng. Có điểm số nổi bật. Cột hành động "Xem chi tiết". | `table table-striped table-hover`, label hiển thị trạng thái điểm. |

### Task 4.2: Giao diện Thi trực tiếp (Bắt buộc Split View & Audio)
| # | Màn hình | Tiêu chí nghiệm thu (AC) | Styling (Bootstrap 5) |
|---|---|---|---|
| 4.2.1 | **Modal Hướng dẫn** | Popup hiện lên khi bấm "Bắt đầu thi". Yêu cầu xác nhận mới cho vào. | Dùng `modal` chuẩn Bootstrap, không đóng khi bấm ra ngoài (`backdrop="static"`). |
| 4.2.2 | **Trang thi Reading (Split View)** | Chia màn hình 50-50: Trái đọc bài văn, phải làm câu hỏi. Cuộn độc lập. | Dùng `row` với 2 cột `col-md-6`, class `vh-100 overflow-auto`. |
| 4.2.3 | **Trang thi Listening** | Player âm thanh cố định trên cùng (`position-sticky`), bên dưới là câu hỏi. | Dùng `sticky-top` cho thanh audio, `container` cho danh sách câu hỏi. |
| 4.2.4 | **Bộ 40 câu hỏi & Đáp án** | Render các dạng câu hỏi (Multiple Choice: Radio btn; Fill-in-blank: Text input). | Dùng `form-check`, `form-control` của Bootstrap. Đảm bảo form nhập dễ nhìn. |
| 4.2.5 | **Bảng điều hướng 40 câu** | Bảng lưới 40 ô vuông. Màu sắc: chưa làm (xám), đã làm (xanh), câu hiện tại (viền đậm). Bấm vào để nhảy đến câu. | Lưới flex hoặc grid hệ thống, ô dùng nút `btn btn-outline-secondary`, `btn-success`. |
| 4.2.6 | **Thanh Timer & Trạng thái** | Hiển thị đồng hồ đếm ngược. Chuyển sang ĐỎ khi dưới 5 phút. Có nút "Nộp bài sớm". | Component `navbar` cố định dưới hoặc trên cùng. `text-danger` khi cạn giờ. |
| 4.2.7 | **Modal Nộp bài tự động** | Khi hết giờ, tự mở Modal chặn mọi thao tác, xoay spinner "Đang nộp...". | `modal` không cho đóng, có chứa `spinner-border text-primary`. |

### Task 4.3: Giao diện Sau khi thi (Kết quả & Đánh giá)
| # | Màn hình | Tiêu chí nghiệm thu (AC) | Styling (Bootstrap 5) |
|---|---|---|---|
| 4.3.1 | **Trang Kết quả thi (Tổng quan)** | Hiện Band Score (khổ siêu lớn), điểm thô /40, thời gian hoàn thành. | `display-1` cho band score, `alert alert-success` cho thông báo nộp thành công. |
| 4.3.2 | **Lưới Chi tiết từng câu hỏi** | Danh sách 40 câu: Trạng thái (Đúng/Sai), đáp án của bạn, đáp án đúng. Mở rộng (Accordion) để xem giải thích. | Dùng Bootstrap `Accordion` để ẩn/hiện giải thích chi tiết từng câu. Màu `text-success` (đúng), `text-danger` (sai). |

### Task 4.4: Giao diện Dành cho Giáo viên & Admin (Tutor Views)
| # | Màn hình | Tiêu chí nghiệm thu (AC) | Styling (Bootstrap 5) |
|---|---|---|---|
| 4.4.1 | **Trang Quản lý Đề thi** | Bảng danh sách tất cả các đề (Đã publish / Nháp). Có nút Tạo mới, Sửa, Xóa. | Dùng `table`, `btn-group`, `badge bg-warning/bg-success` chỉ định trạng thái. |
| 4.4.2 | **Form Tạo/Sửa đề thi** | Điền thông tin cơ bản: Tiêu đề, loại bài, độ khó, thời gian. Lên lịch publish. | Form chuẩn Bootstrap: `form-label`, `form-control`, `form-select`. |
| 4.4.3 | **Form Thêm/Sửa câu hỏi** | Cho phép nhập nội dung câu, loại câu hỏi (MCQ/Fill), options đáp án, đáp án đúng, giải thích. | Bố cục thẻ `card` bao bọc từng form nhập, nút `btn-outline-primary` để thêm tùy chọn. |
| 4.4.4 | **Trang Audit Logs (Admin)** | Bảng liệt kê chi tiết mọi thao tác (Ai, làm gì, khi nào, dữ liệu cũ/mới). Có form filter mạnh. | `table-responsive`, `table-sm`, hiển thị JSON trong block `pre` `code`. |

---

## GIAI ĐOẠN 5: KIỂM THỬ & TÍCH HỢP

### Task 5.1: Unit & Integration Tests (Backend)
- Viết bài test 100% cover cho thuật toán AutoGrader.
- Test endpoint nộp bài đảm bảo an toàn transaction (IDOR, 409 re-submit).

### Task 5.2: Frontend Tests & API Integration
- Liên kết giao diện Bootstrap với API backend thực tế (Fetch/Axios).
- Đảm bảo LocalStorage lưu bản nháp mỗi 60 giây hoạt động tốt trên giao diện.

---

## GIAI ĐOẠN 6: CODE REVIEW & BÀN GIAO
- Kiểm tra lại toàn bộ file không có `console.log`.
- Code đáp ứng chuẩn ESLint. Không có lổ hổng bảo mật.
- Merge nhánh và deploy.

---
**Cam kết:** Danh sách 14 màn hình trên sẽ là nhiệm vụ thiết kế Frontend chủ đạo của ngày mai, sử dụng triệt để Bootstrap 5 nhằm đảm bảo UI đồng nhất và responsive.
