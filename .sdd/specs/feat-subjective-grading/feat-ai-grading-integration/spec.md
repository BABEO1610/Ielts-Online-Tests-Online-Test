# Đặc tả tính năng: Luồng Chấm điểm Tự động bằng AI (AI Evaluation & Grading Integration)

**Ngày tạo**: 2026-07-23

**Trạng thái**: Bản nháp

**Đầu vào**: Phân rã từ `feat-subjective-grading`; tích hợp luồng xử lý chấm điểm tự động bằng AI cho cả bài nộp Writing và Speaking, kiểm tra Idempotency, đếm số từ tối thiểu, chấm điểm 4 tiêu chí IELTS, lưu báo cáo và phát sự kiện realtime.

## Kịch bản người dùng và kiểm thử *(bắt buộc)*

### Câu chuyện người dùng 1 — Tích hợp Chấm điểm AI Tự động cho Writing (Ưu tiên: P1)

Là học viên nộp bài thi Writing chọn `grader = 'ai'` (hoặc yêu cầu chấm lại qua API `/ai-grade`), tôi muốn hệ thống tự động kiểm tra điều kiện độ dài, gọi dịch vụ AI chấm điểm 4 tiêu chí cho từng Task, tính điểm Band tổng hợp trọng số và lưu báo cáo chi tiết.

**Lý do ưu tiên**: Cung cấp phản hồi tức thì cho học viên và giảm thời gian chờ đợi.

**Kiểm thử độc lập**: Gửi yêu cầu `POST /api/v1/submissions/writing/:submissionId/ai-grade`, kiểm tra hệ thống trả về kết quả 4 tiêu chí IELTS (`taskAchievementOrResponse`, `coherenceCohesion`, `lexicalResource`, `grammarRangeAccuracy`), lưu 1 bản ghi vào `ai_grading_reports` và phát sự kiện Socket.io `grading_completed`.

**Kịch bản chấp nhận**:

1. **Cho trước** bài nộp Writing Task 1 dưới 50 từ hoặc Task 2 dưới 100 từ, **khi** gửi yêu cầu chấm AI, **thì** hệ thống từ chối chấm trước khi gọi LLM Provider và trả về mã lỗi `AIGRADE_001`.
2. **Cho trước** bài nộp đã được chấm AI thành công trước đó (Cached Report), **khi** học viên yêu cầu chấm lại cùng bài đó, **thì** hệ thống trả về ngay báo cáo đã lưu (Idempotency) với cờ `meta.cached = true`.
3. **Cho trước** bài nộp Writing đủ 2 Tasks đã chấm AI thành công, **khi** cập nhật CSDL, **thì** hệ thống tự động tính band tổng hợp trọng số: `overall_ai_band = (Task 1 Band * 0.33) + (Task 2 Band * 0.67)` làm tròn nấc 0.5.

---

### Câu chuyện người dùng 2 — Tích hợp Chấm điểm AI Tự động cho Speaking (Ưu tiên: P1)

Là học viên nộp bài thi Speaking 3 Parts chọn `grader = 'ai'`, tôi muốn hệ thống tự động sinh nhận dạng giọng nói (ASR Transcript) nếu thiếu, gọi dịch vụ AI chấm điểm 4 tiêu chí Speaking (gồm Pronunciation dựa trên audio/transcript) và lưu kết quả.

**Lý do ưu tiên**: Đánh giá chính xác kỹ năng giao tiếp nói của học viên dựa trên file âm thanh và transcript.

**Kiểm thử độc lập**: Nộp bài Speaking 3 parts qua `/speaking/full`, kiểm tra API gọi `gradeSpeakingGroup`, chấm đủ 4 tiêu chí IELTS Speaking và cập nhật `status = 'ai_graded'`.

**Kịch bản chấp nhận**:

1. **Cho trước** bài nộp Speaking trọn bộ 3 Parts, **khi** hệ thống xử lý AI, **thì** chấm chung trọn phiên 3 Parts như một buổi thi IELTS Speaking thật (11-14 phút) chứ không chia nhỏ band score theo từng part.
2. **Cho trước** bài nộp Speaking thiếu transcript, **khi** gọi dịch vụ AI, **thì** backend tự động kích hoạt ASR Transcribe tạo văn bản trước khi đưa vào mô hình chấm điểm.

---

### Câu chuyện người dùng 3 — Xử lý Sự cố & Phát sự kiện Realtime (Ưu tiên: P2)

Là hệ thống, tôi muốn xử lý các sự cố mạng/provider từ AI an toàn (lưu bản ghi lỗi `status = 'failed'` mà không làm mất bài làm của học viên) và phát sự kiện Socket.io cập nhật trạng thái realtime.

**Lý do ưu tiên**: Bảo vệ dữ liệu học viên và nâng cao trải nghiệm người dùng realtime.

**Kiểm thử độc lập**: Gửi yêu cầu chấm AI với provider bị ngắt kết nối, kiểm tra bài nộp giữ nguyên trạng thái `status = 'pending'`, lưu bản ghi lỗi trong `ai_grading_reports` và phát sự kiện Socket.io `grading_failed`.

**Kịch bản chấp nhận**:

1. **Cho trước** sự cố gián đoạn dịch vụ AI Provider, **khi** chấm bài thất bại, **thì** bài nộp giữ nguyên trong CSDL với trạng thái `ai_status = 'failed'` và `status = 'pending'`; KHÔNG tự động xóa bài nộp và KHÔNG đẩy sang hàng đợi Giáo viên.
2. **Cho trước** quá trình chấm AI hoàn tất, **khi** thành công, **thì** phát sự kiện Socket.io `grading_completed` đến channel của `userId`.

---

## Yêu cầu *(bắt buộc)*

### Yêu cầu chức năng

- **FR-001**: API Chấm điểm AI Writing (`POST /api/v1/submissions/writing/:submissionId/ai-grade`) PHẢI kiểm tra quyền học viên sở hữu (`user_id === req.user.id`).
- **FR-002**: Hệ thống PHẢI kiểm tra số từ tối thiểu (Task 1 ≥ 50 từ, Task 2 ≥ 100 từ) trước khi tiêu thụ token AI.
- **FR-003**: Hệ thống PHẢI kiểm tra Idempotency: Nếu bài nộp đã có báo cáo chấm thành công trong `ai_grading_reports`, trả về kết quả đã lưu mà không gọi lại LLM Provider.
- **FR-004**: Báo cáo chấm điểm Writing PHẢI bao gồm 4 tiêu chí IELTS (`taskAchievementOrResponse`, `coherenceCohesion`, `lexicalResource`, `grammarRangeAccuracy`), `improvedVersion`, `error_highlights` và `suggestions`.
- **FR-005**: Báo cáo chấm điểm Speaking PHẢI bao gồm 4 tiêu chí IELTS (`fluencyCoherence`, `lexicalResource`, `grammaticalRangeAccuracy`, `pronunciation`).
- **FR-006**: Điểm tổng hợp AI Writing PHẢI tính theo trọng số: 33% Task 1 + 67% Task 2 và làm tròn theo quy tắc IELTS half-band (0.5).
- **FR-007**: Mọi cuộc gọi dịch vụ AI PHẢI lưu vết nhật ký token và latency vào bảng `ai_usage_logs`.
- **FR-008**: Khi chấm AI thất bại, hệ thống PHẢI lưu báo cáo trạng thái `failed` và giữ bài nộp ở trạng thái `pending` thay vì chuyển ngầm sang Tutor.

### Thực thể chính

- **Báo cáo Chấm AI (ai_grading_reports)**: Bảng lưu kết quả điểm số 4 tiêu chí, feedback, raw response và trạng thái chấm (`completed` / `failed`).
- **Nhật ký Sử dụng AI (ai_usage_logs)**: Bảng lưu số token tiêu thụ, chi phí và thời gian phản hồi.

## Tiêu chí thành công *(bắt buộc)*

### Kết quả đo lường được

- **SC-001**: 100% bài nộp dưới ngưỡng từ tối thiểu bị từ chối trước khi tiêu thụ token AI.
- **SC-002**: 100% các cuộc gọi chấm lặp lại cho bài nộp đã chấm thành công trả về kết quả Cached trong dưới 200ms.
- **SC-003**: 100% sự cố chấm AI thất bại không làm mất bài nộp của học viên trong cơ sở dữ liệu.
- **SC-004**: 100% điểm tổng hợp AI được làm tròn chuẩn nấc 0.5 theo quy tắc IELTS.

## Giả định và phụ thuộc

- Wrapper AI Provider (`gradeWriting`, `gradeSpeakingGroup`) thuộc `ai-fast-grading` sẵn sàng.
- Bảng `ai_grading_reports` và `ai_usage_logs` đã tồn tại trong CSDL.

## Ngoài phạm vi

- Thuật toán Prompt Engineering & LLM API call nội bộ — thuộc `ai-fast-grading`.
- Giao diện xem lịch sử bài nộp — thuộc `feat-student-feedback-history`.
