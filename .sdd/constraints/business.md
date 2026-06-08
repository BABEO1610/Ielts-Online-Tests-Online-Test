# BUSINESS CONSTRAINTS — Ràng buộc nghiệp vụ / kinh doanh
# Project: IELTSZone | Version: 1.0 | Location: .sdd/constraints/business.md
#
# Mục đích: Chứa các ràng buộc xuất phát từ QUY TẮC NGHIỆP VỤ / KINH DOANH,
#           không phải kỹ thuật thuần. Đây là giới hạn do "luật chơi" của
#           sản phẩm IELTSZone quy định: quota, quyền theo role, ngân sách AI,
#           vòng đời dữ liệu, quy tắc miền IELTS.
#
# Cross-ref: .sdd/constitution.md (ARTICLE 7 IELTS Domain), .sdd/shared_context.md

---

## B-01 — QUYỀN THEO ROLE (Authorization matrix)

Role lấy từ enum `user_role`: `user`, `student`, `tutor`, `admin`.

| Hành động                          | user | student | tutor | admin |
|------------------------------------|:----:|:-------:|:-----:|:-----:|
| Xem test đã publish                | ✅   | ✅      | ✅    | ✅    |
| Làm bài / nộp bài                  | ❌   | ✅      | ✅    | ✅    |
| Xem kết quả chấm AI của bản thân   | ❌   | ✅      | ✅    | ✅    |
| Chấm bài (tutor feedback)          | ❌   | ❌      | ✅    | ✅    |
| Tạo / sửa / xóa test               | ❌   | ❌      | ✅*   | ✅    |
| Upload tài liệu thư viện           | ❌   | ❌      | ✅    | ✅    |
| Quản lý user / đổi role            | ❌   | ❌      | ❌    | ✅    |
| Xem audit log / metrics            | ❌   | ❌      | ❌    | ✅    |

> * Tutor chỉ sửa/xóa test do chính mình tạo. Admin toàn quyền.
> userId & role PHẢI lấy từ auth middleware (Constitution SEC-10).

---

## B-02 — QUY TẮC TÀI KHOẢN

| Ràng buộc                           | Giá trị                                  |
|-------------------------------------|------------------------------------------|
| Role mặc định khi đăng ký           | `student`                                |
| Trạng thái mặc định                 | `pending` → `active` sau verify email   |
| Bắt buộc verify email trước khi làm bài | Có                                   |
| Đăng nhập sai liên tiếp             | 5 lần → khóa 15 phút (`locked_until`)   |
| Không tái sử dụng mật khẩu          | Chặn 5 mật khẩu gần nhất (password_history) |
| OAuth provider hỗ trợ               | google, facebook, github                 |

---

## B-03 — NGÂN SÁCH & GIỚI HẠN AI (chấm bài + chatbot)

| Ràng buộc                              | Giá trị                            |
|----------------------------------------|------------------------------------|
| Model chấm                             | claude-sonnet-4 (Constitution ART 1)|
| Timeout 1 lần gọi AI grading           | 90 giây                            |
| Retry khi AI fail                      | Tối đa 3 lần, exponential backoff  |
| Quota chấm AI / student / ngày         | 10 bài (Writing + Speaking)        |
| Quota tin nhắn chatbot / user / ngày   | 50 tin                             |
| Giới hạn độ dài response Writing       | 50 – 1000 từ (ngoài range → cảnh báo) |
| Theo dõi token                         | Ghi `tokens_used` vào DB mỗi lần gọi |

> Mọi call AI đi qua `src/ai/grading.service.js` (Constitution IELTS-09).
> Vượt quota → trả 429 với code `AI_QUOTA_EXCEEDED`.

---

## B-04 — QUY TẮC MIỀN IELTS

| Ràng buộc                       | Giá trị                                           |
|---------------------------------|---------------------------------------------------|
| Band score                      | 0.0 – 9.0, bước 0.5                               |
| Tiêu chí Writing/Speaking       | 4 tiêu chí, mỗi tiêu chí 25% (Constitution ART 7)|
| Mỗi lần nộp = 1 submission mới  | KHÔNG overwrite lịch sử (IELTS-08)               |
| Xem kết quả khi                 | status ∈ {`ai_graded`, `tutor_graded`, `reviewed`} |
| Writing Task                    | task_number ∈ {1, 2}                             |
| Speaking Part                   | part_number ∈ {1, 2, 3}                          |
| Chế độ làm bài                  | `timed` (theo duration_minutes) hoặc `untimed`   |

---

## B-05 — VÒNG ĐỜI & LƯU TRỮ DỮ LIỆU

| Loại dữ liệu                   | Chính sách lưu trữ                         |
|--------------------------------|--------------------------------------------|
| Submission & feedback          | Soft-delete, giữ vĩnh viễn (lịch sử học tập)|
| Audit log                      | Giữ tối thiểu 90 ngày, sau đó archive       |
| Email/reset token              | Hết hạn theo `expires_at`, dọn định kỳ      |
| Session                        | access 15 phút, refresh 7 ngày (placeholder ART 1) |
| File upload tạm (chưa gắn record) | Dọn sau 24 giờ                          |
| Contact submission             | Giữ đến khi `resolved = true` + 30 ngày     |

---

## B-06 — NỘI DUNG & PUBLISH

- Test/tài liệu chỉ hiển thị công khai khi `is_published = true`.
- Có thể đặt lịch publish qua `publish_at` (test ẩn cho tới thời điểm đó).
- Guest (`user` chưa đăng nhập) chỉ xem được nội dung đã publish, không làm bài.
