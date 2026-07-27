# RFC: Exam Builder System (feat-exam-builder)

**Tài liệu chuẩn bị bảo vệ trước Hội đồng chuyên môn**
**Ngày cập nhật:** 2026-07-27

---

## 1. Phân Tích Luồng Hệ Thống Theo Từng File (Source Code Flow Analysis)

Hệ thống Exam Builder (Tạo/Sửa đề thi) là một trong những module có cấu trúc dữ liệu phân cấp (Hierarchical Data) phức tạp nhất dự án. Luồng dữ liệu đi từ giao diện React xuống tầng Database qua các file sau:

### 1.1. Frontend Layer (React)
*   **`src/services/test.service.js`**: Lớp API Client (dùng Axios). Đóng gói toàn bộ payload JSON phức tạp từ các form và gọi lên endpoint của backend.
*   **`pages/tutor/TutorTestFormPage.jsx`**: Một "Wrapper" Component (Higher-Order-like Component). Làm nhiệm vụ điều hướng, quản lý state chung (title, description, timer) và render ra các Form đặc thù tùy theo kỹ năng (Reading/Listening/Writing/Speaking).
*   **`pages/tutor/TutorReadingFormPage.jsx` (và các form kỹ năng khác)**: Quản lý cấu trúc dữ liệu theo phân cấp `Passages -> Blocks -> Questions`. Chứa logic validate form cơ bản trước khi submit.
*   **`components/tutor/reading/SmartModeBlockEditor.jsx`**: Component siêu việt của Frontend, cho phép Tutor dán raw text (văn bản thô) và sử dụng Regex/Parsing logic để tự động bóc tách thành các đoạn văn, ô trống, và gen ra JSON cấu trúc câu hỏi.
*   **`components/tutor/reading/QuestionBlockEditor.jsx`**: Component quản lý 1 "nhóm" câu hỏi (VD: nhóm câu hỏi Matching, nhóm Multiple Choice). 
*   **`components/tutor/BulkAddModal.jsx`**: Hỗ trợ dán hàng loạt đáp án/câu hỏi từ Excel/Word để gen ra state array nhanh chóng.

### 1.2. Backend Layer (Node.js & Express)
*   **`src/routes/api/v1/tests.js`**: Định nghĩa các API endpoint (`POST /tests`, `PUT /tests/:id`). Cấu hình Middleware phân quyền (chỉ Tutor/Admin mới được C/U/D).
*   **`src/controllers/testController.js`**: Nhận request, bóc tách `req.body` và lấy `userId` từ token (`req.user.id`). Gọi service xử lý và trả về HTTP 201/200 kèm `testId`.
*   **`src/services/test.service.js`**: **Trái tim của tính năng**. Nơi xử lý chuỗi thao tác Database phức tạp (sẽ phân tích kỹ ở Mục 2). Biến đổi JSON thô từ client thành các Record quan hệ (Relational DB) bằng SQL thuần.
*   **`src/services/audit.service.js`**: Dependency. Mỗi khi tạo/sửa đề thi thành công, `test.service` sẽ gọi sang đây để lưu vết lịch sử (Ai tạo, tạo đề gì, IP nào).

### 1.3. Bản Đồ Chức Năng (Feature Mapping & Giải thích chi tiết)
Dưới đây là "Cheat sheet" để bạn biết ngay cần mở file nào, hàm nào khi hội đồng yêu cầu review, kèm theo giải thích chi tiết cách hệ thống hoạt động:

**1. Tạo Đề Thi (Create)**
- **UI (React)**: `TutorReadingFormPage.jsx` (thu thập input từ form).
- **API Call**: `test.service.js` (Frontend) -> `createTest()` đóng gói thành JSON.
- **Backend**: `POST /api/v1/tests` -> `testController.createTest()` -> `test.service.js` (Backend) -> `createReadingTest()`.
- **Cách hoạt động**: Khi Tutor điền form, Frontend tạo ra một JSON Object lớn chứa toàn bộ cấu trúc đề thi đa tầng (metadata, passages, blocks, questions). Khi Submit, hàm `createReadingTest` mở SQL Transaction, `INSERT` dữ liệu vào bảng `mock_tests` để lấy `testId`. Sau đó dùng vòng lặp lồng nhau (nested loops) để `INSERT` tiếp vào `test_passages`, `question_blocks` và `questions`. Cuối cùng gọi `audit.service` để ghi log tạo đề.

**2. Cập Nhật Đề Thi (Update)**
- **UI (React)**: Component tương tự form Create, nhưng khi mount sẽ gọi API `GET` để nạp dữ liệu cũ vào form state.
- **API Call**: `test.service.js` (Frontend) -> `updateTest()`.
- **Backend**: `PUT /api/v1/tests/:id` -> `testController.updateTest()` -> `test.service.js` -> `updateReadingTest()`.
- **Cách hoạt động**: Frontend ném toàn bộ cấu trúc JSON mới (đã chỉnh sửa) xuống Backend. Để giải quyết bài toán đồng bộ phức tạp (diffing - tìm xem câu nào mới, câu nào cũ), hàm `updateReadingTest` dùng chiến thuật **Delete & Re-insert**: Đầu tiên `UPDATE` các trường cơ bản của đề thi (title, description), sau đó `DELETE` sạch toàn bộ dữ liệu con (passages, blocks, questions) cũ trong DB, và cuối cùng `INSERT` lại toàn bộ data mới từ cục JSON gửi lên. Tất cả diễn ra trong 1 Transaction an toàn tuyệt đối.

**3. Xóa Đề Thi (Delete)**
- **UI (React)**: Bấm nút Xóa ở màn hình `TutorTestManagePage.jsx`.
- **API Call**: `test.service.js` (Frontend) -> `deleteTest(id)`.
- **Backend**: `DELETE /api/v1/tests/:id` -> `testController.deleteTest()` -> `test.service.js` -> `deleteTest()`.
- **Cách hoạt động**: Do database đã được thiết kế Khóa ngoại (Foreign Key) với ràng buộc `ON DELETE CASCADE` từ bảng cha `mock_tests` xuống các bảng con, backend chỉ cần thực hiện 1 câu lệnh `DELETE FROM mock_tests WHERE id = $1`. Database PostgreSQL sẽ tự động quét và xóa sạch các passages, blocks, questions liên quan. Hàm service cũng lấy snapshot dữ liệu trước khi xóa để lưu vào Audit Log làm bằng chứng hoàn tác.

**4. Bulk Insert (Thêm hàng loạt câu hỏi/đáp án)**
- **UI & Logic (React)**: `BulkAddModal.jsx` nằm trên Frontend.
- **Backend**: *Không có API xử lý riêng cho chức năng này.*
- **Cách hoạt động**: Chức năng này thuần túy là Logic xử lý giao diện (UX). Khi Tutor dán (paste) 10 đáp án từ Word/Excel vào ô text, component React sẽ bắt sự kiện thay đổi (`rawText`). Hệ thống sử dụng Hook `useMemo` gọi đến các hàm parser như `parseBulkText()` (nằm ở `utils/questionParser.js`) để tự động bóc tách chuỗi thành array chứa 10 object câu hỏi tương ứng. Khi bấm nút, hàm `handleConfirm()` sẽ gom mảng này đẩy ngược lên Form cha. 10 câu hỏi này sau đó sẽ được hòa chung vào cục JSON bự để gọi API Create/Update như bình thường.

**5. Smart Mode (Tự động Parse Text)**
- **UI & Logic (React)**: `SmartModeBlockEditor.jsx`.
- **Backend**: *Không có API xử lý riêng.*
- **Cách hoạt động**: Tương tự Bulk Insert, đây là logic parsing siêu việt tại Frontend. Tutor paste một đoạn văn bản thô có chứa các placeholder quy ước (VD: `...is called a [#1], and...`). Hook của React sẽ chạy biểu thức chính quy (Regex) quét toàn bộ văn bản, bóc tách ra phần nào là chữ (Text), phần nào là lỗ hổng điền từ (Blank). Nó gen ra cấu trúc HTML đặc thù và tự động sinh ra mảng các input nhập đáp án trên giao diện. Khi Submit, JSON hoàn thiện đẩy xuống Backend mà Backend không cần biết văn bản thô ban đầu trông như thế nào.

---

## 2. Phần Xử Lý Khó Nhất: Nested Transaction Database (`updateReadingTest`)

Nếu hội đồng hỏi phần nào "khoai" nhất trong Exam Builder, hãy tự tin trả lời: **Logic cập nhật cấu trúc đề thi đa tầng bằng Raw SQL Transaction trong `test.service.js` (Hàm `updateReadingTest`)**.

### 2.1. Tại sao nó khó?
Dữ liệu của một đề thi IELTS không phẳng (flat). Nó có cấu trúc phân cấp sâu 4 tầng:
`Test (Đề thi) -> Test Passages (Đoạn văn) -> Question Blocks (Nhóm câu hỏi) -> Questions (Câu hỏi lẻ)`.
*   Vì team quyết định **KHÔNG DÙNG ORM** (như Prisma/Sequelize) mà dùng truy vấn SQL thuần (`pg`), việc insert/update dữ liệu 4 tầng này đỏi hỏi phải quản lý vòng lặp lồng nhau (nested loops).
*   Ta phải Insert cha -> Lấy `RETURNING id` của cha -> Dùng làm khóa ngoại (Foreign Key) để Insert con.
*   **Rủi ro:** Nếu insert đến câu hỏi thứ 40 mà database đứt kết nối hoặc lỗi ràng buộc (constraint), 39 câu trước đó, đoạn văn, và đề thi sẽ trở thành "Rác" (Orphan data) trong hệ thống nếu không quản lý tốt.

### 2.2. Giải phẫu Logic xử lý (Cách giải quyết)
Hệ thống sử dụng **Database Transaction (`BEGIN` ... `COMMIT` / `ROLLBACK`)** kết hợp kỹ thuật **"Delete & Re-insert"**.

**Bước 1: Validation và Snapshot**
Kiểm tra xem tất cả câu hỏi đã có đáp án đúng chưa (chặn không cho publish nếu thiếu). Lấy `oldSnapshot` để chuẩn bị ghi Audit Log.

**Bước 2: Mở Transaction & Khóa an toàn**
```javascript
const client = await pool.connect();
await client.query('BEGIN');
```
Từ lúc này, mọi thao tác DB đều là "tạm thời". Nếu có bất kỳ Exception nào quăng ra, hàm catch sẽ gọi `client.query('ROLLBACK')` - xóa sạch mọi dấu vết lỗi.

**Bước 3: Update Test & Xóa dữ liệu con cũ (Delete & Re-insert Strategy)**
Thay vì đi đọ (diff) xem câu hỏi nào bị sửa, câu nào bị xóa (rất tốn tài nguyên và code cực kỳ phức tạp), giải pháp thông minh là:
```javascript
await client.query(`UPDATE mock_tests SET ... WHERE id = $1`);
await client.query(`DELETE FROM questions WHERE test_id = $1`);
await client.query(`DELETE FROM test_passages WHERE test_id = $1`);
```
*Ghi chú: Lệnh xóa `test_passages` có thể trigger CASCADE DELETE xóa luôn `question_blocks` tùy thiết kế DB, nhưng xóa tường minh theo `test_id` đảm bảo sạch sẽ.*

**Bước 4: Re-insert với Nested Loops**
Sử dụng mảng JSON truyền từ Frontend, chạy vòng lặp lồng nhau 3 cấp:
1.  Loop `passages` -> Dùng `INSERT ... RETURNING id` để lấy `passageId`.
2.  Bên trong Loop 1, Loop `blocks` -> Truyền `passageId` vào -> `INSERT ... RETURNING id` lấy `blockId`.
3.  Bên trong Loop 2, Loop `questions` -> Truyền `blockId`, serialize JSONB cho `options` và `correctAnswers` -> `INSERT`.

**Bước 5: Chốt hạ (COMMIT) & Ghi Audit**
```javascript
await client.query('COMMIT');
```
Nếu mã chạy đến đây, 100% dữ liệu đã nhất quán. Hệ thống gọi `AuditLogService` theo mô hình try-catch best-effort để ghi nhận lịch sử.

---

## 3. 10 Câu Hỏi Giả Lập Từ Hội Đồng Chuyên Môn (Kèm Trả Lời)

**Q1: Tại sao team em chọn dùng Raw SQL (pg) để insert một cấu trúc JSON sâu 4 tầng thay vì dùng ORM như Prisma/TypeORM cho nhàn?**
> **Trả lời:** Đây là quyết định Trade-off (đánh đổi). Dùng Raw SQL tốn công code các vòng lặp lồng nhau, nhưng bù lại team em kiểm soát được 100% câu lệnh chạy xuống DB. Khi đề thi có hàng trăm câu hỏi, việc dùng ORM có thể sinh ra hàng trăm câu query N+1 ẩn bên dưới làm chết DB. Với Raw SQL, em tối ưu được việc dùng Transaction, kiểm soát thứ tự thực thi, và tiết kiệm bộ nhớ cho Node.js khi không phải gen ra các Object Model cồng kềnh.

**Q2: Giải thích kỹ thuật "Delete & Re-insert" trong hàm `updateReadingTest`. Tại sao em không update từng dòng?**
> **Trả lời:** Đề thi IELTS thường xuyên bị Tutor thay đổi thứ tự câu, xóa câu giữa, hoặc gộp đoạn văn. Nếu đọ (diff) JSON từ Frontend với DB để tìm ra câu nào Update, câu nào Insert, câu nào Delete thì logic code sẽ cực kỳ phức tạp (O(n²) complexity) và dễ sinh bug. Thay vào đó, em dùng kỹ thuật Update bảng gốc, và `DELETE` sạch toàn bộ bảng con (passages, blocks, questions) cũ, rồi `INSERT` lại mảng JSON mới. Việc này chạy trong Transaction nên cực kỳ an toàn, nhanh, và logic code rất đơn giản, dễ bảo trì.

**Q3: Nếu đang chạy vòng lặp Insert đến câu hỏi số 35 thì mạng Database bị đứt hoặc sai kiểu dữ liệu, hệ thống xử lý sao? Rác dữ liệu nằm ở đâu?**
> **Trả lời:** Hoàn toàn KHÔNG có rác dữ liệu. Nhờ vào lệnh `await client.query('BEGIN')`, mọi thao tác từ đầu đều nằm trên RAM của Database. Khi gặp lỗi, luồng code nhảy vào `catch (error)`, tại đây em gọi `await client.query('ROLLBACK')`. Lệnh này báo Database hủy toàn bộ thay đổi của transaction này. DB vẫn vẹn nguyên như chưa từng có cuộc gọi API nào xảy ra.

**Q4: Cột `options` (đáp án trắc nghiệm) và `correctAnswers` trong bảng `questions` dùng kiểu dữ liệu gì trong Database? Tại sao?**
> **Trả lời:** Em dùng kiểu `JSONB`. Bởi vì các loại câu hỏi rất đa dạng: Multiple Choice cần mảng string `["A", "B", "C"]`, Matching cần object mapping, Fill-in-the-blank cần mảng các text linh hoạt. Cố gắng thiết kế bảng (table) rời cho Options sẽ làm phình to quan hệ DB. `JSONB` cho phép lưu mảng/object linh hoạt, lại hỗ trợ Index (GIN index) nên tốc độ đọc/ghi tối ưu hơn kiểu TEXT thường.

**Q5: Ở Frontend, em thiết kế "SmartModeBlockEditor" bằng cách nào để biến một đoạn Text thô thành JSON cấu trúc câu hỏi gửi xuống Backend?**
> **Trả lời:** Em sử dụng Regular Expression (Regex) tại Frontend. Các Tutor khi paste text sẽ dùng một quy ước đánh dấu (Convention), ví dụ `[#1]`, `[#2]` cho các chỗ điền khuyết. Regex sẽ scan đoạn text này, bóc tách ra đoạn nào là văn bản, đoạn nào là số hiệu câu hỏi, từ đó gen ra một mảng Objects (Blocks và Questions) đẩy vào Redux/State trước khi ném nguyên cục JSON đó xuống Backend.

**Q6: Backend nhận một request rất lớn chứa toàn bộ đề thi, có sợ bị timeout không?**
> **Trả lời:** Request tuy chứa nhiều thông tin nhưng bản chất text (JSON) rất nhẹ (chỉ khoảng vài chục KB đến vài trăm KB). Backend xử lý các vòng lặp Insert chỉ mất vài mili-giây trên PostgreSQL (đặc biệt khi dùng cùng 1 connection `pool`). Trừ khi chèn audio/video (files), còn text thuần thì tốc độ không bị nghẽn (bottleneck). Files âm thanh em đã tách luồng upload riêng lên Cloud Storage, và chỉ lưu `audio_url` vào bảng `mock_tests`.

**Q7: Giao tiếp giữa `test.service` và `audit.service` diễn ra thế nào? Lỗi audit có làm hỏng việc tạo đề không?**
> **Trả lời:** Dạ không ạ. Ở cuối hàm `createReadingTest` hoặc `updateReadingTest` (sau lệnh `COMMIT`), em gọi `AuditLogService.logAction(...)` bên trong một khối `try { ... } catch { console.warn() }`. Đây là thiết kế Best-effort. Lỗi của phụ hệ (Log) sẽ bị nuốt và in ra console, luồng chính vẫn return kết quả tạo đề thi thành công cho Frontend.

**Q8: Tại sao lúc Tutor tạo xong đề thi, trường `is_published` luôn bằng `false`? Muốn chuyển thành `true` phải làm sao?**
> **Trả lời:** Đây là luồng nghiệp vụ bảo đảm chất lượng. Tutor chỉ có quyền tạo bản nháp (Draft - `is_published: false`). Để thành `true`, đề thi phải qua luồng `ContentService` (Duyệt nội dung). Một user có role Admin phải vào xem đề, dùng hàm `reviewTest` để duyệt (approve). Lúc này trạng thái hiển thị mới được bật lên cho học sinh làm.

**Q9: Việc kiểm tra "Câu hỏi đã có đáp án chưa" được thực hiện ở đâu? Backend hay Frontend?**
> **Trả lời:** Thực hiện ở cả 2 nơi. Frontend chặn nút Submit để tăng trải nghiệm người dùng (UX). Nhưng Backend là chốt chặn bảo mật cuối cùng. Ngay đầu hàm service, em dùng vòng lặp duyệt qua toàn bộ `blocks` và `questions`, nếu phát hiện câu nào có `requiresManualAnswer === false` mà lại không có `correctAnswer` (string) hoặc `correctAnswers` (array), Backend lập tức ném lỗi 400 (Bad Request). 

**Q10: Nếu Tutor muốn lấy một bài đọc (Passage) từ Đề thi A để tái sử dụng sang Đề thi B thì cấu trúc Database hiện tại có hỗ trợ không?**
> **Trả lời:** Hiện tại thì chưa. Bảng `test_passages` đang có khóa ngoại cứng là `test_id` trỏ thẳng về bảng `mock_tests`. Nghĩa là 1 Passage thuộc về duy nhất 1 Test. Để tái sử dụng, kiến trúc sau này cần chuyển đổi sang mô hình Quan hệ Nhiều-Nhiều (Many-to-Many): Bảng `Passage_Bank` riêng, và bảng nối `Test_Passage_Mapping`. Tuy nhiên, với Sprint 1, để tối ưu tốc độ release (MVP) và đơn giản hóa logic C/U/D, em chọn thiết kế One-to-Many.
