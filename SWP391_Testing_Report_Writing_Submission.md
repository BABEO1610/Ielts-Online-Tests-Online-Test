# Báo cáo Kiểm thử Tự động - Môn SWP391

**Thành viên thực hiện:** [Điền tên của bạn]
**Công cụ sử dụng:** Playwright
**Phương pháp:** Data-Driven Testing (Kiểm thử hướng dữ liệu)

---

## 1. Giới thiệu Module được chọn (Selected Module)

- **Tên Module:** Writing Submission (Hệ thống nộp bài thi Viết)
- **Mức độ (Size):** Trung bình (Medium) - Đáp ứng tiêu chí vì luồng xử lý bao gồm việc xác thực dữ liệu đầu vào phức tạp từ người dùng và tạo mới bản ghi trong cơ sở dữ liệu.
- **Mục tiêu chức năng:** Cho phép Student nhập nội dung bài Writing, chọn Task 1/Task 2, chọn phương thức chấm là AI hoặc Tutor, sau đó submit để hệ thống **INSERT một record mới vào bảng `writing_submissions`**.
- **Database Table chịu tác động:** `writing_submissions`.

---

## 2. Chi tiết cấu trúc Module (Đảm bảo yêu cầu định lượng của đề bài)

Để chứng minh module đạt tiêu chuẩn "Medium size", dưới đây là phân tích chi tiết các Items và Transactions:

### 2.1. Danh sách Items (9 items - Đạt yêu cầu 7 -> 15 items)
Các items này bao gồm các trường tương tác trên màn hình (Screen Components) và các trường tương ứng lưu trong Database:

| No. | Item | Loại | Ý nghĩa |
| :--- | :--- | :--- | :--- |
| 1 | `user_id` | DB field | Lấy ngầm từ session đăng nhập của Student |
| 2 | `test_id` | DB field / hidden | Gắn bài nộp với test hiện tại |
| 3 | `task_number` | UI + DB field | Dropdown chọn Task 1 hoặc Task 2 |
| 4 | `prompt_text` | UI + DB field | Hiển thị đề bài Writing (được lưu kèm submission nếu backend yêu cầu) |
| 5 | `response_text` | UI + DB field | Textarea để học viên nhập nội dung bài làm |
| 6 | `grader` | UI + DB field | Dropdown chọn người chấm 'ai' hoặc 'tutor' |
| 7 | `status` | DB field | Trạng thái mặc định là 'pending' |
| 8 | `submitted_at` | DB field | Thời điểm nộp bài |
| 9 | `created_at` | DB field | Thời điểm tạo record |

### 2.2. Danh sách Transactions (6 transactions - Đạt yêu cầu 3 -> 7 transactions)
*Pre-condition: Student đã đăng nhập thành công bằng tài khoản hợp lệ.*

Danh sách các transactions chính thức diễn ra bên trong phạm vi module Writing Submission:
1. **Load Writing Submission Page:** Student mở màn hình nộp bài Writing.
2. **Load Writing Prompt Transaction:** Hệ thống tải thông tin `test_id` và `prompt_text` của bài Writing tương ứng.
3. **Select Task Transaction:** Student thao tác chọn Task 1 hoặc Task 2.
4. **Input Response Transaction:** Student nhập nội dung bài làm vào trường `response_text`.
5. **Select Grader Transaction:** Student thao tác chọn phương thức chấm bài là `ai` hoặc `tutor`.
6. **Submit & Database Access Transaction:** Student bấm Submit, backend thực hiện validate dữ liệu và INSERT record mới vào bảng `writing_submissions` nếu dữ liệu hợp lệ.

---

## 3. Dữ liệu Kiểm thử (Test Data)

Sử dụng phương pháp kiểm thử hướng dữ liệu (Data-Driven) với 5 kịch bản (rows). 

| Row | Case ID | Task Number | Response Text (Bài làm) | Grader | Expected Result | Lý do / Ý nghĩa |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **TC_WS_01** | `1` | `[PW-TC_WS_01] The chart illustrates...` | `ai` | **Success** | Nhập đầy đủ, dữ liệu hoàn toàn hợp lệ |
| **2** | **TC_WS_02** | `2` | `[PW-TC_WS_02] Some people believe...` | `tutor` | **Success** | Nhập đầy đủ, dữ liệu hoàn toàn hợp lệ |
| **3** | **TC_WS_03** | `1` | *(Bỏ trống)* | `ai` | **Failed** | Bỏ trống trường bắt buộc `response_text` |
| **4** | **TC_WS_04** | *(Không chọn)* | `[PW-TC_WS_04] This essay...` | `tutor` | **Failed** | Không chọn Task Number trên giao diện |
| **5** | **TC_WS_05** | `2` | `[PW-TC_WS_05] Valid essay...` | *(Bỏ trống)* | **Failed** | Bỏ trống trường bắt buộc `grader` |

### Danh sách Succeeded rows (Các dòng nộp thành công)
| Case ID | Actual UI Result | Actual DB Result |
| :--- | :--- | :--- |
| **TC_WS_01** | Hiển thị success message | Có record trong `writing_submissions`, status = pending |
| **TC_WS_02** | Hiển thị success message | Có record trong `writing_submissions`, status = pending |

### Danh sách Failed rows (Các dòng nộp thất bại)
*(Lưu ý: Failed rows ở đây nghĩa là dữ liệu nhập không hợp lệ nên hệ thống phải chặn lại. Vì hệ thống chặn đúng theo thiết kế nên Playwright test case thực tế là "Pass").*

| Case ID | Actual UI Result | Actual DB Result |
| :--- | :--- | :--- |
| **TC_WS_03** | Hiển thị lỗi thiếu bài làm | Không có record mới được tạo |
| **TC_WS_04** | Hiển thị lỗi chưa chọn task | Không có record mới được tạo |
| **TC_WS_05** | Hiển thị lỗi thiếu grader | Không có record mới được tạo |

---

## 4. Những thay đổi cần thực hiện trong dự án để chạy Test

Để kịch bản Playwright có thể chạy ổn định và bao phủ hết các case, dự án cần áp dụng (hoặc đã áp dụng) các điểm sau:

1. **Frontend (Cấu trúc Dropdown & Data Test ID):**
   - Dropdown `task_number` và `grader` **cần có option placeholder `value=""`** để kiểm thử các trường hợp người dùng bỏ trống dữ liệu (dành cho `TC_WS_04` và `TC_WS_05`):
     ```html
     <select data-testid="task-number">
       <option value="">Select task</option>
       <option value="1">Task 1</option>
       <option value="2">Task 2</option>
     </select>
     <select data-testid="grader">
       <option value="">Select grader</option>
       <option value="ai">AI</option>
       <option value="tutor">Tutor</option>
     </select>
     ```
   - Gắn thêm thuộc tính `data-testid` cho các element khác như: `emailInput`, `passwordInput`, `response-text`, `submit-writing`, `success-message`, `error-message`.
2. **Backend (Bổ sung Validation):** Backend cần chặn dữ liệu rác trước khi thực hiện câu lệnh Insert:
   - Check `response_text` không rỗng.
   - Check `task_number` phải thuộc tập hợp hợp lệ (1 hoặc 2).
   - Check `grader` phải là `ai` hoặc `tutor`.
3. **Môi trường Test (.env.test):** Cần thiết lập đầy đủ biến môi trường:
   - `BASE_URL`
   - `DATABASE_URL`
   - `STUDENT_EMAIL`
   - `STUDENT_PASSWORD`
   - `WRITING_TEST_ID`

---

## 5. Hiện thực Kịch bản Kiểm thử Tự động (Playwright Implementation)

### 5.1. File dữ liệu (`tests/fixtures/writing-submission-data.json`)
```json
[
  { "caseId": "TC_WS_01", "taskNumber": "1", "responseText": "[PW-TC_WS_01] Valid essay for task 1...", "grader": "ai", "expected": "success" },
  { "caseId": "TC_WS_02", "taskNumber": "2", "responseText": "[PW-TC_WS_02] Valid essay for task 2...", "grader": "tutor", "expected": "success" },
  { "caseId": "TC_WS_03", "taskNumber": "1", "responseText": "", "grader": "ai", "expected": "failed" },
  { "caseId": "TC_WS_04", "taskNumber": "", "responseText": "[PW-TC_WS_04] Missing task number...", "grader": "tutor", "expected": "failed" },
  { "caseId": "TC_WS_05", "taskNumber": "2", "responseText": "[PW-TC_WS_05] Missing grader...", "grader": "", "expected": "failed" }
]
```

### 5.2. Mã nguồn Playwright Test (`tests/writing-submission.spec.js`)

```javascript
import { test, expect } from "@playwright/test";
import { Client } from "pg";
import testData from "./fixtures/writing-submission-data.json" assert { type: "json" };
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

async function getDbClient() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  return client;
}

test.describe("Writing Submission Module - Automated Testing", () => {
  
  // Cleanup dữ liệu cũ trước khi chạy test để tránh sai sót rowCount
  test.beforeAll(async () => {
    const client = await getDbClient();
    await client.query(`DELETE FROM writing_submissions WHERE response_text LIKE '[PW-TC\\_WS\\_%' ESCAPE '\\'`);
    await client.end();
  });

  // Pre-condition: Login
  test.beforeEach(async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/login`);
    await page.getByTestId("emailInput").fill(process.env.STUDENT_EMAIL);
    await page.getByTestId("passwordInput").fill(process.env.STUDENT_PASSWORD);
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL(/dashboard/);
  });

  for (const row of testData) {
    test(`[${row.caseId}] - Expect form submission to be: ${row.expected}`, async ({ page }) => {
      const client = await getDbClient();

      // Đếm số lượng record TRƯỚC KHI submit để assert cho các case failed
      const beforeCountRes = await client.query(
        `SELECT COUNT(*)::int AS count FROM writing_submissions WHERE user_id = (SELECT id FROM users WHERE email = $1)`,
        [process.env.STUDENT_EMAIL]
      );
      const beforeCount = beforeCountRes.rows[0].count;

      // Transaction 1 & 2: Load Page & Load Prompt
      await page.goto(`${process.env.BASE_URL}/writing/submit?testId=${process.env.WRITING_TEST_ID}`);

      // Transaction 3, 4 & 5: Nhập liệu lên UI
      // Dùng ?? "" để ép điền chuỗi rỗng nếu bỏ trống, và phụ thuộc vào option value="" trên UI
      await page.getByTestId("task-number").selectOption(row.taskNumber ?? "");
      await page.getByTestId("response-text").fill(row.responseText ?? "");
      await page.getByTestId("grader").selectOption(row.grader ?? "");

      // Transaction 6: Submit Form & DB Access
      await page.getByTestId("submit-writing").click();

      if (row.expected === "success") {
        await expect(page.getByTestId("success-message")).toBeVisible();
        
        // Assert Database: Phải có 1 record được tạo ra với prefix test hiện tại
        const dbResult = await client.query(
          `SELECT status, grader FROM writing_submissions WHERE response_text LIKE $1`,
          [`[PW-${row.caseId}]%`]
        );
        expect(dbResult.rowCount).toBe(1); 
        expect(dbResult.rows[0].status).toBe("pending");
      } else {
        await expect(page.getByTestId("error-message")).toBeVisible();
        
        // Assert Database: KHÔNG ĐƯỢC PHÉP tăng số lượng record
        const afterCountRes = await client.query(
          `SELECT COUNT(*)::int AS count FROM writing_submissions WHERE user_id = (SELECT id FROM users WHERE email = $1)`,
          [process.env.STUDENT_EMAIL]
        );
        const afterCount = afterCountRes.rows[0].count;
        expect(afterCount).toBe(beforeCount); // Xác nhận record không tăng
      }
      await client.end();
    });
  }
});
```

---

## 6. Hướng dẫn Demo với Giảng viên (Script Thuyết Trình)

### Bước 1: Trình bày sự đáp ứng tiêu chí
*"Thưa thầy, em phụ trách kiểm thử Module Writing Submission. Module này cho phép Student submit bài Writing và tạo record mới trong database. Cấu trúc module của em có 9 items (field DB và UI) cùng 6 transactions thực tế bên trong module (từ lúc load màn hình nộp bài đến khi DB thực thi câu lệnh SQL INSERT)."*

### Bước 2: Show code Data-Driven & Điều kiện Test
*Mở file báo cáo phần 3: Dữ liệu Kiểm thử.*
*"Em sử dụng phương pháp Data-Driven với 5 dòng dữ liệu. Có 2 dòng hợp lệ (Success rows) và 3 dòng cố tình nhập sai hoặc thiếu dữ liệu (Failed rows). Để test các case cố tình không chọn dropdown, giao diện em đã thêm các option placeholder (value rỗng). Em cũng chạy script dọn dẹp Database (cleanup) trước khi chạy để kết quả luôn chính xác tuyệt đối."*

### Bước 3: Chạy Test và Show HTML Report (Minh họa trực quan)
*Chạy lệnh `npx playwright test --reporter=html` và mở report.*

*(Chèn ảnh screenshot Playwright HTML Report tại đây)*

*"Tất cả 5 tests đều Pass. Đặc biệt ở các dòng Failed, trạng thái Pass trên report chứng minh rằng **Hệ thống đã bắt lỗi và chặn thành công dữ liệu không hợp lệ**, bảo vệ database khỏi dữ liệu rác."*

### Bước 4: Mở Database chứng minh tính toàn vẹn (Bằng chứng thép)
*Mở DB Terminal và chạy lệnh:*

```sql
SELECT 
  id,
  task_number,
  grader,
  status,
  LEFT(response_text, 40) AS preview,
  submitted_at
FROM writing_submissions
WHERE response_text LIKE '[PW-TC\_WS\_%' ESCAPE '\'
ORDER BY submitted_at DESC;
```

*(Chèn ảnh screenshot kết quả truy vấn SQL tại đây)*

*"Kết quả truy vấn chứng minh: Chỉ có đúng 2 record của `TC_WS_01` và `TC_WS_02` được INSERT thành công vào Database. Các dữ liệu rác từ các test case thất bại hoàn toàn không được ghi nhận."*

---

## 7. Tổng kết (Conclusion)
Kỹ thuật assert chéo (Cross-assertion) giữa giao diện người dùng (UI Error/Success Messages) và cơ sở dữ liệu giúp chứng minh luồng nộp bài Writing hoạt động đúng với các kịch bản kiểm thử đã chọn. Các dữ liệu hợp lệ được insert thành công vào bảng `writing_submissions`, trong khi các dữ liệu không hợp lệ đã bị chặn lại ở cả tầng logic frontend và backend, không tạo ra các bản ghi rác trong cơ sở dữ liệu.
