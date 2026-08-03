# Đặc tả tính năng: Giao diện Thi Reading (feat-reading-ui)

**Ngày tạo**: 2026-07-27
**Trạng thái**: Draft
**Phân loại**: Mỗi mục quy chuẩn được gắn nhãn `AS-BUILT`, `TARGET`, hoặc `NEEDS CLARIFICATION`.

## 1. Tổng quan tính năng và bối cảnh nghiệp vụ

IELTSZone cung cấp trang thi Reading với giao diện Split View 2 pane: bên trái hiển thị passage, bên phải hiển thị câu hỏi — hai pane cuộn độc lập. Học viên điền câu trả lời đa dạng loại (MCQ, fill-in-blank, True/False/NG, Matching, Short Answer) và đáp án được giữ nguyên trong local state khi điều hướng giữa các câu. Hỗ trợ Partial Practice (chọn từng Passage), Bottom Navigation, và ReviewModal tái sử dụng từ `feat-listening-ui`. Đồng hồ đếm ngược và auto-submit được dùng chung component `TimerBar` từ Listening.

**Input**: Tách từ User Story 2 của `feat-objective-testing/SPEC.md`.

## 2. Phạm vi

- Split View 2 cột: pane trái (passage), pane phải (câu hỏi) — cuộn độc lập qua CSS `overflow-y: auto`.
- Hỗ trợ đa dạng loại câu hỏi: MCQ, Multi-select, True/False/NG, Matching, Short Answer, Fill-in-blank.
- Persistent local state cho toàn bộ đáp án trong session.
- Partial Practice: chọn từng Passage qua `selectedPartIds`.
- Bottom Navigation Bar: chuyển nhanh giữa các Passage đang làm.
- ReviewModal: khi click câu hỏi, hệ thống tự switch sang đúng Passage chứa câu đó.
- blockContent rendering: hiển thị hình ảnh/biểu đồ phía trên nhóm câu hỏi tương ứng.
- Loading Skeleton khi tải đề và error boundary xử lý crash an toàn.
- Tái sử dụng `ReviewModal`, `AutoSubmitModal`, `TimerBar` từ `feat-listening-ui`.

## 3. Ngoài phạm vi

- Backend chấm điểm và lưu kết quả (thuộc `feat-auto-grading`).
- Trang xem lại lịch sử và kết quả (thuộc `feat-attempt-history`).
- Giao diện Reading trên Mobile < 768px — ngoài scope v1.
- Auto-save draft vào localStorage.
- Audio player (thuộc `feat-listening-ui`).

## 4. Tác nhân và tóm tắt phân quyền

| Tác nhân | Hành vi được phép |
|---|---|
| Học viên đã xác thực | Truy cập trang thi, chọn Passage, làm bài, và nộp bài. |
| Khách / chưa xác thực | Không được phép — trang thi yêu cầu được đăng nhập trước khi vào. |
| Giảng viên / Admin | Không tương tác trực tiếp với giao diện này trong luồng học viên. |


## 5. Câu chuyện người dùng và kiểm thử độc lập

### User Story 1 - Split View đọc bài và làm câu hỏi (Priority: P1)

Là một học viên, tôi muốn giao diện Reading chia đôi màn hình: bên trái là bài đọc (passage), bên phải là danh sách câu hỏi — hai bên cuộn hoàn toàn độc lập nhau.

**Why this priority**: Yêu cầu UX cốt lõi của IELTS Reading — không có Split View thì học viên phải cuộn lên xuống liên tục gây mất tập trung. Ngoài ra hỗ trợ Partial Practice để học viên chọn làm 1 vài Passage nhất định.

**Independent Test**: Render `ReadingTestPage` với mock passage và câu hỏi, cuộn pane trái → pane phải đứng yên và ngược lại.

**Acceptance Scenarios**:

1. **Given** màn hình thi Reading với passage dài, **When** học viên cuộn văn bản bên trái, **Then** pane câu hỏi bên phải KHÔNG cuộn theo.
2. **Given** học viên đang nhìn câu hỏi số 10, **When** cuộn bài đọc để tìm đoạn liên quan, **Then** câu hỏi vẫn hiển thị đúng vị trí ở pane phải.

---

### User Story 2 - Điền từ vào ô trống (fill-in-blanks) (Priority: P1)

Là một học viên, tôi muốn nhập câu trả lời văn bản vào các ô fill-in-blank và nội dung đã nhập phải được giữ lại khi tôi điều hướng qua lại giữa các câu hỏi.

**Why this priority**: Dạng câu hỏi fill-in-blank chiếm tỷ lệ lớn trong IELTS Reading — state phải bền vững trong session.

**Independent Test**: Nhập text vào câu fill-in-blank số 5, click sang câu 10, click lại câu 5 → text vẫn còn trong `<input>`.

**Acceptance Scenarios**:

1. **Given** học viên điền "migration" vào câu 5, **When** chuyển sang câu 8, **Then** quay lại câu 5 vẫn thấy "migration" trong ô input.
2. **Given** học viên điền xong 5 câu fill-in-blank, **When** bấm "Nộp bài", **Then** payload `answers` gửi lên backend chứa đủ 5 giá trị text.

---

## 6. Trường hợp biên

- Màn hình tablet dọc (< 1024px): Stack vertical — passage trên, câu hỏi dưới (không side-by-side).
- Passage rất dài (> 1000 từ): Pane trái scroll mượt, không freeze UI.
- Submit khi có câu fill-in-blank rỗng → Submit bình thường, backend chấm sai cho câu đó.

## 7. Quy tắc nghiệp vụ

- **BR-READ-001 [AS-BUILT]**: Pane trái (passage) và pane phải (câu hỏi) PHẢI cuộn độc lập — scroll một pane không được ảnh hưởng pane kia.
- **BR-READ-002 [AS-BUILT]**: Đáp án fill-in-blank PHẢI được giữ nguyên khi học viên điều hướng qua lại giữa các câu hỏi trong cùng session.
- **BR-READ-003 [AS-BUILT]**: Khi click câu hỏi trong ReviewModal thuộc Passage khác với Passage đang hiển, hệ thống PHẢI tự switch sang Passage đúng rồi mới scroll tới câu.
- **BR-READ-004 [AS-BUILT]**: Submit rỗng hoặc có câu fill-in-blank trống được chấp nhận bình thường — backend chấm sai cho câu đó, frontend không cảnh báo.
- **BR-READ-005 [AS-BUILT]**: Trên màn hình < 1024px: stack vertical — passage trên, câu hỏi dưới (không side-by-side).
- **BR-READ-006 [AS-BUILT]**: `ReviewModal`, `AutoSubmitModal`, và `TimerBar` được tái sử dụng từ `feat-listening-ui` — không tự viết lại.
- **BR-READ-007 [AS-BUILT]**: blockContent (hình ảnh, biểu đồ) phải hiển thị ngay phía trên câu đầu tiên của block tương ứng — không hiển tách rời.
- **BR-READ-008 [AS-BUILT]**: Mọi lỗi parse cấu trúc dữ liệu phải được catch an toàn — không được crash toàn bộ trang.

## 8. Yêu cầu chức năng


### Functional Requirements

- **FR-001**: Hệ thống MUST hiển thị layout Split View 2 cột với scroll độc lập (CSS `overflow-y: auto` trên mỗi pane).
- **FR-002**: Hệ thống MUST render passage HTML/text ở pane trái.
- **FR-003**: Hệ thống MUST hỗ trợ render và quản lý state cho đa dạng loại câu hỏi (MCQ, Multi-select, True/False/NG, Matching, Short Answer, Fill-in-blank) ở pane phải.
- **FR-004**: Hệ thống MUST hiển thị Bottom Navigation Bar để chuyển nhanh giữa các Passage đang làm (dựa trên `selectedPartIds`), và `ReviewModal` (mở từ TimerBar) cung cấp lưới tổng quan các câu có trạng thái. Khi click câu hỏi trong ReviewModal, hệ thống tự động switch sang đúng Passage chứa câu đó.
- **FR-005**: Hệ thống MUST tái sử dụng `ReviewModal`, `AutoSubmitModal` và `TimerBar` từ `feat-listening-ui`.
- **FR-006**: Hệ thống MUST gọi `submitAttempt(testId, { answers, timeSpent, practiceMode })` khi hết giờ hoặc học viên bấm "Nộp bài".
- **FR-007**: Hệ thống MUST xử lý hiển thị Loading Skeleton trong lúc gọi API lấy đề thi, và handle crash an toàn (catch-all) khi parse cấu trúc dữ liệu.
- **FR-008**: Hệ thống MUST render nội dung phụ của câu hỏi (blockContent) như hình ảnh, biểu đồ ở ngay phía trên câu đầu tiên của block tương ứng.

## 9. Yêu cầu phi chức năng

- **NFR-READ-001 [AS-BUILT]**: Cuộn pane trái không làm pane phải dịch chuyển (kiểm tra bằng scroll event isolation).
- **NFR-READ-002 [AS-BUILT]**: Fill-in-blank giữ đúng giá trị sau khi điều hướng qua lại 10 lần.
- **NFR-READ-003 [AS-BUILT]**: Layout Split View hiển thị đúng trên màn hình 1024px+ không bị overflow.
- **NFR-READ-004 [TARGET]**: Payload submit chứa đúng và đủ tất cả câu đã điền (MCQ + fill-in-blank).
- **NFR-READ-005 [AS-BUILT]**: Passage dài (> 1000 từ): pane trái scroll mượt, không freeze UI.

## 10. Thực thể chính

- **`answers`**: Object local state `{ [questionId]: string | option | array }` — hỗ trợ tất cả các dạng câu hỏi.
- **Split View panes**: Hai div với `height: 100vh`, `overflow-y: auto` — CSS Grid 2 cột.
- **`ReviewModal` & `Bottom Nav Bar`** (shared): Điều hướng và Highlight câu đã điền / chưa điền.

## 11. Tiêu chí thành công

### Measurable Outcomes

- **SC-001**: Cuộn pane trái không làm pane phải dịch chuyển (kiểm tra bằng scroll event isolation).
- **SC-002**: Fill-in-blank giữ đúng giá trị sau khi điều hướng qua lại 10 lần.
- **SC-003**: Layout Split View hiển thị đúng trên màn hình 1024px+ không bị overflow.
- **SC-004**: Payload submit chứa đúng và đủ tất cả câu đã điền (MCQ + fill-in-blank).

## 12. Giả định

- `ReviewModal.jsx`, `AutoSubmitModal.jsx` và `TimerBar.jsx` đã hoàn thành từ `feat-listening-ui`.
- API `GET /api/v1/tests/:id/take` trả về cả passage text và danh sách câu hỏi đa dạng loại.
- API `POST /api/v1/tests/:id/attempts` nhận đồng nhất payload `{ answers, timeSpent, practiceMode }`.
- Học viên dùng Desktop hoặc Tablet — mobile < 768px ngoài scope v1.

## 13. Phụ thuộc

- **`feat-listening-ui`**: Cung cấp `ReviewModal.jsx`, `AutoSubmitModal.jsx`, `TimerBar.jsx` — sử dụng lại, không viết mới.
- **`feat-auto-grading`**: Cung cấp `POST /api/v1/tests/:id/attempts` — endpoint submit bài.
- **`GET /api/v1/tests/:id/take`**: API trả về cả passage text và danh sách câu hỏi đa dạng loại.
- **`useLocation().state`**: React Router truyền `practiceMode`, `customTimeLimit`, `selectedPartIds` vào component.

## 14. Câu hỏi mở

1. **NEEDS CLARIFICATION**: Khi ReviewModal mở và học viên click câu thuộc Passage khác, có cần animation chuyển Passage hay switch ngay lập tức?
2. **NEEDS CLARIFICATION**: Nếu `blockContent` là null/undefined cho một block, component render gì — bỏ qua im lặng hay hiển placeholder?
3. **NEEDS CLARIFICATION**: Tablet dọc (768px – 1023px) có dùng layout stack vertical hay vẫn split horizontal?
