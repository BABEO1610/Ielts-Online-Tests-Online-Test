# Implementation Checklist: CMS & Exam Builder (feat-content-builder)

**Purpose**: Đảm bảo tất cả các yêu cầu kỹ thuật và nghiệp vụ của tính năng CMS & Exam Builder được thực hiện đầy đủ, an toàn và đúng tiến độ.
**Created**: 2026-07-24
**Feature**: [SPEC.md](./SPEC.md) | [PLAN.md](./PLAN.md) | [TASKS.md](./TASKS.md)

## 1. Môi trường & Cơ sở dữ liệu (Phase 1)

- [ ] CHK001 Đã kiểm tra lại schema `mock_tests`, `test_passages`, `question_blocks`, `questions` trong PostgreSQL.
- [ ] CHK002 Đã kiểm tra lại schema `library_resources` và `audit_logs`.
- [ ] CHK003 Đã cấu hình biến môi trường cho Supabase/S3 Storage (hoặc thư mục upload local).
- [ ] CHK004 Cài đặt thành công package `multer` và `file-type` vào backend.

## 2. Kho Tài nguyên & File (User Story 1)

- [ ] CHK005 Middleware `upload.middleware.js` đã check đúng magic bytes thay vì chỉ check đuôi file.
- [ ] CHK006 API Upload từ chối file > 20MB (PDF) và > 100MB (Audio).
- [ ] CHK007 API Upload từ chối file có MIME type không nằm trong whitelist.
- [ ] CHK008 API Upload lưu thành công URL vào bảng `library_resources`.
- [ ] CHK009 Giao diện Frontend (`MediaLibraryPage`) đã hiển thị danh sách file kèm filter/search.

## 3. Khung Đề thi & Lõi Versioning (User Story 2)

- [ ] CHK010 API CRUD cho `mock_tests` hoạt động trơn tru.
- [ ] CHK011 **Thuật toán Versioning (QUAN TRỌNG)**: Sửa đề chưa publish -> Ghi đè thành công.
- [ ] CHK012 **Thuật toán Versioning (QUAN TRỌNG)**: Sửa đề đã publish có người thi -> Clone thành công version 2, version cũ bị set `is_published = false`.
- [ ] CHK013 Bảng điểm của user đã thi (nếu có mock data) KHÔNG bị mất kết nối với version cũ.

## 4. Công cụ Soạn thảo Câu hỏi Động (User Story 3)

- [ ] CHK014 API Bulk Insert (`POST /mock-tests/:id/questions/bulk`) nhận JSON lớn và insert thành công.
- [ ] CHK015 Form React (`DynamicQuestionForm.jsx`) có thể thêm/xóa câu hỏi trực tiếp trên trình duyệt mà không bị giật lag.
- [ ] CHK016 Đánh số `question_order` chính xác, không bị trùng lặp khi gửi lên server.
- [ ] CHK017 Giao diện cho phép map (liên kết) ID của bài Audio/PDF từ Kho tài nguyên vào đề thi.

## 5. Audit & CMS Dashboard (User Story 4)

- [ ] CHK018 Ghi nhận thành công log vào `audit_logs` khi Upload file, Xóa file.
- [ ] CHK019 Ghi nhận thành công log vào `audit_logs` khi Sửa/Xóa đề thi.
- [ ] CHK020 Giao diện `AuditDashboardPage` hiển thị chính xác tổng số đề thi và log hoạt động.

## 6. Bảo mật & Tối ưu (Cross-Cutting)

- [ ] CHK021 `req.user.id` và `role` được lấy an toàn từ middleware, KHÔNG lấy từ Body request.
- [ ] CHK022 Người dùng không phải `tutor` hoặc `admin` bị chặn quyền gọi API sửa đề (HTTP 403).
- [ ] CHK023 Nếu insert DB thất bại trong quá trình upload, file rác trên ổ cứng/Cloud đã được dọn dẹp.
- [ ] CHK024 Test coverage cho `upload.middleware.js` và `examBuilder.service.js` đạt mức yêu cầu.

## Notes

- Check items off as completed: `[x]`
- Thêm comment nếu thuật toán Versioning có edge-cases mới phát sinh.
- Các task bám sát theo tiến độ quy định tại file `TASKS.md`.
