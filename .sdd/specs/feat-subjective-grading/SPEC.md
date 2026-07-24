# Đặc tả tính năng tổng thể: Hệ thống Chấm bài Tự luận IELTS (Subjective Grading Master Spec)

**Ngày cập nhật**: 2026-07-23

**Trạng thái**: Tài liệu đặc tả tổng thể (Master Feature Spec) — Đã rà soát & tích hợp toàn bộ codebase

**Đầu vào & Phạm vi tổng quát**:
Nền tảng chấm bài tự luận IELTSZone quản lý toàn bộ chu trình xử lý bài thi tự luận Writing và Speaking cho học viên, quản trị viên và giáo viên: từ việc thu âm/soạn bài thi trên giao diện SPA, lựa chọn người chấm (`AI` hoặc `Giáo viên`), xử lý nộp bài, phân công bài nộp từ Admin cho Giảng viên phù hợp, xử lý và chấm điểm tự động qua dịch vụ AI, đến việc cung cấp Không gian làm việc chấm bài cho Giáo viên và trang Báo cáo phản hồi chi tiết cho Học viên.

Feature lớn này được phân rã thành **6 sub-features chuyên biệt**:
1. 📁 [feat-writing-test-flow](./feat-writing-test-flow/spec.md): Luồng thi và nộp bài Writing Task 1 & Task 2.
2. 📁 [feat-speaking-test-flow](./feat-speaking-test-flow/spec.md): Luồng thi và nộp bài Speaking 3 Parts.
3. 📁 [feat-ai-grading-integration](./feat-ai-grading-integration/spec.md): Luồng Xử lý & Chấm điểm Tự động bằng AI (Writing & Speaking AI Evaluation Pipeline).
4. 📁 [feat-admin-tutor-assignment](./feat-admin-tutor-assignment/spec.md): Admin quản lý và Phân công Giảng viên chấm bài.
5. 📁 [feat-tutor-grading-workspace](./feat-tutor-grading-workspace/spec.md): Không gian làm việc và chấm bài dành cho Giáo viên.
6. 📁 [feat-student-feedback-history](./feat-student-feedback-history/spec.md): Tra cứu Lịch sử nộp bài và Báo cáo phản hồi cho Học viên.

---

## 1. Danh mục API Routes Hoạt động (Active API Endpoints)

Tất cả các API được bảo vệ bởi middleware xác thực JWT/Session (`authenticate.js`) và phân quyền RBAC (`authorize.js`).

### 1.1. Endpoints dành cho Học viên (Student Endpoints - `/api/v1/submissions`)

| Method | Path | Mô tả chức năng | Quyền truy cập |
|---|---|---|---|
| `POST` | `/writing/full` | Nộp bài thi Writing full (gồm cả Task 1 và Task 2) cho AI hoặc Tutor | Authenticated Student |
| `POST` | `/speaking/upload` | Tải lên file âm thanh Speaking tạm thời qua Multer middleware | Authenticated Student |
| `POST` | `/speaking/full` | Nộp bài thi Speaking full (gồm cả 3 Parts 1, 2, 3) cho AI hoặc Tutor | Authenticated Student |
| `POST` | `/speaking` | Endpoint legacy 1 Part Speaking (Chỉ dành cho Tutor; từ chối AI) | Authenticated Student |
| `POST` | `/writing/:submissionId/ai-grade` | Yêu cầu chấm điểm/chấm lại AI cho bài nộp Writing | Authenticated Student |
| `GET` | `/history` | Tra cứu danh sách lịch sử bài nộp Writing/Speaking của học viên | Authenticated Student |
| `GET` | `/:id/feedback` | Lấy chi tiết báo cáo phản hồi chấm điểm (AI hoặc Tutor) | Authenticated Owner |

### 1.2. Endpoints dành cho Quản trị viên (Admin Endpoints - `/api/v1/admin`)

| Method | Path | Mô tả chức năng | Quyền truy cập |
|---|---|---|---|
| `GET` | `/tutor-assignments` | Lấy danh sách các bài nộp thi tự luận cần phân công & danh sách Tutor | `admin` |
| `PUT` | `/tutor-assignments/:submissionId` | Phân công bài nộp cho một Giảng viên cụ thể (hoặc bỏ gán `null`) | `admin` |
| `GET` | `/submissions` | Giám sát toàn bộ bài nộp thi tự luận trên toàn hệ thống | `admin` |
| `POST` | `/submissions/:type/:id/retry` | Đặt lại trạng thái pending để chạy lại luồng chấm | `admin` |

### 1.3. Endpoints dành cho Giáo viên (Tutor Workspace Endpoints - `/api/v1/tutors`)

| Method | Path | Mô tả chức năng | Quyền truy cập |
|---|---|---|---|
| `GET` | `/queue` | Lấy hàng đợi bài nộp đang chờ chấm (`grader = 'tutor'` & `status = 'pending'`) | `tutor`, `admin` |
| `GET` | `/dashboard-stats` | Thống kê số lượng bài chờ chấm, bài đã chấm trong ngày/tuần | `tutor`, `admin` |
| `GET` | `/submissions/:type/:submissionId` | Lấy nội dung chi tiết bài nộp Writing/Speaking để chấm | `tutor`, `admin` |
| `POST` | `/submissions/:type/:submissionId/grade` | Lưu điểm 4 tiêu chí và nhận xét chính thức của Giáo viên | `tutor` |
| `POST` | `/submissions/:type/:submissionId/ai-prelim` | Lấy bản nháp gợi ý 4 tiêu chí từ AI (AI Prelim Assist) | `tutor`, `admin` |
| `POST` | `/submissions/speaking/:partId/transcribe` | Tạo transcript âm thanh Speaking phục vụ chấm bài | `tutor`, `admin` |
| `GET` | `/grading-history` | Xem danh sách các bài thi đã được chấm bởi chính Tutor | `tutor`, `admin` |
| `GET` | `/grading-history/:submissionId` | Xem chi tiết báo cáo kết quả bài đã chấm trong lịch sử | `tutor`, `admin` |
| `PATCH` | `/grading-history/:submissionId/revoke` | Thu hồi (soft-delete) kết quả chấm đã ban hành | `tutor`, `admin` |
| `PATCH` | `/grading-history/:submissionId/score` | Cập nhật lại điểm số và nhận xét bài đã chấm | `tutor`, `admin` |
| `GET` | `/ai-reference` | Xem danh sách bài nộp được AI chấm ở chế độ Read-only | `tutor`, `admin` |
| `GET` | `/ai-reference/:submissionId` | Xem chi tiết báo cáo AI ở chế độ Read-only | `tutor`, `admin` |
| `GET` | `/activity-logs` | Tra cứu nhật ký hoạt động cá nhân của Giáo viên | `tutor`, `admin` |

---

## 2. Kịch bản Người dùng và Kiểm thử (User Stories & Acceptance Criteria)

### 2.1. Luồng Học viên thi và nộp bài Writing (US-W)
- **Hành vi**: Học viên làm bài Writing Task 1 & Task 2 trên giao diện Split-view, xem đếm ngược thời gian và số từ realtime. Khi hoàn thành, chọn `AI chấm điểm` hoặc `Giảng viên chấm`.
- **Kịch bản chấp nhận**:
  1. Bài nộp thành công bắt buộc lưu đúng 2 bản ghi `writing_submissions` gắn chung một `writing_group_id`.
  2. Nếu `grader = 'ai'`, kích hoạt luồng AI Grading Integration chấm 4 tiêu chí cho từng task và tính band tổng hợp trọng số.

### 2.2. Luồng Học viên thi và nộp bài Speaking 3 Parts (US-S)
- **Hành vi**: Học viên thực hiện 3 phần Speaking, file âm thanh được tự động tải lên kho lưu trữ tạm thời (`speaking/{userId}/`). Học viên nộp trọn bộ 3 Parts và chọn `grader`.
- **Kịch bản chấp nhận**:
  1. API nộp bài `/speaking/full` bắt buộc nhận đúng 3 Parts (`parts.length === 3`).
  2. Backend kiểm tra an toàn đường dẫn âm thanh và lưu 3 bản ghi `speaking_submissions` cùng `speaking_group_id`.

### 2.3. Luồng Tích hợp Chấm điểm AI Tự động (US-AI)
- **Hành vi**: Hệ thống nhận bài nộp `grader = 'ai'`, kiểm tra ngưỡng từ tối thiểu (Task 1 ≥ 50, Task 2 ≥ 100), kiểm tra Idempotency (Cached Result), gọi LLM Provider chấm 4 tiêu chí IELTS, tính band tổng hợp trọng số (33%/67% Writing, 4-criteria average Speaking), lưu `ai_grading_reports`, log `ai_usage_logs` và phát sự kiện Socket.io realtime.
- **Kịch bản chấp nhận**:
  1. Bài nộp thiếu từ bị từ chối chấm trước khi gọi LLM API.
  2. Bài nộp đã chấm thành công trước đó trả về kết quả Cached trong dưới 200ms.
  3. Sự cố AI thất bại giữ bài nộp ở trạng thái `pending` và lưu log lỗi `status = 'failed'` thay vì xóa bài hay đẩy sang Tutor.

### 2.4. Luồng Admin Phân công Giảng viên (US-A)
- **Hành vi**: Admin truy cập `/admin/tutor-assignments`, xem danh sách bài nộp `status = 'pending'` chọn Giảng viên từ Dropdown để gán bài nộp.
- **Kịch bản chấp nhận**:
  1. Phân công cập nhật `assigned_tutor_id` cho cả nhóm bài nộp và ghi `audit_logs` với action `'tutor_assigned'`.

### 2.5. Luồng Không gian chấm bài dành cho Giáo viên (US-T)
- **Hành vi**: Giáo viên truy cập `/tutor/queue` xem danh sách bài nộp được phân công hoặc tự do, bấm nhận bài (Atomic Claim), dùng AI Prelim Assist, nhập điểm 4 tiêu chí và gửi kết quả.

### 2.6. Luồng Lịch sử bài làm và Báo cáo phản hồi Học viên (US-H)
- **Hành vi**: Học viên truy cập `/student/profile/practice-history` xem danh sách bài đã nộp, xem chi tiết báo cáo phản hồi 4 tiêu chí đính nhãn `AI Estimated Band` vs `Tutor Grade`.

---

## 3. Yêu cầu Chức năng Tổng thể (Master Functional Requirements)

### Nhóm 1: Nộp bài & Tích hợp AI
- **FR-001**: API Nộp bài Writing (`POST /writing/full`) và Speaking (`POST /speaking/full`) PHẢI tạo `group_id` gom nhóm các task/part nguyên tử trong DB transaction.
- **FR-002**: Luồng chấm AI PHẢI kiểm tra ngưỡng từ tối thiểu, kiểm tra Idempotency cache report và chấm đủ 4 tiêu chí IELTS.
- **FR-003**: Điểm tổng hợp AI Writing PHẢI tính theo trọng số 33% Task 1 + 67% Task 2 và làm tròn chuẩn nấc 0.5.
- **FR-004**: Mọi cuộc gọi AI PHẢI lưu vết token usage và độ trễ vào `ai_usage_logs`.

### Nhóm 2: Admin Phân công & Tutor Workspace
- **FR-005**: API Phân công (`PUT /admin/tutor-assignments/:submissionId`) PHẢI bảo vệ bởi `authorize('admin')` và ghi `audit_logs` `'tutor_assigned'`.
- **FR-006**: Tutor Queue PHẢI chỉ hiển thị các bài `grader = 'tutor'` & `status = 'pending'`. Báo cáo Tutor lưu riêng trong `tutor_feedback_reports`.

### Nhóm 3: Lịch sử & Bảo mật
- **FR-007**: 100% API Lịch sử và Báo cáo PHẢI lọc đúng `user_id = req.user.id`.
- **FR-008**: Tất cả API endpoints PHẢI trả về cấu trúc envelope chuẩn `{ success, data, error, meta }`.

---

## 4. Tiêu chí Thành công Tổng thể (Master Success Criteria)

- **SC-001**: 100% bài nộp thi tự luận đều hỗ trợ cả 2 luồng chấm AI và Tutor linh hoạt.
- **SC-002**: 100% cuộc gọi chấm AI lặp lại cho bài nộp đã chấm thành công trả về kết quả Cached trong dưới 200ms.
- **SC-003**: 100% thao tác phân công của Admin được ghi nhật ký hệ thống `audit_logs` với action `'tutor_assigned'`.
- **SC-004**: 0% bài nộp chọn `grader = 'ai'` xuất hiện trong hàng đợi chấm thủ công của Tutor.
- **SC-005**: Thời gian phản hồi API nộp bài, phân công Admin và nhận bài Tutor dưới 1.5 giây ở điều kiện baseline.
