# Implementation Checklist: Lịch sử & Tra cứu Kết quả (feat-attempt-history)

**Purpose**: Kiểm tra toàn bộ các hạng mục trước khi merge feat-attempt-history
**Created**: 2026-07-27
**Feature**: [SPEC.md](./SPEC.md) | [PLAN.md](./PLAN.md) | [TASKS.md](./TASKS.md)

## Prerequisites

- [x] CHK001 `GET /api/v1/attempts` gọi thành công, filter `user_id`, trả về data list (Merge cả Objective & Subjective)
- [x] CHK002 `GET /api/v1/attempts/:attemptId` gọi thành công, trả về summary
- [x] CHK003 `GET /api/v1/attempts/:attemptId/detail` gọi thành công, trả về full chi tiết từng câu kèm `explanation`

## History Page (`TestHistoryPage`)

- [x] CHK004 Render table/danh sách đủ các cột cơ bản (Tên bài, Band Score, Ngày nộp, Mode)
- [x] CHK005 Hiển thị cả bài thi Trắc nghiệm (Objective) và Tự luận (Subjective)
- [x] CHK006 Click vào một lượt thi → redirect sang kết quả
- [x] CHK007 Hiển thị empty state thân thiện nếu danh sách rỗng (Kèm nút đi làm bài)
- [x] CHK008 Hỗ trợ filter qua select box `?skill=reading` / `listening`

## Detail Page (`TestResultDetailPage`)

- [x] CHK009 Render list dạng Accordion hiển thị từng câu hỏi với đáp án của học viên và đáp án đúng
- [x] CHK010 Highlight rõ ràng: background xanh (Đúng), background đỏ (Sai)
- [x] CHK011 Hiển thị text giải thích (`explanation`) khi mở rộng dòng câu hỏi
- [x] CHK012 Tổng kết nhanh (VD: 34/40 câu đúng) ở đầu trang

## Performance & Security

- [x] CHK013 Lịch sử load < 500ms ngay cả khi có 100+ attempts
- [x] CHK014 Chi tiết attempt load < 800ms
- [x] CHK015 Middleware auth chặn dứt điểm Request không có token hoặc sai `user_id` (IDOR test passed)

## Notes

- CHK015 cực kỳ quan trọng để đảm bảo bảo mật dữ liệu học viên
- Các component Frontend hiện chưa có Unit Tests (Vitest) mà test bằng tay trên trình duyệt.blank screen khi loading
