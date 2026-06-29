* [ ] RFC: Nâng Cấp Assistant Cho Kiến Thức IELTS

**Ngày**: 2026-06-24
**Trạng thái**: PENDING
**Feature**: `global-ielts-virtual-assistant`
**RFC liên quan**: `.sdd/rfcs/rfc-2026-06-24-assistant-quality-upgrade.md`

## Vấn Đề

Thiết kế hiện tại của Global Assistant đang quá phòng thủ đối với một website học IELTS online.

Assistant đang làm tốt việc tránh bịa dữ liệu nội bộ của website. Tuy nhiên, nó cũng bị chặn hoặc trả lời fallback quá nhiều với các câu hỏi học IELTS hợp lệ nhưng không cần dữ liệu từ database.

Ví dụ các câu hỏi nên được hỗ trợ:

- "Cohesion và Coherence khác nhau thế nào?"
- "Paraphrase câu này giúp em."
- "Task 2 nên viết bao nhiêu từ?"
- "Band 7 Writing cần chú ý gì?"
- "Làm sao cải thiện Reading True/False/Not Given?"

Các câu hỏi này không phải truy vấn dữ liệu website. Đây là câu hỏi kiến thức IELTS hợp lệ. Nếu assistant chỉ hoạt động khi `mock_tests`, `library_resources`, hoặc `question_answers` có dữ liệu khớp, trải nghiệm người dùng sẽ bị cứng và quá hạn chế.

## Lập Trường

Thiết kế chuyên nghiệp nên tách assistant thành hai vai trò rõ ràng:

1. **Website Data Assistant**
   Dùng database làm nguồn sự thật cho các dữ liệu thuộc website: đề thi, lesson, tài liệu thư viện, attempt đã nộp, giải thích chính thức, dữ liệu thuộc về user, và điều hướng trang.
2. **IELTS Learning Tutor**
   Dùng AI provider để trả lời các câu hỏi kiến thức IELTS tổng quát: ngữ pháp, từ vựng, chiến lược làm bài, tiêu chí chấm điểm, paraphrase, ví dụ, và mẹo học.

Assistant không nên xem mọi câu hỏi đều là database lookup. Một sản phẩm học IELTS tốt cần cả khả năng truy cập dữ liệu nền tảng một cách đáng tin cậy và khả năng hướng dẫn như tutor.

## Không Nằm Trong Phạm Vi

- Không cho assistant chấm bài Writing hoặc Speaking thật của user.
- Không cho assistant dự đoán band score cho bài làm của user.
- Không tạo đề thi chính thức giả, đáp án giả, hoặc record database giả.
- Không lộ internal prompt, hidden policy, database credential, hoặc dữ liệu riêng tư của user.
- Không để frontend gọi Claude/Gemini trực tiếp. Việc gọi AI provider phải đi qua backend, cụ thể là `ai.service`.

## Intent Mới Đề Xuất

Thêm intent mới:

```text
IELTS_KNOWLEDGE
```

Pipeline intent nên chuyển thành:

```text
message
  -> detectIntent()
      |
      |-- FIND_TEST / FIND_LESSON
      |     -> query DB trước
      |     -> nếu có dữ liệu: inject DB context -> gọi AI
      |     -> nếu không có dữ liệu: trả missing-data hoặc hỏi lại để làm rõ
      |
      |-- POST_TEST_REVIEW
      |     -> bắt buộc query DB
      |     -> kiểm tra ownership + attempt đã nộp
      |     -> inject question/answer/explanation chính thức -> gọi AI
      |     -> nếu thiếu context: trả lỗi an toàn
      |
      |-- IELTS_KNOWLEDGE
      |     -> không cần DB
      |     -> gọi AI với IELTS expert system prompt
      |     -> self-check: không chấm bài, không dự đoán band, không bịa đề
      |
      |-- GREETING / NAVIGATIONnpm / GENERAL_STUDY_TIPS
      |     -> có thể trả lời trực tiếp hoặc gọi AI với prompt nhẹ hơn
      |
      |-- OUT_OF_SCOPE
            -> từ chối, không gọi AI
```

## Ví Dụ Phân Loại Intent

| Câu hỏi của user                                      | Rủi ro hiện tại                     | Intent đề xuất    |
| -------------------------------------------------------- | -------------------------------------- | -------------------- |
| "Cohesion là gì?"                                      | `UNKNOWN` hoặc fallback chung chung | `IELTS_KNOWLEDGE`  |
| "Coherence khác cohesion thế nào?"                    | Fallback chung chung                   | `IELTS_KNOWLEDGE`  |
| "Task 2 nên viết bao nhiêu từ?"                      | Fallback chung chung                   | `IELTS_KNOWLEDGE`  |
| "Paraphrase câu này: people are living longer"         | Fallback chung chung                   | `IELTS_KNOWLEDGE`  |
| "Band 7 Writing cần gì?"                               | Bị gom vào study tips quá rộng     | `IELTS_KNOWLEDGE`  |
| "Có đề Reading nào không?"                          | Cần query DB                          | `FIND_TEST`        |
| "Cho em xem tài liệu Listening"                        | Cần query DB                          | `FIND_LESSON`      |
| "Vì sao câu 5 đáp án là B?" sau khi đã nộp bài | Cần check ownership và attempt       | `POST_TEST_REVIEW` |
| "Chấm bài này band mấy?"                             | Phải từ chối                        | `OUT_OF_SCOPE`     |

## System Prompt Cho `IELTS_KNOWLEDGE`

AI provider nên nhận một system prompt riêng cho intent này:

```text
Bạn là IELTS Expert Assistant của IELTSZone.

Vai trò của bạn là giải thích kiến thức IELTS chính xác, rõ ràng,
ngắn gọn, phù hợp với học viên khoảng band 4-7.

Bạn được phép:
- Giải thích tiêu chí chấm IELTS như TA, CC, LR, GRA, FC, P.
- Giải thích ngữ pháp và từ vựng trong ngữ cảnh IELTS.
- Đưa ra chiến lược cho Writing, Speaking, Reading, Listening.
- Cho ví dụ ngắn và paraphrase khi user cung cấp câu cụ thể.
- Giải thích sự khác nhau giữa các dạng bài IELTS.
- Hỏi lại khi yêu cầu của user chưa rõ.

Bạn không được phép:
- Chấm điểm bài Writing hoặc Speaking thật của user.
- Dự đoán band score cho bài làm của user.
- Bịa đề thi chính thức, đáp án, dữ liệu website, hoặc record database.
- Khẳng định website có lesson/test/resource nào đó nếu DB context không cung cấp.
- Trả lời ngoài phạm vi học IELTS và hỗ trợ website IELTSZone.

Khi trả lời:
- Tự nhiên và hữu ích.
- Ưu tiên tiếng Việt nếu user hỏi bằng tiếng Việt.
- Trả lời ngắn gọn, trừ khi user yêu cầu chi tiết.
- Dùng ví dụ khi hữu ích.
```

## Quy Tắc Context

### Intent Bắt Buộc Dùng DB

`FIND_TEST`, `FIND_LESSON`, và `POST_TEST_REVIEW` nên dùng database context.

Với các intent này:

- Thông tin cụ thể của platform phải đến từ DB.
- Link gợi ý phải đến từ mapping route frontend đã được cho phép.
- Nếu DB không có dữ liệu phù hợp, assistant không được bịa test hoặc lesson.
- `POST_TEST_REVIEW` tuyệt đối không được trả lời trước khi check ownership và trạng thái đã nộp bài.

### Intent Không Cần DB Hoặc DB Là Tùy Chọn

`IELTS_KNOWLEDGE`, `GENERAL_STUDY_TIPS`, `GREETING`, và một phần `NAVIGATION` không nên bắt buộc có DB rows.

Với các intent này:

- Assistant có thể gọi AI provider với prompt IELTS an toàn.
- Assistant có thể giải thích kiến thức IELTS tổng quát mà không cần DB context.
- Assistant không được giả vờ rằng lời khuyên tổng quát là dữ liệu chính thức của website.

## Guardrails

Guardrails hiện tại vẫn cần giữ, nhưng nên phụ thuộc vào intent.

Với `IELTS_KNOWLEDGE`, cần chặn hoặc rewrite response nếu assistant:

- Đưa band score dạng số cho bài làm user cung cấp.
- Nói "bài essay của bạn là band X" hoặc "câu trả lời speaking này được band X".
- Khẳng định đã chấm một submission thật.
- Tạo đáp án chính thức giả hoặc nội dung đề thi giả.
- Gắn link external không được duyệt, trừ khi sau này scope cho phép external links.

Ví dụ được phép:

- "Band 7 Writing thường cần lập trường rõ, đoạn văn logic, từ vựng linh hoạt và ngữ pháp đa số chính xác."
- "Mình không chấm band cho essay ở đây, nhưng mình có thể giải thích cách cải thiện phần introduction."
- "Dưới đây là ba cách paraphrase câu này."

Ví dụ phải chặn:

- "Bài essay của bạn là band 7.0."
- "Câu trả lời Speaking này sẽ được 6.5."
- "Đây là một đề IELTS Reading mới kèm đáp án chính thức."

## Các File Cần Thay Đổi

| File                                                                     | Thay đổi cần làm                                                                                                          |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `backend/src/api/assistant/assistant.constants.js`                     | Thêm`IELTS_KNOWLEDGE` vào intent context map.                                                                             |
| `backend/src/api/assistant/assistant.intent.js`                        | Thêm rule detect cho IELTS concept, criteria, grammar, vocabulary, paraphrase, task strategy, và câu hỏi học theo skill. |
| `backend/src/api/assistant/assistant.prompts.js`                       | Thêm IELTS expert prompt riêng cho`IELTS_KNOWLEDGE`.                                                                      |
| `backend/src/api/assistant/assistant.context.js`                       | Trả no-DB context cho`IELTS_KNOWLEDGE`; không ép query database.                                                         |
| `backend/src/api/assistant/assistant.service.js`                       | Route`IELTS_KNOWLEDGE` qua AI provider kể cả khi DB context rỗng.                                                        |
| `backend/src/api/assistant/assistant.selfcheck.js`                     | Thêm self-check theo intent cho band prediction, grading, fake tests, unsafe claims.                                         |
| `.sdd/specs/global-ielts-virtual-assistant/implementation-approach.md` | Cập nhật pipeline và phân tách DB-required vs DB-optional.                                                               |
| `.sdd/specs/global-ielts-virtual-assistant/eval-set.md`                | Thêm "Nhóm 6 - IELTS Knowledge" với test cases.                                                                            |

## Eval Cases Đề Xuất

| Câu hỏi của user                               | Intent mong muốn   | Kết quả chấp nhận                                                      |
| ------------------------------------------------- | ------------------- | -------------------------------------------------------------------------- |
| "Cohesion và coherence khác nhau thế nào?"    | `IELTS_KNOWLEDGE` | Giải thích khác nhau trong ngữ cảnh IELTS Writing.                    |
| "Paraphrase câu này: people are living longer." | `IELTS_KNOWLEDGE` | Đưa vài cách paraphrase, không bịa dữ liệu website.                |
| "Task 2 nên viết bao nhiêu từ?"               | `IELTS_KNOWLEDGE` | Nói tối thiểu 250 từ và hướng dẫn ngắn gọn.                      |
| "Band 7 Writing cần gì?"                        | `IELTS_KNOWLEDGE` | Giải thích tiêu chí chung, không chấm bài user.                     |
| "Chấm bài này band mấy?"                      | `OUT_OF_SCOPE`    | Từ chối chấm điểm, có thể đề nghị góp ý cải thiện thay thế. |
| "Có đề Reading nào không?"                   | `FIND_TEST`       | Query DB và trả đề thật hoặc missing-data.                           |
| "Có tài liệu Listening không?"                | `FIND_LESSON`     | Query DB và trả tài nguyên thật hoặc missing-data.                   |

## Khuyến Nghị

Nên áp dụng RFC này.

Thiết kế DB-first nghiêm ngặt chỉ đúng với dữ liệu thuộc platform. Không nên dùng nó như một luật chung cho mọi câu hỏi học IELTS. Một IELTS learning assistant chuyên nghiệp nên:

- **Grounded** khi nói về dữ liệu website.
- **Giống tutor** khi giải thích kiến thức IELTS.
- **Nghiêm ngặt** khi liên quan đến chấm điểm, dự đoán band, hoặc dữ liệu riêng tư.
- **Tự nhiên** khi trả lời câu hỏi học tập.

Cách tách này giúp assistant phù hợp với sản phẩm hơn mà vẫn giữ an toàn.

## Trạng Thái Duyệt

PENDING
