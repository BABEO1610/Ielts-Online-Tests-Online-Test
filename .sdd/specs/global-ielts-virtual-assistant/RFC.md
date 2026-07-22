# RFC.md — Tổng hợp tính năng: Trợ lý ảo IELTS toàn cục

**Tài liệu để học và trình bày trước hội đồng bảo vệ đồ án.**

---

## 1. Tổng quan

Trợ Lý Ảo IELTS Toàn Cục là chatbot hỗ trợ học viên trên nền tảng IELTSZone.
Chatbot giúp:

- Giải đáp kiến thức IELTS (chiến lược, tiêu chí, ngữ pháp, từ vựng).
- Tìm đề thi và tài liệu có sẵn trong hệ thống.
- Điều hướng trang web.
- Xem lại bài thi đã nộp.

Chatbot **tách biệt hoàn toàn** khỏi hệ thống chấm điểm Writing/Speaking bằng AI.
Chatbot không chấm điểm và không đưa ra band điểm cá nhân.

## 2. Vì sao cần chatbot?

- Học viên cần hỗ trợ 24/7 mà không cần chờ giảng viên.
- Hệ thống có nhiều trang (bài thi, thư viện, lịch sử, xem lại) — chatbot giúp điều
  hướng nhanh.
- Câu hỏi IELTS thường lặp lại (True/False/Not Given khác gì? Phần tổng quan của
  Writing viết thế nào?) → chatbot trả lời chuẩn nhờ cơ sở tri thức có kiểm soát.
- Tránh để học viên phải rời nền tảng để tìm kiến thức IELTS bên ngoài.

## 3. Kiến trúc tổng quan

```text
┌─────────────────────────────┐
│     Giao diện (React)        │
│  GlobalAssistantPanel.jsx    │
│  assistantApi.js             │
└──────────┬──────────────────┘
           │ POST /api/v1/assistant/chat/stream
           ▼
┌─────────────────────────────┐
│     Máy chủ (Express)        │
│  assistant.routes.js         │
│  ├─ Giới hạn tần suất        │
│  ├─ assistant.controller.js  │  ← kiểm tra, xác thực, SSE/JSON
│  ├─ assistant.guardrails.js  │  ← chặn lúc đang thi, chấm điểm, ngoài phạm vi
│  ├─ assistant.service.js     │  ← luồng xử lý chính
│  │   ├─ assistant.intent.js  │  ← phát hiện ý định (quy tắc + LLM)
│  │   ├─ assistant.context.js │  ← chèn tri thức, CSDL, bộ nhớ
│  │   ├─ assistant.prompts.js │  ← tạo lời nhắc theo chế độ
│  │   └─ assistant.selfcheck  │  ← kiểm tra phản hồi
│  ├─ ai.service.js            │  ← gọi nhà cung cấp AI (Gemini/OpenAI theo cấu hình)
│  └─ assistant.repository.js  │  ← lưu phiên/tin nhắn
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│     Cơ sở dữ liệu PostgreSQL │
│  chatbot_sessions            │
│  chatbot_messages            │
│  ai_usage_logs               │
│  mock_tests (đọc)            │
│  library_resources (đọc)     │
│  test_attempts (đọc)         │
│  questions / answers (đọc)   │
└─────────────────────────────┘
```

## 4. Luồng yêu cầu chi tiết

1. Học viên mở tiện ích chatbot và gửi tin nhắn.
2. Giao diện gửi tin nhắn cùng ngữ cảnh trang tới
   `POST /api/v1/assistant/chat/stream`.
3. **Bộ giới hạn tần suất** kiểm tra tần suất (30 yêu cầu/phút/IP).
4. **Bộ điều khiển** kiểm tra dữ liệu đầu vào (tin nhắn ≤ 2000 ký tự,
   `pageType` hợp lệ).
5. **Bộ điều khiển** xác định thông tin xác thực từ cookie JWT → kiểm tra phiên →
   yêu cầu vai trò học viên.
6. **Rào chắn an toàn** chặn: đang làm bài thi, ngoài phạm vi, yêu cầu chấm điểm,
   yêu cầu trích xuất lời nhắc.
7. **Dịch vụ** phát hiện ý định: chào hỏi, điều hướng, kiến thức IELTS, tìm đề/tài
   liệu, xem lại bài sau thi, yêu cầu làm rõ.
8. **Bộ tạo ngữ cảnh** chèn ngữ cảnh phù hợp:
   - Tri thức JSON tĩnh nếu là `IELTS_KNOWLEDGE`.
   - Tra cứu CSDL nếu là `FIND_TEST`/`FIND_LESSON`.
   - Dữ liệu lượt làm bài/câu hỏi nếu là `POST_TEST_REVIEW`.
   - Bộ nhớ phiên (N tin nhắn gần nhất).
9. **Nhà cung cấp AI** (Gemini hoặc OpenAI theo cấu hình) tạo câu trả lời nếu cần.
10. **Bộ tự kiểm tra** bảo đảm: không đưa ra band điểm cá nhân, không bịa đề/tài liệu, không
    trả đáp án khi không có ngữ cảnh.
11. Siêu dữ liệu được ghi vào `ai_usage_logs`, tin nhắn được ghi vào
    `chatbot_messages`.
12. Phản hồi được trả về qua các sự kiện SSE hoặc JSON.

## 5. Bảo mật và rào chắn an toàn

| Biện pháp | Mô tả |
|---|---|
| Xác thực | Cookie JWT + phiên đang hoạt động + vai trò học viên |
| Giới hạn tần suất | 30 yêu cầu/phút/IP cho `/chat` và `/chat/stream` |
| Chặn khi đang thi | Cả giao diện (ẩn nút) và máy chủ (rào chắn chặn) |
| Chống bịa đặt | Tra cứu CSDL chỉ trả dữ liệu đã xuất bản, phản hồi dự phòng xác định trước |
| Không chấm điểm | Rào chắn chặn yêu cầu chấm điểm/đưa ra band điểm cá nhân |
| Không lộ cấu hình | `/status` chỉ trả `{ code: null, status: "ok" }` |
| Kiểm tra đầu vào | Loại bỏ khoảng trắng thừa ở đầu/cuối tin nhắn + tối đa 2000 ký tự + danh sách cho phép của `pageType` |
| Giới hạn phạm vi | Chỉ hỗ trợ IELTS/học tiếng Anh, từ chối nội dung ngoài phạm vi |

## 6. Cơ chế dự phòng khi AI lỗi

Khi phản hồi kiến thức đã chuẩn hóa/tự kiểm tra vẫn không hợp lệ, hệ thống thử lại
đúng một lần ở chế độ văn bản thuần. Khi gặp lỗi truyền tải/cấu hình, hoặc lần thử lại
vẫn không hợp lệ:

- **Không chuyển nhà cung cấp và không thử lại thêm.**
- Trả phản hồi dự phòng xác định trước theo kỹ năng:
  - Hỏi về Skimming → cách đọc lướt để nắm ý chính.
  - Hỏi về Scanning → cách quét nhanh để tìm thông tin cụ thể.
  - Hỏi cách kết hợp Skimming và Scanning → quy trình dùng hai kỹ năng theo thứ tự.
  - Hỏi về Writing Task 1 → mẹo viết phần tổng quan.
  - Hỏi về Speaking Part 2 → mẹo xử lý thẻ chủ đề.
  - Hỏi về Reading / TFNG → chiến lược Reading.
  - Không nhận diện kỹ năng → mẹo IELTS chung.
- Đảm bảo người dùng luôn nhận được phản hồi, không bị treo hoặc gặp màn hình lỗi
  trắng.

## 7. Vì sao không dùng RAG dựa trên vectơ?

- Dữ liệu nền tảng có cấu trúc như đề thi, tài nguyên và lượt làm bài nằm trong
  PostgreSQL → truy vấn SQL có kiểm soát giúp bảo đảm quyền truy cập và tính có căn cứ.
- Kiến thức IELTS đã tuyển chọn nằm trong các tệp JSON tĩnh có quản lý phiên bản → đủ
  đáp ứng các chủ đề thường gặp mà không cần tìm kiếm vectơ.
- RAG dựa trên vectơ cần thêm phần mở rộng pgvector, dịch vụ nhúng và luồng chia đoạn →
  phức tạp và rủi ro cho đồ án.
- Cơ sở tri thức JSON tĩnh đáp ứng nhu cầu kiến thức IELTS thường gặp với chi phí
  triển khai thấp.
- Lộ trình tương lai có thể nâng cấp nếu cần, nhưng giai đoạn hiện tại ưu tiên tính
  ổn định và đúng đắn.

## 8. Chatbot khác gì hệ thống chấm điểm bằng AI?

| Tiêu chí | Chatbot (Trợ lý ảo) | Chấm điểm bằng AI |
|---|---|---|
| Mục đích | Hỗ trợ học, điều hướng, giải thích | Chấm điểm Writing/Speaking chính thức |
| Đầu vào | Tin nhắn trò chuyện + ngữ cảnh trang | Bài nộp Writing/Speaking |
| Đầu ra | Văn bản trả lời + liên kết gợi ý | Điểm band + điểm tiêu chí + nhận xét |
| Lưu trữ | `chatbot_messages` | `ai_grading_reports` |
| Điểm cuối API | `/api/v1/assistant/chat` | `/api/v1/submissions/writing/:id/ai-grade` |
| Rào chắn | Không cho chấm điểm | Không liên quan chatbot |

## 9. Các giới hạn đã biết

- Tệp di trú `024_create_chatbot_history_tables.sql` tạo
  `chatbot_sessions`/`chatbot_messages` đã có trong kho mã nguồn, nhưng vẫn cần xác
  minh tệp này đã được áp dụng trên cơ sở dữ liệu của từng môi trường vận hành.
- Việc lưu đánh giá được thực hiện theo cơ chế nỗ lực tối đa (phụ thuộc lược đồ có cột
  đánh giá hay không).
- Cơ chế truyền dần hiện tại chuẩn hóa phản hồi cuối rồi mới gửi SSE, chưa truyền
  theo từng token.
- Cơ sở tri thức tĩnh cần được bảo trì thủ công khi thêm nội dung IELTS mới.

## 10. Cách trình bày trước hội đồng

### Đoạn nói mẫu (khoảng 2–3 phút):

> "Hệ thống IELTSZone của nhóm em có tích hợp một Chatbot Trợ Lý Ảo IELTS, được
> thiết kế để hỗ trợ học viên ngay trên nền tảng.
>
> Chatbot này giúp học viên **ba việc chính**: hỏi kiến thức IELTS như chiến lược
> làm bài, tiêu chí chấm điểm; tìm đề thi và tài liệu có sẵn trong hệ thống; và xem
> lại bài thi đã nộp.
>
> Về kiến trúc, khi học viên gửi tin nhắn, giao diện gửi yêu cầu kèm ngữ cảnh trang
> tới máy chủ. Máy chủ sẽ qua nhiều lớp xử lý: **giới hạn tần suất** để chống thư
> rác, **kiểm tra dữ liệu đầu vào**, **xác thực** học viên và **rào chắn an toàn** để
> chặn các yêu cầu không hợp lệ như chấm điểm Writing hay xem đáp án khi đang thi.
> Sau đó hệ thống phát hiện **ý định** của câu hỏi — ví dụ tìm đề hay hỏi kiến thức
> — rồi chèn **ngữ cảnh phù hợp** vào lời nhắc trước khi gọi AI.
>
> Điểm quan trọng cần nhấn mạnh: chatbot này **hoàn toàn tách biệt** khỏi hệ thống
> chấm điểm Writing/Speaking bằng AI. Chatbot không chấm điểm, không dự đoán điểm
> band và không bịa ra đề thi hay đáp án không tồn tại trong cơ sở dữ liệu.
>
> Về bảo mật, chỉ học viên đã đăng nhập mới được trò chuyện, hệ thống có giới hạn
> tần suất chống lạm dụng, và khi đang làm bài thi thì chatbot bị chặn cả ở giao
> diện lẫn máy chủ.
>
> Nhóm em chọn **Cơ Sở Tri Thức Tĩnh** thay vì RAG véc-tơ vì dữ liệu kiến thức IELTS
> thường gặp có thể kiểm soát bằng các tệp JSON, không cần làm hệ thống phức tạp
> thêm với kỹ thuật nhúng hay cơ sở dữ liệu véc-tơ trong phạm vi đồ án này."
