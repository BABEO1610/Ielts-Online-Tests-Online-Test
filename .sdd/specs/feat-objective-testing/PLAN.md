# Kế hoạch Triển khai: Thi Trắc Nghiệm (feat-objective-testing)

**Nhánh**: `[feat-objective-testing]` | **Ngày**: 2026-07-24 | **Spec**: [SPEC.md](./SPEC.md)

**Đầu vào**: Feature specification từ `/specs/feat-objective-testing/SPEC.md`

## Tóm tắt (Summary)

Xây dựng trải nghiệm thi thử IELTS trọn vẹn từ lúc làm bài (Giao diện Listening/Reading), tới lúc tự động chấm bài (Auto-grading Engine), và tra cứu lại lịch sử (History Retrieval). Kiến trúc cần đảm bảo chia tách rõ Frontend (Quản lý state phức tạp, LocalStorage save nháp, đếm ngược) và Backend (Engine chấm điểm bảo mật không lộ đáp án, tính toán Band Score).

## Bối cảnh Kỹ thuật (Technical Context)

**Ngôn ngữ/Phiên bản**: Node.js 20, React 18
**Dependencies Chính**: Express 5.x, pg (PostgreSQL driver), Zustand (State Management)
**Lưu trữ**: PostgreSQL 16 (bảng `test_attempts`, `user_answers`)
**Kiểm thử**: Jest (Backend), Vitest (Frontend)
**Nền tảng Đích**: Web Browser (Desktop & Tablet)
**Loại Dự án**: Web Application (Frontend + Backend API)
**Mục tiêu Hiệu năng**: API `/api/v1/submissions` phản hồi < 1000ms
**Ràng buộc**: Không được gửi đáp án đúng xuống Frontend trước khi nộp bài
**Quy mô**: Hỗ trợ hàng ngàn bài thi đồng thời.

## Kiểm tra Hiến pháp (Constitution Check)

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Quy tắc DB**: Không sử dụng ORM (Tuân thủ: Dùng raw queries với `pg` driver cho bảng test_attempts).
- **Quy tắc API**: Mọi response bắt buộc tuân thủ format `{ success, data, error, meta }` (Tuân thủ).
- **Quy tắc Lỗi**: Xử lý lỗi tập trung qua middleware (Tuân thủ: Controller sẽ pass error qua `next(error)`).
- **Quy tắc Test**: Coverage tối thiểu 80% cho service layer (Tuân thủ: Bắt buộc test cho `submission.service.js`).

## Cấu trúc Dự án (Project Structure)

### Tài liệu (Documentation)

```text
specs/feat-objective-testing/
├── PLAN.md              # File này
├── SPEC.md              # Đặc tả tính năng
├── TASKS.md             # Danh sách công việc
└── CHECKLIST.md         # Biên bản QA
```

### Mã nguồn (Source Code)

```text
backend/
├── src/
│   ├── controllers/
│   │   ├── submission.controller.js  # Luồng nộp bài & chấm điểm
│   │   └── attempt.controller.js     # Luồng truy xuất lịch sử
│   ├── services/
│   │   ├── submission.service.js     # Xử lý logic Auto-Grading & Band Score
│   │   └── attempt.service.js        # Lấy lịch sử làm bài
│   ├── routes/
│   │   └── api/v1/
│   │       ├── submissions.routes.js
│   │       └── attempts.routes.js
└── tests/
    └── unit/
        └── submission.service.test.js

frontend/
├── src/
│   ├── pages/
│   │   └── objective-testing/
│   │       ├── ListeningTestPage.jsx
│   │       ├── ReadingTestPage.jsx
│   │       ├── TestHistoryPage.jsx
│   │       └── TestResultDetailPage.jsx
│   ├── components/
│   │   └── objective-testing/
│   │       ├── QuestionNavigation.jsx
│   │       └── TimerBar.jsx
│   └── stores/
│       └── useExamStore.js
```

**Quyết định Cấu trúc**: Cấu trúc Monorepo phân tách rõ `frontend` và `backend`. Backend chia module rõ ràng: `submission` chịu trách nhiệm ghi/chấm bài, `attempt` chịu trách nhiệm đọc lịch sử. Frontend quản lý tập trung ở thư mục `objective-testing`.

## Phân tách Độ phức tạp (Complexity Tracking)

| Vấn đề | Lý do cần thiết | Giải pháp thay thế đơn giản hơn đã bị loại |
|-----------|------------|-------------------------------------|
| Lưu nháp LocalStorage | Chống rớt mạng gây mất bài làm của học viên. | Chỉ lưu trên state (RAM). Bị loại vì refresh F5 sẽ mất toàn bộ 40 câu trả lời. |
| Auto-grading Regex/Trim | Học viên thi IELTS có thể gõ " Apples " thay vì "apples". | `===` exact match. Bị loại vì quá cứng nhắc, gây khó chịu cho trải nghiệm luyện thi. |
