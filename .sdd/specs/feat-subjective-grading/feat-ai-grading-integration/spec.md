# Đặc tả tính năng: Luồng Chấm điểm Tự động bằng AI (AI Grading Integration)

**Ngày tạo**: 2026-07-23
**Trạng thái**: Nền tảng HIỆN CÓ; các cổng phát hành MỤC TIÊU vẫn còn mở
**Phân loại**: Mỗi mục quy chuẩn được gắn nhãn `AS-BUILT`, `TARGET`, hoặc `NEEDS CLARIFICATION`.

## 1. Tổng quan tính năng và bối cảnh nghiệp vụ

IELTSZone tích hợp luồng xử lý chấm điểm tự động bằng AI cho cả bài nộp Writing và Speaking. Khi học viên chọn `grader = 'ai'`, hệ thống kiểm tra điều kiện đầu vào (ngưỡng từ tối thiểu, idempotency), gọi LLM Provider chấm điểm theo đúng 4 tiêu chí IELTS tương ứng, tính điểm tổng hợp theo trọng số chuẩn IELTS, lưu báo cáo vào `ai_grading_reports`, ghi nhật ký token và độ trễ vào `ai_usage_logs`, và phát sự kiện Socket.io cập nhật trạng thái realtime. Mọi lỗi AI được ghi vết an toàn mà không làm mất bài nộp của học viên.

## 2. Phạm vi

- Kiểm tra điều kiện đầu vào trước khi gọi AI: ngưỡng từ tối thiểu (Writing), xác minh file audio (Speaking).
- Kiểm tra Idempotency: trả về kết quả đã lưu nếu bài nộp đã được chấm thành công trước đó.
- Gọi LLM Provider chấm điểm 4 tiêu chí IELTS Writing và 4 tiêu chí IELTS Speaking.
- Tính điểm tổng hợp theo trọng số: Writing = 33% Task 1 + 67% Task 2; Speaking = trung bình 4 tiêu chí.
- Lưu báo cáo `ai_grading_reports` và nhật ký `ai_usage_logs`.
- Phát sự kiện Socket.io `grading_completed` hoặc `grading_failed` đến channel của học viên.
- Khi Speaking thiếu transcript: tự động kích hoạt ASR để tạo transcript trước khi chấm.
- Xử lý lỗi an toàn: giữ bài nộp ở `status = 'pending'` khi AI thất bại, không tự chuyển sang Giảng viên.

## 3. Ngoài phạm vi

- Thuật toán Prompt Engineering và LLM API call nội bộ — thuộc `ai-fast-grading`.
- Giao diện xem lịch sử bài nộp và báo cáo chi tiết — thuộc `feat-student-feedback-history`.
- Hàng đợi và không gian chấm của Giảng viên — thuộc `feat-tutor-grading-workspace`.
- Luồng nộp bài Writing và Speaking — thuộc `feat-writing-test-flow` và `feat-speaking-test-flow`.
- Chính sách hoàn trả hạn mức khi AI thất bại — chưa được phê duyệt (xem Câu hỏi mở).

## 4. Tác nhân và tóm tắt phân quyền

| Tác nhân | Hành vi được phép |
|---|---|
| Học viên đã xác thực (chủ sở hữu) | Yêu cầu chấm AI cho bài nộp của chính mình (`user_id === req.user.id`). |
| Giảng viên (Tutor) | Yêu cầu AI Prelim Assist (bản nháp gợi ý) cho bài nộp đang chấm — xem `feat-tutor-grading-workspace`. |
| Admin | Có thể yêu cầu chấm lại qua endpoint admin retry; không tính thêm hạn mức. |
| Khách/không phải chủ sở hữu | Không thể yêu cầu chấm AI cho bài nộp của người khác; bị từ chối với 403 Forbidden. |

## 5. Câu chuyện người dùng và kiểm thử độc lập

### Câu chuyện 1 — Tích hợp Chấm điểm AI cho Writing (Ưu tiên: P1)

Với tư cách học viên nộp bài thi Writing với `grader = 'ai'`, tôi muốn hệ thống tự động kiểm tra điều kiện độ dài, gọi dịch vụ AI chấm 4 tiêu chí cho từng Task, tính điểm tổng hợp trọng số và lưu báo cáo chi tiết.

**Kiểm thử độc lập**: Gửi yêu cầu `POST /api/v1/submissions/writing/:submissionId/ai-grade`, kiểm tra hệ thống trả về kết quả 4 tiêu chí IELTS (`taskAchievementOrResponse`, `coherenceCohesion`, `lexicalResource`, `grammarRangeAccuracy`), lưu 1 bản ghi vào `ai_grading_reports` và phát sự kiện Socket.io `grading_completed`.

**Kịch bản chấp nhận**:

1. **Cho trước** bài nộp Writing Task 1 dưới 50 từ hoặc Task 2 dưới 100 từ, **Khi** gửi yêu cầu chấm AI, **Thì** hệ thống từ chối chấm trước khi gọi LLM Provider và không trừ hạn mức.
2. **Cho trước** bài nộp đã được chấm AI thành công trước đó (Idempotency), **Khi** học viên yêu cầu chấm lại cùng bài đó, **Thì** hệ thống trả về ngay báo cáo đã lưu với cờ `meta.cached = true` và không gọi lại LLM Provider.
3. **Cho trước** bài nộp Writing đủ 2 Tasks đã chấm AI thành công, **Khi** cập nhật cơ sở dữ liệu, **Thì** hệ thống tự động tính band tổng hợp: `overall_ai_band = (Task 1 Band × 0.33) + (Task 2 Band × 0.67)` làm tròn nấc 0.5.

### Câu chuyện 2 — Tích hợp Chấm điểm AI cho Speaking (Ưu tiên: P1)

Với tư cách học viên nộp bài thi Speaking 3 Parts với `grader = 'ai'`, tôi muốn hệ thống tự động sinh nhận dạng giọng nói (ASR Transcript) nếu thiếu, gọi dịch vụ AI chấm 4 tiêu chí Speaking và lưu kết quả.

**Kiểm thử độc lập**: Nộp bài Speaking 3 Parts qua `/speaking/full`, kiểm tra luồng chấm AI, đủ 4 tiêu chí IELTS Speaking và cập nhật `status = 'ai_graded'`.

**Kịch bản chấp nhận**:

1. **Cho trước** bài nộp Speaking trọn bộ 3 Parts, **Khi** hệ thống xử lý AI, **Thì** chấm chung trọn phiên 3 Parts như một buổi thi IELTS Speaking thật, không chia band score theo từng Part riêng lẻ.
2. **Cho trước** bài nộp Speaking thiếu transcript, **Khi** gọi dịch vụ AI, **Thì** backend tự động kích hoạt ASR Transcribe để tạo văn bản trước khi đưa vào mô hình chấm điểm.

### Câu chuyện 3 — Xử lý Sự cố và Phát sự kiện Realtime (Ưu tiên: P2)

Với tư cách hệ thống, tôi muốn xử lý các sự cố mạng/provider AI an toàn (lưu bản ghi lỗi mà không làm mất bài làm của học viên) và phát sự kiện Socket.io cập nhật trạng thái realtime.

**Kiểm thử độc lập**: Gửi yêu cầu chấm AI với provider bị ngắt kết nối, kiểm tra bài nộp giữ nguyên trạng thái `status = 'pending'`, lưu bản ghi lỗi trong `ai_grading_reports` với `status = 'failed'` và phát sự kiện Socket.io `grading_failed`.

**Kịch bản chấp nhận**:

1. **Cho trước** sự cố gián đoạn dịch vụ AI Provider, **Khi** chấm bài thất bại, **Thì** bài nộp giữ nguyên trong cơ sở dữ liệu với `ai_status = 'failed'` và `status = 'pending'`; KHÔNG tự động xóa bài nộp và KHÔNG đẩy sang hàng đợi Giảng viên.
2. **Cho trước** quá trình chấm AI hoàn tất thành công, **Khi** lưu báo cáo, **Thì** hệ thống phát sự kiện Socket.io `grading_completed` đến channel của học viên (`userId`).

## 6. Trường hợp biên

- Gọi AI với bài nộp không thuộc sở hữu học viên đang đăng nhập — bị từ chối với 403 Forbidden.
- LLM Provider trả về JSON không đúng định dạng — backend bóc tách bằng Regex/String Parsing trong try-catch, ghi lỗi vào `ai_grading_reports` với `status = 'failed'`.
- LLM Provider trả về điểm band ngoài khoảng 0.0–9.0 hoặc không phải nấc 0.5 — validator từ chối và không lưu báo cáo thành công.
- ASR timeout khi tạo transcript cho Speaking — ghi lỗi `ai_status = 'failed'`, bài nộp giữ nguyên.
- Học viên yêu cầu chấm lại bài đã chấm thành công — hệ thống trả về kết quả cached, không gọi AI, không trừ hạn mức.
- Học viên hết hạn mức chấm AI trong ngày — hệ thống từ chối với thông báo hết quota; không gọi API.

## 7. Quy tắc nghiệp vụ

- **BR-AGI-001 [AS-BUILT]**: Chỉ học viên sở hữu bài nộp (`user_id === req.user.id`) mới có thể yêu cầu chấm AI cho bài đó.
- **BR-AGI-002 [AS-BUILT]**: Hệ thống PHẢI kiểm tra ngưỡng từ tối thiểu (Task 1 ≥ 50 từ, Task 2 ≥ 100 từ) trước khi tiêu tốn hạn mức hoặc gọi AI.
- **BR-AGI-003 [AS-BUILT]**: Nếu bài nộp đã có báo cáo chấm thành công trong `ai_grading_reports`, hệ thống trả về kết quả đã lưu (Idempotency) mà không gọi lại LLM Provider và không trừ hạn mức.
- **BR-AGI-004 [AS-BUILT]**: Báo cáo Writing PHẢI bao gồm đủ 4 tiêu chí (`taskAchievementOrResponse`, `coherenceCohesion`, `lexicalResource`, `grammarRangeAccuracy`), `improvedVersion`, `error_highlights` và `suggestions`.
- **BR-AGI-005 [AS-BUILT]**: Báo cáo Speaking PHẢI bao gồm đủ 4 tiêu chí (`fluencyCoherence`, `lexicalResource`, `grammaticalRangeAccuracy`, `pronunciation`).
- **BR-AGI-006 [AS-BUILT]**: Điểm tổng hợp Writing PHẢI tính theo trọng số 33% Task 1 + 67% Task 2 và làm tròn theo quy tắc IELTS nấc 0.5. Điểm tổng của nhà cung cấp không được tin tưởng và bị tính lại ở backend.
- **BR-AGI-007 [AS-BUILT]**: Mọi cuộc gọi dịch vụ AI PHẢI lưu vết token và latency vào bảng `ai_usage_logs`.
- **BR-AGI-008 [AS-BUILT]**: Khi chấm AI thất bại, hệ thống PHẢI lưu báo cáo trạng thái `failed` và giữ bài nộp ở trạng thái `pending` thay vì xóa hoặc chuyển ngầm sang Giảng viên.
- **BR-AGI-009 [AS-BUILT]**: Kết quả AI được gắn nhãn `AI Estimated Band`; không phải điểm IELTS chính thức. Điểm AI và điểm Giảng viên lưu ở cột riêng biệt, không ghi đè lẫn nhau.
- **BR-AGI-010 [NEEDS CLARIFICATION]**: Chính sách hoàn trả hạn mức khi tất cả lần thử kết thúc ở lỗi nhà cung cấp/hạ tầng chưa được phê duyệt.

## 8. Yêu cầu chức năng

- **FR-AGI-001 [AS-BUILT]**: API Chấm điểm AI Writing (`POST /api/v1/submissions/writing/:submissionId/ai-grade`) PHẢI xác minh quyền sở hữu (`user_id === req.user.id`) trước khi xử lý.
- **FR-AGI-002 [AS-BUILT]**: Hệ thống PHẢI kiểm tra ngưỡng từ tối thiểu (Task 1 ≥ 50, Task 2 ≥ 100) trước khi tiêu tốn hạn mức AI.
- **FR-AGI-003 [AS-BUILT]**: Hệ thống PHẢI kiểm tra Idempotency: nếu đã có báo cáo `status = 'completed'` cho submission đó trong `ai_grading_reports`, trả về kết quả đã lưu kèm `meta.cached = true` và không gọi lại LLM Provider.
- **FR-AGI-004 [AS-BUILT]**: Báo cáo Writing PHẢI bao gồm 4 tiêu chí IELTS, `improvedVersion`, `error_highlights` và `suggestions`.
- **FR-AGI-005 [AS-BUILT]**: Báo cáo Speaking PHẢI bao gồm 4 tiêu chí IELTS Speaking bao gồm `pronunciation`.
- **FR-AGI-006 [AS-BUILT]**: Điểm tổng hợp AI Writing PHẢI tính theo trọng số 33% Task 1 + 67% Task 2 và làm tròn nấc 0.5 tại backend; giá trị điểm tổng từ nhà cung cấp bị bỏ qua.
- **FR-AGI-007 [AS-BUILT]**: Mọi cuộc gọi dịch vụ AI PHẢI lưu vết nhật ký token và latency vào `ai_usage_logs`.
- **FR-AGI-008 [AS-BUILT]**: Khi chấm AI thất bại, hệ thống PHẢI lưu báo cáo `status = 'failed'` trong `ai_grading_reports` và giữ bài nộp ở `status = 'pending'`; không xóa bài hoặc chuyển bài sang Giảng viên.
- **FR-AGI-009 [AS-BUILT]**: Khi hoàn tất chấm (thành công hoặc thất bại), hệ thống PHẢI phát sự kiện Socket.io (`grading_completed` hoặc `grading_failed`) đến channel của `userId`.
- **FR-AGI-010 [AS-BUILT]**: Khi Speaking thiếu transcript, backend PHẢI tự động kích hoạt ASR (với timeout đã cấu hình) để tạo transcript trước khi chấm.
- **FR-AGI-011 [AS-BUILT]**: Hệ thống PHẢI hỗ trợ cấu hình nhà cung cấp AI (OpenAI GPT / Google Gemini) theo biến môi trường mà không cần sửa code business logic.
- **FR-AGI-012 [AS-BUILT]**: Mọi API response PHẢI tuân thủ envelope `{ success, data, error, meta }`.

## 9. Yêu cầu phi chức năng

- **NFR-AGI-001 [AS-BUILT]**: Mọi endpoint chấm AI phải xác thực JWT và xác minh quyền sở hữu bài nộp trước khi xử lý.
- **NFR-AGI-002 [AS-BUILT]**: Nhật ký và đo lường không được chứa nội dung bài làm thô, prompt thô, hoặc thông tin xác thực nhà cung cấp.
- **NFR-AGI-003 [AS-BUILT]**: Kết quả JSON từ LLM Provider PHẢI được bóc tách bằng Regex/String Parsing trong try-catch; không tin tưởng JSON thô trực tiếp.
- **NFR-AGI-004 [TARGET]**: 100% lần chấm lặp lại cho bài nộp đã chấm thành công trả về kết quả Cached trong dưới 200ms.
- **NFR-AGI-005 [TARGET]**: Thời gian chấm AI Writing (đồng bộ) dưới 30 giây ở điều kiện mạng bình thường; bằng chứng đo lường chưa có.

## 10. Thực thể chính

- **Báo cáo Chấm AI (ai_grading_reports)**: Bảng lưu kết quả điểm 4 tiêu chí, feedback, raw response và trạng thái chấm (`completed` / `failed`).
- **Nhật ký Sử dụng AI (ai_usage_logs)**: Bảng lưu số token tiêu thụ, nhà cung cấp, model, latency và chi phí ước tính mỗi lần gọi.

## 11. Tiêu chí thành công

- **SC-AGI-001 [AS-BUILT]**: 100% bài nộp dưới ngưỡng từ tối thiểu bị từ chối trước khi tiêu tốn hạn mức AI hoặc gọi LLM Provider.
- **SC-AGI-002 [TARGET]**: 100% lần chấm lặp lại cho bài nộp đã chấm thành công trả về kết quả Cached trong dưới 200ms.
- **SC-AGI-003 [AS-BUILT]**: 100% sự cố chấm AI thất bại không làm mất bài nộp của học viên trong cơ sở dữ liệu.
- **SC-AGI-004 [AS-BUILT]**: 100% điểm tổng hợp AI được làm tròn chuẩn nấc 0.5 theo quy tắc IELTS và tính tại backend (không tin điểm tổng từ nhà cung cấp).
- **SC-AGI-005 [AS-BUILT]**: 100% lỗi AI ghi bản ghi `status = 'failed'` trong `ai_grading_reports` và không tự động chuyển bài sang hàng đợi Giảng viên.

## 12. Giả định

- Wrapper AI Provider (`gradeWriting`, `gradeSpeakingGroup`) thuộc `ai-fast-grading` sẵn sàng và có thể gọi.
- Bảng `ai_grading_reports` và `ai_usage_logs` đã tồn tại trong cơ sở dữ liệu.
- Socket.io server đã cấu hình và sẵn sàng phát sự kiện theo `userId`.
- Biến môi trường cấu hình nhà cung cấp AI đã được thiết lập; giá trị mặc định trong `.env.example` không phải bằng chứng của cấu hình production thực tế.

## 13. Phụ thuộc

- Wrapper AI Provider (`ai-fast-grading`) — phải sẵn sàng trước khi kiểm thử luồng chấm AI.
- Socket.io server và channel routing theo `userId`.
- Schema PostgreSQL cho `ai_grading_reports`, `ai_usage_logs`.
- Dịch vụ ASR (Speech-to-Text) với timeout đã cấu hình cho Speaking.

## 14. Câu hỏi mở

1. **BR-AGI-010**: Đơn vị hạn mức AI có bị tiêu tốn khi tất cả lần thử kết thúc ở lỗi nhà cung cấp/hạ tầng không, và nếu không thì được hoàn trả tại trạng thái chuyển nào?
2. Ngưỡng timeout ASR cho Speaking (hiện là 45 giây theo code) có phải là giá trị được phê duyệt cho production không?
3. Cơ chế retry tự động khi LLM Provider trả về lỗi tạm thời (5xx, timeout) — số lần retry và backoff hiện tại có phải giá trị đã được Product Owner phê duyệt không?
