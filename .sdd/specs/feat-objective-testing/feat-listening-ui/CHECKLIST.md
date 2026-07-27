# Implementation Checklist: Giao diện Thi Listening (feat-listening-ui)

**Purpose**: Kiểm tra toàn bộ các hạng mục cần hoàn thành trước khi merge feat-listening-ui
**Created**: 2026-07-27
**Feature**: [SPEC.md](./SPEC.md) | [PLAN.md](./PLAN.md) | [TASKS.md](./TASKS.md)

- [x] CHK001 `ReviewModal.jsx` popup render lưới 40 câu hỏi, chia theo Parts, cho phép lọc và click cuộn tới câu
- [x] CHK002 `Bottom Nav Bar` điều hướng các Section/Part cho từng trang bài thi
- [x] CHK003 `TimerBar.jsx` đếm ngược (Simulation) hoặc đếm tiến (Practice), dừng đúng lúc
- [x] CHK004 `TimerBar.jsx` gọi `onTimeUp()` callback đúng 1 lần khi về 0

## Audio Player

- [x] CHK005 Audio Player ẩn controls (Simulation) hoặc hiện đủ Play/Pause/Seek/Rewind 10s (Practice)
- [x] CHK006 Audio tự phát (Simulation) hoặc KHÔNG tự phát (Practice) khi trang load
- [x] CHK007 Audio KHÔNG tự chuyển sang section tiếp theo khi kết thúc
- [x] CHK008 Audio phát đúng URL từ data đề thi

## State Management

- [x] CHK009 Chọn đáp án MCQ → `answers` state cập nhật đúng `{ questionId: option }`
- [x] CHK010 Điều hướng qua lại giữa câu hỏi → answers state KHÔNG bị mất
- [x] CHK011 `ReviewModal` và `Bottom Nav Bar` phản ánh đúng câu nào đã có trong `answers`

## Submit Flow

- [x] CHK012 Nút "Nộp bài" gọi `submitAttempt(testId, { answers, timeSpent, practiceMode })` với đúng payload
- [x] CHK013 `onTimeUp` tự động hiển thị `AutoSubmitModal` và gọi `submitAttempt` sau 2s
- [x] CHK014 Nút "Nộp bài" bị disabled sau lần submit đầu (tránh double-submit)
- [x] CHK015 Submit thành công → redirect sang trang kết quả
- [x] CHK016 Submit thất bại (network error) → hiển thị toast lỗi, không redirect

## API Contract

- [x] CHK017 `GET /api/v1/tests/:id` trả đủ `questions[]`, `audioUrl`, `timeLimit`
- [x] CHK018 `POST /api/v1/tests/:id/attempts` nhận đúng body `{ answers: {} }`
- [x] CHK019 Không gửi `correct_answer` lên hoặc lưu ở Frontend

## UI / UX

- [x] CHK020 Layout hiển thị đúng trên Desktop (≥ 1024px)
- [x] CHK021 Layout hiển thị đúng trên Tablet (768px – 1023px)
- [x] CHK022 Không có lag visible khi click qua lại 40 câu hỏi

## Notes

- Check items off khi hoàn thành: `[x]`
- CHK001–CHK004 là prerequisite cho `feat-reading-ui` — ưu tiên hoàn thành trước
- Đã cập nhật spec để test đúng với payload có chứa `timeSpent` và `practiceMode`.
- Hiện tại chưa có file Unit Test frontend nào trong project (Vitest). Mọi thứ đều được check bằng Manual Test.
