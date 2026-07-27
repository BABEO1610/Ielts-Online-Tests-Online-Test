# Implementation Checklist: Giao diện Thi Reading (feat-reading-ui)

**Purpose**: Kiểm tra toàn bộ các hạng mục trước khi merge feat-reading-ui
**Created**: 2026-07-27
**Feature**: [SPEC.md](./SPEC.md) | [PLAN.md](./PLAN.md) | [TASKS.md](./TASKS.md)

## Prerequisites (từ feat-listening-ui)

- [x] CHK001 `ReviewModal.jsx` và `Bottom Nav Bar` đã hoàn thành và export đúng interface
- [x] CHK002 `TimerBar.jsx` và `AutoSubmitModal.jsx` đã hoàn thành và export đúng interface
- [x] CHK003 `attempt.service.js` (frontend) có `submitAttempt(testId, payload)`

## Split View Layout

- [x] CHK004 Layout dùng CSS Grid 2 cột (passage trái / câu hỏi phải)
- [x] CHK005 Pane trái có `overflow-y: auto` — cuộn độc lập
- [x] CHK006 Pane phải có `overflow-y: auto` — cuộn độc lập
- [x] CHK007 Cuộn pane trái KHÔNG kéo pane phải cuộn theo
- [x] CHK008 Cuộn pane phải KHÔNG kéo pane trái cuộn theo
- [x] CHK009 Trên tablet (768–1023px): layout stack vertical (passage trên / câu hỏi dưới)

## MCQ Questions

- [x] CHK010 Chọn đáp án MCQ → `answers` state cập nhật đúng
- [x] CHK011 Điều hướng qua lại → MCQ selection vẫn giữ nguyên
- [x] CHK012 `ReviewModal` và Bottom Nav Bar highlight đúng câu MCQ đã chọn
- [x] CHK012b `ReviewModal` click câu hỏi → Tự động switch sang đúng Passage tab tương ứng

## Fill-in-blank Questions

- [x] CHK013 `<input>` controlled — liên kết 2 chiều với `answers` state
- [x] CHK014 Nhập text vào câu 5, điều hướng đến câu 10, quay lại câu 5 → text vẫn còn
- [x] CHK015 `ReviewModal` và Bottom Nav Bar highlight đúng câu fill-in-blank đã có text
- [x] CHK016 Input rỗng khi submit → gửi lên backend dưới dạng `""` (empty string), không crash

## Submit Flow

- [x] CHK017 Payload `{ answers, timeSpent, practiceMode }` chứa đủ câu đã điền
- [x] CHK018 `onTimeUp` từ `TimerBar` trigger submit tự động (kèm AutoSubmitModal)
- [x] CHK019 Nút "Nộp bài" disabled sau lần submit đầu
- [x] CHK020 Submit thành công → redirect trang kết quả
- [x] CHK021 Submit lỗi → toast lỗi, không redirect, nút re-enable

## UI / UX

- [x] CHK022 Layout hiển thị đúng trên Desktop (≥ 1024px) không bị overflow
- [x] CHK023 Passage dài (> 1000 từ) scroll mượt, không lag
- [x] CHK024 Không dùng thư viện split-pane ngoài — CSS thuần
- [x] CHK025 Hiển thị Loading Skeleton mượt mà trong lúc gọi API lấy đề thi
- [x] CHK026 Render đúng `blockContent` (hình ảnh/biểu đồ) phía trên danh sách câu hỏi của block đó

## Notes

- CHK001–CHK003 phải pass trước khi bắt đầu implement feature này
- CHK007–CHK008 là acceptance test chính của User Story 1
- CHK014 là acceptance test chính của User Story 2
- Hiện tại chưa có file Unit Test frontend nào (Vitest), mọi thứ đều được test bằng Manual Test.
