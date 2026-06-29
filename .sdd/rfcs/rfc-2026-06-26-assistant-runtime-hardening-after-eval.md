# RFC: Assistant Runtime Hardening After Eval

**Date**: 2026-06-26  
**Feature**: `global-ielts-virtual-assistant`  
**Status**: APPROVED FOR IMPLEMENTATION

## Lý Do Thay Đổi

Các RFC trước đã đưa assistant sang hướng intent routing, controlled context injection, IELTS knowledge mode, library intent và DB grounding. Sau khi test runtime với dữ liệu thật, vẫn còn một số lỗi nằm ở pipeline sau query:

- DB có nhiều hơn 5 records nhưng assistant chỉ đưa 5 records vào context.
- Một số câu hỏi vừa có "đề" vừa có "thư viện" bị route chưa ổn định.
- `IELTS_KNOWLEDGE` đã tồn tại nhưng rule còn hẹp với các câu như Task 1 overview, Speaking Part 2, Reading strategy.
- Empty lookup trả lời quá cụt, tạo cảm giác bot lỗi dù query đang đúng.
- Suggested link cho Listening có thể fallback sai về Reading.
- Assistant query chưa đồng bộ hoàn toàn với public API về `review_status = approved`.
- Debug chưa tách rõ DB row count và context row count.
- Frontend pageType cho một số route còn quá chung chung.

## Thay Đổi So Với Các RFC Trước

RFC này không thay thế 4 RFC trước. Nó harden các điểm runtime sau:

1. Result limit:
   - Thêm `ASSISTANT_CONTEXT_RESULT_LIMIT = 10`.
   - Không còn hard-code `slice(0, 5)` cho lookup context/display.
   - Debug tách `dbRowCount`, `contextRowCount`, `displayedRowCount`, `contextLimit`, `contextLimitApplied`.

2. Publish parity:
   - Assistant lookup phải lọc `is_published = TRUE`.
   - Nếu bảng có `review_status`, lọc thêm `review_status = 'approved'`.

3. Intent hardening:
   - Không tạo intent mới cho IELTS knowledge.
   - Mở rộng `IELTS_KNOWLEDGE`.
   - Với câu nhập nhằng "đề trong thư viện", ưu tiên clarification thay vì route máy móc sai bảng.

4. Empty result fallback:
   - Lookup rỗng không trả một câu generic cụt.
   - Trả thông báo thiếu đúng filter và gợi ý các item published/approved gần nhất cùng bảng nếu có.

5. Route and page context:
   - Bổ sung Listening route.
   - Frontend phân loại `/practice-history`, skill listing pages, result/review rõ hơn.

## Giữ Nguyên

- Không thêm vector database.
- Không thêm embeddings.
- Không migration database nếu không cần.
- Guest vẫn thấy assistant button nhưng phải login mới chat.
- Assistant vẫn disabled trong active test.
- `FIND_TEST` không bịa test.
- `FIND_LESSON` không bịa tài liệu.
- `POST_TEST_REVIEW` không trả lời nếu thiếu official context.
- Không tạo intent `IELTS_KNOWLEDGE_QA`; tiếp tục dùng `IELTS_KNOWLEDGE`.

## Files Bị Ảnh Hưởng

- `backend/src/api/assistant/assistant.constants.js`
- `backend/src/api/assistant/assistant.context.js`
- `backend/src/api/assistant/assistant.intent.js`
- `backend/src/api/assistant/assistant.service.js`
- `backend/src/api/assistant/assistant.selfcheck.js`
- `frontend/src/features/global-assistant/hooks/useAssistantAvailability.js`
- `backend/tests/unit/api/assistant.context.test.js`
- `backend/tests/unit/api/assistant.intent.test.js`
- `backend/tests/unit/api/assistant.service.test.js`

## Acceptance Criteria

- Có 10 records published/approved thì assistant context thấy tối đa 10, không còn 5.
- Debug log phân biệt DB rows và context rows.
- `FIND_TEST` và `FIND_LESSON` query không leak pending content.
- Listening suggested link không trỏ về Reading.
- `Writing Task 1 overview viết thế nào?` vào `IELTS_KNOWLEDGE`.
- Empty lookup trả lời có gợi ý fallback khi có dữ liệu khác cùng bảng.
- `/practice-history` không còn bị pageType `home`.
