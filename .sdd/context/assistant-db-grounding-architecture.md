# Assistant DB Grounding Architecture

## 1. Purpose

The goal of Database Grounding is to ensure the Global IELTS Assistant never "invents" mock tests, lessons, or content that does not exist. Instead of relying on the LLM to guess the database structure, the backend actively inspects the true database schema, queries it deterministically at runtime, and then injects factual rows into the AI's context window. If the database returns zero rows, the AI falls back to a deterministic safe missing-data response.

## 2. Two-tier Architecture

Our DB grounding implementation is divided into two distinct tiers:

**Tầng 1: Inspect real Supabase schema**
- Uses the `npm run assistant:inspect-schema` script.
- Queries `information_schema.columns` directly from the production/staging database.
- Maps real tables and real columns (especially resolving dynamic "publish" statuses like `is_published`, `status`, or `is_active`) to ensure the codebase stays in sync with migration changes.

**Tầng 2: Runtime DB Query**
- Uses `assistant.context.js` and the repository layer.
- Queries the real Supabase data based on detected user intents and filtered search keywords.
- DB-required intents MUST yield actual database rows.
- The AI is instructed to only rephrase and recommend the data explicitly provided in its injected context.
- If no rows match the query, the system safely triggers a deterministic missing-data response.

## 3. Runtime Flow

The step-by-step pipeline execution logic (`assistant.service.js`):

1. **User message**: User inputs a prompt via the UI.
2. **Auth check & Active test guard**: Validates user credentials and blocks assistant execution if the user is in an active test.
3. **Intent detection**: Evaluates the prompt (`assistant.intent.js`) and scope classification to map the prompt to an intent action.
4. **DB context builder**: If the intent requires data, queries the database deterministically via `assistant.context.js` using fuzzy/exact keyword filtering.
5. **AI provider or deterministic fallback**: Passes the fetched DB rows into the LLM context OR bypasses the LLM entirely if returning a deterministic formatted response (e.g. `finalResponseMode: 'deterministic_fallback'`).
6. **Self-check/guardrails**: Runs final output checks to block hallucinated band scores or unpermitted behaviors.
7. **Save chat history**: Persists the session and chat turn in `chatbot_sessions` / `chatbot_messages`.
8. **Return response**: Yields the output to the frontend client via REST or Stream.

## 4. Intent-to-Database Mapping

| Intent | Required Context |
| :--- | :--- |
| **FIND_TEST** | **Table**: `mock_tests`<br>**Published filter**: `is_published = true`<br>**Search fields**: title, description, skill, difficulty<br>**Output fields**: id, title, description, skill, difficulty, duration_minutes |
| **FIND_LESSON** | **Table**: `library_resources`<br>**Published filter**: `is_published = true`<br>**Search fields**: title, description, category, resource_type<br>**Output fields**: id, title, description, category, resource_type, file_size_bytes |
| **POST_TEST_REVIEW** | **Tables**: `test_attempts`, `question_answers`, `questions`<br>**Rules**: Must check user ownership. Must check submitted status. Must not invent explanations if the DB has none. |
| **IELTS_KNOWLEDGE** | No DB required. Calls AI with IELTS Expert Prompt. Must not claim website data unless DB context exists. |
| **WEBSITE_HELP** | No DB required. Uses static site knowledge context. |
| **GREETING** | No DB required. Deterministic response. |
| **GRADING_REQUEST_SAFE_FEEDBACK** | No DB required. Deterministic safe response. Must not return numeric band score. |
| **OUT_OF_SCOPE** | No DB required. No AI call. Polite refusal. |

## 5. Current Real Schema Summary

*Summary from latest `assistant:inspect-schema` run:*
- **mock_tests**: `id`, `title`, `description`, `skill`, `difficulty`, `duration_minutes`, `is_published`
- **library_resources**: `id`, `title`, `description`, `category`, `resource_type`, `file_size_bytes`, `is_published`
- **test_attempts**: `id`, `user_id`, `test_id`, `submitted_at`, `band_score`
- **questions**: `id`, `question_order`, `question_text`, `options`, `correct_answer`, `explanation`
- **question_answers**: `attempt_id`, `question_id`, `given_answer`, `is_correct`
- **chatbot_sessions**: `id`, `user_id`, `created_at`
- **chatbot_messages**: `id`, `session_id`, `role`, `content`

## 6. Debug Telemetry

The system emits an `[AssistantDebug]` object for deep visibility into query states. Fields include:
- `message`: Original query
- `route` / `pageType`: Current UI state
- `ruleIntent`: Intent matched from regex rules
- `classifierUsed`: `true` if fallback scope classifier was triggered
- `classifierIntent`: The returned LLM intent classification
- `classifierConfidence`: The confidence score from LLM
- `finalIntent`: The definitive intent assigned for processing
- `queryTable` / `selectedColumns`: Exact schema targets
- `publishFilter`: Evaluated publish constraints
- `skillFilter` / `resourceTypeFilter`: Skill or Resource type parameters
- `searchTerms`: Extracted keywords
- `exactTitleMatch` / `fuzzyTitleMatch`: Match type flags
- `rowCount` / `resultTitles`: Quantity and names of fetched rows
- `guardrailApplied`: Which final guardrail restricted output, if any
- `siteKnowledgeUsed`: `true` if injected static context
- `dbError.message` / `dbError.code`: Caught Postgres faults
- `fallbackUsed` / `fallbackReason`: Why the pipeline bypassed AI or fell back to 0 rows.
- `aiProviderCalled`: `true` if OpenAI/LLM was consumed.
- `finalResponseMode`: Output modality (`ai`, `deterministic_fallback`, `immediate`, `safe_missing_data`).

## 7. Common Failure Diagnosis

| Symptom | Cause & Action |
| :--- | :--- |
| `rowCount = 0` nhưng DB có data | Kiểm tra filter `is_published`, keyword extraction có nằm trong `SEARCH_STOP_WORDS` không, kiểm tra `skillFilter`, RLS, env. |
| `queryTable` sai | Kiểm tra `assistant.intent.js` mapping logic. |
| DB error bị nuốt | Kiểm tra `assistant.context.js` catch blocks và `AssistantDebug` logging. |
| AI trả "không tìm thấy" dù `rowCount > 0` | Deterministic fallback builder chưa đè được AI, kiểm tra logic trong `assistant.service.js`. |
| `/library` query nhầm `mock_tests` | Kiểm tra param `pageType` và page-aware routing. |

## 8. Commands

- Cập nhật và xuất schema hiện tại: `npm run assistant:inspect-schema`
- Test connection & fetch real sample DB rows: `npm run assistant:debug-db`
- Chạy hệ thống test cục bộ (simulated queries): `node scripts/test-assistant-chat.js`
- Test bằng Jest: `npm test -- assistant`

## 9. Maintenance Rules

- **Schema Changes**: Nếu schema DB thay đổi lớn, phải chạy lại `npm run assistant:inspect-schema` và update file này cùng mapping trong code.
- **Documentation**: Nếu thêm bảng/cột mới cung cấp context cho AI, phải cập nhật file documentation này.
- **Architectural RFCs**: Nếu thay đổi intent/query/guardrail có ảnh hưởng lớn đến behavior chung, phải tạo file RFC trong thư mục `.sdd/rfcs` trước khi code.
- **Security**: KHÔNG ĐƯỢC thiết kế để frontend có thể tự gọi AI provider (`ai.service.js`) trực tiếp. Mọi prompt đều phải qua backend pipeline. KHÔNG ĐƯỢC để lọt Service Role Key vào frontend.
