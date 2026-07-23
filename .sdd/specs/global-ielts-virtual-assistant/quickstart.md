# Hướng dẫn xác minh nhanh: Trợ lý ảo IELTS toàn cục

**Mục đích**: Chứng minh hành vi hiện có theo từng lớp mà không ghi bí mật vào tài
liệu và không mặc nhiên tác động CSDL thật.

**Hợp đồng API**: [contracts/assistant-api.md](./contracts/assistant-api.md)

**Mô hình dữ liệu**: [data-model.md](./data-model.md)

## 1. Điều kiện tiên quyết

- Node.js 20+, npm 10+.
- Đã cài dependency trong `backend/` và `frontend/`.
- Chỉ khi chạy ứng dụng thật: sao chép [`.env.example`](../../../.env.example) thành
  `.env` cục bộ, rồi điền `DATABASE_URL`, cấu hình JWT/phiên và đúng một cấu hình
  provider hợp lệ. Không commit, chụp màn hình hoặc sao chép giá trị bí mật vào báo cáo.
- Chatbot dùng `AI_PROVIDER` + `AI_MODEL`; không dùng
  `AI_GRADING_PROVIDER` + `AI_GRADING_MODEL`.
- Migration 024 chỉ được chạy trên môi trường đã được ủy quyền và đã có bản sao lưu.

## 2. Xác minh hợp đồng tài liệu

Chạy từ thư mục gốc:

```powershell
Set-Location backend
node -e "const fs=require('fs'); const YAML=require('yaml'); YAML.parse(fs.readFileSync('../.sdd/specs/global-ielts-virtual-assistant/contracts/assistant.openapi.yaml','utf8')); console.log('OpenAPI YAML: OK')"
Set-Location ..
```

Kỳ vọng: in `OpenAPI YAML: OK`. Đây chỉ kiểm tra cú pháp YAML, không chứng minh API
đang chạy hoặc hợp đồng đã tuân bao phản hồi của Hiến chương.

## 3. Chạy hồi quy backend tập trung

```powershell
Set-Location backend
$assistantTests = @(
  (Get-ChildItem tests/unit/api -Filter 'assistant*.test.js' | ForEach-Object FullName)
  (Resolve-Path tests/unit/services/ai.service.test.js).Path
  (Resolve-Path tests/unit/services/aiUsage.service.test.js).Path
)
npm test -- --runTestsByPath $assistantTests
Set-Location ..
```

Đường cơ sở ngày 2026-07-22: **ĐẠT — 15 bộ, 265 ca**. Các bài này mock provider/CSDL;
chúng không gọi AI thật và không chứng minh coverage 80%.

## 4. Chạy hồi quy frontend tập trung

```powershell
Set-Location frontend
npm test -- tests/components/global-assistant/GlobalAssistantButton.test.jsx tests/components/global-assistant/GlobalAssistantPanel.test.jsx tests/services/assistantApi.test.js
Set-Location ..
```

Đường cơ sở ngày 2026-07-22: **ĐẠT — 3 tệp, 7 ca**.

## 5. Kiểm tra lint và build

```powershell
Set-Location frontend
npx eslint src/features/global-assistant tests/components/global-assistant tests/services/assistantApi.test.js
npm run build
Set-Location ..

Set-Location backend
npx eslint src/api/assistant src/services/ai.service.js src/services/aiUsage.service.js tests/unit/api tests/unit/services/ai.service.test.js tests/unit/services/aiUsage.service.test.js
Set-Location ..
```

Hiện trạng đã ghi nhận:

- Frontend assistant lint và 3/7 test đạt.
- Build production ngày 2026-07-22 đạt với bundle JavaScript 2.886,27 kB (gzip
  814,40 kB), có cảnh báo kích thước chunk không chặn nhưng vẫn phải xử lý trước khi
  tuyên bố tối ưu production.
- Backend lint **chưa đạt** vì còn 1 lỗi `no-useless-escape` tại
  `backend/src/api/assistant/assistant.response.js:24`.

Không đổi `[ ]` của T056 thành hoàn thành cho tới khi toàn bộ nhóm kiểm tra trong nhiệm
vụ đó được chạy lại và backend lint đạt.

## 6. Kiểm tra schema an toàn

Từ `backend/`, trên môi trường đã được ủy quyền:

```powershell
npm run assistant:inspect-schema
```

Xác minh tối thiểu:

- `chatbot_sessions`: `preferred_address`, chỉ mục theo user/thời gian.
- `chatbot_messages`: `rating`, `rating_reason`, `updated_at`, check rating, trigger
  cập nhật và chỉ mục theo phiên.
- `ai_usage_logs` đã tồn tại từ migration 022.

Nếu migration 024 chưa có, dừng smoke test bền vững và thực hiện quy trình
backup/migration của dự án theo quyền môi trường. Không chạy `npm run migrate` chỉ để
hoàn thành tài liệu này.

## 7. Smoke test qua giao diện

Khởi động hai ứng dụng theo cách phát triển thông thường:

```powershell
Set-Location backend
npm run dev
```

Trong terminal khác:

```powershell
Set-Location frontend
npm run dev
```

Đăng nhập bằng tài khoản học viên thử nghiệm và kiểm tra:

1. Hỏi `Skimming khác scanning như thế nào?` → nhận câu trả lời học tập, không có band
   cá nhân.
2. Hỏi tiếp `Kết hợp hai kỹ năng này thế nào?` → dùng đúng ngữ cảnh cuộc trò chuyện.
3. Tìm một đề/tài nguyên đã công bố → chỉ hiện tiêu đề/liên kết có thật từ CSDL.
4. Đóng/mở panel → lịch sử và `conversationId` tiếp tục đúng người dùng.
5. Đánh giá một tin nhắn trợ lý → trả `success: true`; tải lại vẫn thấy dữ liệu khi
   migration đã áp dụng.
6. Mở trang đang làm bài → widget bị ẩn; gọi backend với `pageType=active-test` phải
   bị chặn.
7. Yêu cầu chatbot chấm band Writing/Speaking cá nhân → bị từ chối an toàn, không tạo
   báo cáo chấm điểm.

## 8. Kỳ vọng API/SSE cần quan sát

- Frontend gọi `/api/v1/assistant/*`; `/api/assistant/*` chỉ là bí danh backend.
- SSE thành công phát `assistant.start` → một `assistant.delta` chứa toàn bộ câu trả
  lời → `assistant.done`; chưa truyền từng token.
- Không tự động retry sang JSON khi kết nối stream bị ngắt.
- `/status` yêu cầu học viên đã xác thực và chỉ trả `{code:null,status:"ok"}`.
- JSON hiện còn dạng phẳng; đây là khoảng trống T057, không phải lỗi tài liệu.

## 9. Điều kiện kết luận

Chỉ có thể gọi feature “sẵn sàng production” sau khi T056–T061 đều hoàn thành, các
cổng Hiến chương trong [plan.md](./plan.md) được giải quyết/phê duyệt và kết quả thực
của PM-01–PM-18 được ghi vào [eval-set.md](./eval-set.md). Hiện tại tài liệu chỉ xác
nhận hồi quy tự động tập trung, không xác nhận các cổng đó đã đạt.
