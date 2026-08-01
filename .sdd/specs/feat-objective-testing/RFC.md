# PHÂN TÍCH TỔNG QUAN KIẾN TRÚC VÀ LUỒNG DỮ LIỆU TÍNH NĂNG THI TRẮC NGHIỆM (OBJECTIVE TESTING)

Tài liệu này tổng hợp toàn bộ luồng dữ liệu của tính năng thi trắc nghiệm (Reading & Listening), từ giao diện Frontend cho đến xử lý chấm điểm và lưu trữ lịch sử ở Backend.

---

## 1. Luồng Giao Diện Bài Thi Reading (Reading UI)
Trang thi Reading có độ phức tạp về mặt hiển thị văn bản (Passage) rất cao. Kiến trúc đòi hỏi việc quản lý Layout chặt chẽ để học viên có trải nghiệm thi trên máy tính mượt mà nhất.

### 1.1. Container Component: Trái tim điều phối State & Layout
**File:** `frontend/src/pages/objective-testing/ReadingTestPage.jsx`
- **Vai trò:** Trang chính kết nối API lấy đề, quản lý State (`answers`, `activePassage`), và nộp bài.
- **Data Parser:** Chứa hàm `flattenTestData` để băm nhỏ và chuẩn hóa chuỗi dữ liệu JSON khổng lồ từ Backend.
- **Split-View Layout:** Tận dụng CSS thuần (`display: grid` hoặc `flex`) để chia đôi màn hình.
  - Trái: Nội dung đoạn văn (Reading Passage) với thuộc tính `overflow-y: auto`.
  - Phải: Danh sách câu hỏi (Questions) với thuộc tính `overflow-y: auto` độc lập.
- **Bottom Navigation:** Hiển thị 3 Passage (hoặc ít hơn tùy cấu hình). Click chuyển tab sẽ đổi giá trị `activePassage`, thay đổi toàn bộ nội dung render ở cả 2 cột.

### 1.2. Shared Components: Sức mạnh của Dumb Components
Các Component này được tái sử dụng 100% từ nhánh `feat-listening-ui`, chứng minh năng lực thiết kế kiến trúc chuẩn mực.
- **File:** `components/objective-testing/TimerBar.jsx`
  - Đếm ngược thời gian. Khởi chạy luồng Auto-Submit khi về 0.
- **File:** `components/objective-testing/AutoSubmitModal.jsx`
  - Khóa màn hình khi hết giờ.
- **File:** `components/objective-testing/ReviewModal.jsx`
  - Modal hiển thị bảng lưới 40 câu hỏi. Bôi màu câu đã làm (dựa vào prop `answers`). Hỗ trợ nhúng Callback điều hướng ngược.

### 1.3. API Service Layer
- **File:** `services/test.service.js`
  - Hàm `getTestById(id)`: Chạy ngay trong `useEffect` lúc trang vừa load để fetch đề thi (passages, blocks, questions) từ Server.
- **File:** `services/attempt.service.js`
  - Hàm `submitAttempt(testId, payload)`: Gửi đáp án cuối cùng và thời gian làm bài (`timeSpent`) lên Server chấm tự động.

---

## 2. Luồng Giao Diện Bài Thi Listening (Listening UI)
Kiến trúc UI được thiết kế theo mô hình Component-Based (Tách biệt UI và Logic), với Container Component `ListeningTestPage` đóng vai trò "Trái tim" điều phối toàn bộ State và kết nối với Backend qua Service.

### 2.1. Container Component: Trái tim điều phối State
**File:** `frontend/src/pages/objective-testing/ListeningTestPage.jsx`
- **Vai trò:** Là trang chính, nắm giữ các Global State của bài thi như: `answers` (đáp án người dùng), `testData` (cấu trúc đề thi fetch từ API), `activeSection` (Tab Part 1, 2, 3, 4 hiện tại), `isSubmitting` (khóa nút nộp bài).
- **Audio Sticky:** Gắn chặt (sticky) Component `<AudioPlayer>` lên đỉnh màn hình để học viên luôn nghe được âm thanh dù cuộn đọc câu hỏi ở bất kỳ đâu.
- **Bottom Navigation:** Hiển thị 4 Part. Khi click chuyển Part, state `activeSection` thay đổi, giao diện sẽ chỉ render các câu hỏi thuộc Part đó (tối ưu DOM thay vì render cả 40 câu cùng lúc).
- **Submit Flow:** Tính toán thời gian làm bài thực tế bằng `Math.round((Date.now() - startTime) / 1000)` thay vì dựa vào Timer (vì Timer đếm lùi có thể bị trình duyệt cho "ngủ đông" khi user sang Tab khác). Sau đó gọi API qua Service và điều hướng sang trang kết quả.

### 2.2. Shared Components: Tái sử dụng tối đa (DRY Principle)
Các Component này được thiết kế tách biệt (Dumb Components) để dùng chung cho cả màn hình Reading (`feat-reading-ui`).
- **File:** `components/objective-testing/TimerBar.jsx`
  - Đếm ngược thời gian (setInterval). Nhận prop `onTimeUp` từ trang chính. Khi thời gian về 0, nó gọi ngược lên trang chính để kích hoạt luồng tự động nộp bài.
- **File:** `components/objective-testing/AutoSubmitModal.jsx`
  - Một Modal cực kỳ đơn giản, không có nút tắt. Chỉ bật lên che toàn bộ màn hình khi hết giờ với thông báo "Hệ thống đang nộp bài...", khóa hành vi click của user.
- **File:** `components/objective-testing/ReviewModal.jsx`
  - Modal hiển thị bảng lưới (grid) 40 câu hỏi. Đọc prop `answers` để bôi màu câu nào đã làm, câu nào chưa.
  - Kèm theo hàm `onNavigate` để khi bấm vào 1 ô, nó gọi ngược lên trang chính kích hoạt hàm `scrollToQuestion`.

### 2.3. Renderer Component: Trình diễn nội dung câu hỏi
**File:** `components/tutor/listening/ListeningBlockRenderer.jsx`
- **Vai trò:** Render giao diện tương tác thực tế (Radio button cho Multiple Choice, Input text cho Fill-in-blank).
- **Kiến trúc:** Thay vì viết cứng vào `ListeningTestPage`, Component này được import từ nhánh `tutor`. Điều này giúp hệ thống tái sử dụng được UI render câu hỏi cho cả luồng Học viên thi và luồng Giáo viên xem trước (Preview) đề thi.

### 2.4. API Service Layer
**File:** `services/attempt.service.js`
- Đóng gói logic gọi API Axios bằng hàm `submitAttempt(testId, payload)`. Trả về đúng format để UI trang chính không cần bận tâm đến cấu trúc HTTP (Xử lý Abstraction).

---

## 3. Luồng Nộp Bài Và Chấm Điểm (Grading & Submission)
Luồng nộp bài và chấm điểm được thiết kế theo kiến trúc 3 lớp (3-Tier Architecture): **Route -> Controller -> Service -> Database**.

### 3.1. Tầng Routing: Nơi tiếp nhận Request
**File:** `backend/src/routes/api/v1/tests.js`
- **Logic:** Request `POST /api/v1/tests/:id/attempts` chạm vào hệ thống sẽ đi qua file này đầu tiên.
- **Security Check:** Route này được bảo vệ bởi middleware `authenticate`. Middleware này giải mã JWT Token, trích xuất thông tin người dùng và gắn vào `req.user`. Chặn việc một user giả mạo ID để nộp bài hộ người khác (IDOR).

### 3.2. Tầng Controller: Người gác cổng (Gatekeeper)
**File:** `backend/src/controllers/attempt.controller.js` (Hàm `submitAttempt`)
- **Nhiệm vụ 1: Trích xuất Dữ liệu.** Lấy `testId` từ URL params và `userId` **chỉ lấy từ `req.user.id`** (tuyệt đối không lấy từ `req.body` để bảo mật).
- **Nhiệm vụ 2: Data Validation.** Kiểm tra Type của payload. Đảm bảo `answers` phải là một Object (`typeof answers === 'object' && !Array.isArray(answers)`), `timeSpent` phải là số không âm. Nếu sai, lập tức chặn đứng và trả về `400 INVALID_PAYLOAD`.
- **Nhiệm vụ 3: Điều phối.** Gọi xuống hàm `submitAttempt` ở tầng Service.
- **Nhiệm vụ 4: Format Response.** Định dạng dữ liệu trả về theo đúng chuẩn chung của toàn dự án: `{ success, data, error, meta }`. Bắt lỗi từ Service (qua `error.statusCode`) để trả về HTTP Status Code tương ứng (400, 404, 500).

### 3.3. Tầng Service: Trái tim của Logic Chấm Điểm (Core Engine)
**File:** `backend/src/services/attempt.service.js`
Đây là nơi chứa toàn bộ "chất xám" nghiệp vụ của tính năng này. Luồng chạy tuần tự như sau:
1. **Verify Test:** Query bảng `mock_tests` để lấy thông tin skill (Reading/Listening). Throw `404` nếu test không tồn tại.
2. **Fetch Questions:** Lấy TOÀN BỘ câu hỏi của bài thi từ bảng `questions` (`WHERE test_id = $1`) và ép buộc sắp xếp `ORDER BY q.question_order ASC`.
3. **Grading Loop (Chấm điểm từng câu):** Lặp qua mảng câu hỏi, đối chiếu đáp án user gửi lên với đáp án trong DB.
   - Hàm `normalizeAnswer`: Trim 2 đầu -> Lowercase -> Dùng Regex gọt bỏ các dấu câu (`.,;:!?'"-`) thừa ở 2 đầu -> Dùng Regex gộp các khoảng trắng liên tiếp ở giữa thành 1 khoảng trắng duy nhất.
   - Hàm `isAnswerCorrect`: So sánh exact-match (khớp hoàn toàn) chuỗi đã normalize. Nếu đáp án trong DB là kiểu `JSONB` array (ví dụ: `["cars", "the cars"]`), hàm sẽ duyệt mảng (`.some()`) để check match từng phần tử.
4. **Scoring (Tính tổng điểm):**
   - Cộng dồn số câu đúng (`rawScore`).
   - Xử lý Scale điểm: Đưa điểm thô về hệ quy chiếu chuẩn 40 câu: `Math.round((rawScore / totalQuestions) * 40)`.
5. **Database Transaction (BEGIN -> COMMIT/ROLLBACK):**
   - Mở 1 Pool Client Transaction.
   - `INSERT` kết quả tổng quan vào bảng `test_attempts` (Lấy ra được `attemptId`).
   - Chạy vòng lặp `INSERT` các bản ghi vào bảng `attempt_answers` chứa kết quả chi tiết từng câu.
   - Gọi `COMMIT` để lưu vĩnh viễn. Nếu catch được lỗi (đứt mạng, lỗi syntax), lập tức gọi `ROLLBACK`.

### 3.4. Tầng Utilities: Mapping Điểm IELTS
**File:** `backend/src/utils/scoring.js` (Hàm `getBandScore`)
- Dựa trên `scaledRawScore` và `skill`, hệ thống gọi hàm tra cứu (Lookup table) để ra Band Score (từ 0.0 - 9.0).
- Barem cứng cho Reading Academic và Listening (Ví dụ: Reading đúng 30 câu được Band 7.0, Listening đúng 30 câu được Band 7.0, nhưng Listening đúng 32 câu được 7.5, Reading cần 33 câu mới được 7.5).

---

## 4. Luồng Truy Xuất Lịch Sử Và Chi Tiết Bài Thi (Test History & Details)
Tính năng lịch sử bài thi không hề đơn giản là một câu `SELECT * FROM table`. Nó đòi hỏi sự phân tách rạch ròi giữa việc tải dữ liệu Tổng quan (nhẹ) và dữ liệu Chi tiết (rất nặng).

### 4.1. Tầng Routing (Backend)
**File:** `backend/src/routes/api/v1/attempts.routes.js`
- Route này định nghĩa 3 Endpoints tách biệt rạch ròi, tất cả đều được bọc bởi middleware `authenticate` (bắt buộc đăng nhập):
  - `GET /` -> Lấy danh sách toàn bộ lịch sử.
  - `GET /:attemptId` -> Lấy Metadata (Điểm số, thời gian) của 1 bài cụ thể.
  - `GET /:attemptId/detail` -> Lấy toàn bộ 40 câu hỏi, đáp án đã chọn, đáp án đúng, giải thích chi tiết.

### 4.2. Tầng Controller (Backend)
**File:** `backend/src/controllers/attempt.controller.js`
- **Hàm `getHistory`:** Đóng vai trò Data Aggregator (Trạm gom dữ liệu). Gọi xuống 2 Service khác nhau để lấy lịch sử Trắc nghiệm và Tự luận. Ánh xạ (Map) chúng về chung 1 format rồi Sort theo ngày nộp bài mới nhất trả về cho Client.
- **Hàm `getAttempt` & `getAttemptDetail`:** Chặn lỗi IDOR bằng cách trích xuất `userId = req.user.id` và truyền xuống Service. Bắt lỗi (Catch) nếu không tìm thấy bài thi thì trả 404.

### 4.3. Tầng Service (Backend)
**File:** `backend/src/services/attempt.service.js`
- **Hàm `getAttemptHistory`:** Câu lệnh SQL truy vấn bảng `test_attempts` có `JOIN` nhẹ sang bảng `mock_tests` để lấy tên đề thi (Title).
- **Hàm `getAttemptById`:** Truy vấn 1 dòng duy nhất lấy điểm số.
- **Hàm `getAttemptDetail`:** Thực hiện Heavy JOIN. Kết nối bảng `attempt_answers` (câu user đã làm) với bảng `questions` (để lấy đề gốc và cột `explanation`).

### 4.4. Tầng API Service (Frontend)
**File:** `frontend/src/services/attempt.service.js`
- Đóng gói 3 hàm tương ứng bằng thư viện `Axios`. Kẹp sẵn Header Authorization (JWT Token) vào mọi Request. Xử lý chuẩn hóa Response thành `{ success, data, error }`.

### 4.5. Pages & Components (Frontend)
- **File `TestHistoryPage.jsx`:** Component gọi API `getHistory` lúc `useEffect`. Xử lý hiển thị danh sách (List View). Nhờ Backend đã gộp sẵn Objective và Subjective, màn hình này chỉ việc lặp (Map) ra UI cực kỳ nhàn hạ.
- **File `TestResultDetailPage.jsx`:**
  - Vừa mount lên, nó bắn đồng thời (hoặc tuần tự) 2 API: lấy Meta Điểm số và lấy Detail 40 câu.
  - Xử lý UX phức tạp: Hiển thị giao diện Accordion (Mở rủ xuống). Khi bấm vào câu trả lời sai, nó rủ xuống hiển thị đoạn văn bản giải thích `explanation` tại sao sai. Đòi hỏi quản lý State đóng/mở cho từng Item.
