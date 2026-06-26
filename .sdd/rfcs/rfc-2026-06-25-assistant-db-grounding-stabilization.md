# RFC: Assistant DB Grounding Stabilization

**Date:** 2026-06-25
**Author:** AI Assistant
**Status:** PENDING

## 1. Problem
The Global IELTS Assistant needs to reliably query and serve actual database content to users rather than relying strictly on the LLM's pre-trained knowledge or inventing "mock" tests/lessons. While a DB grounding mechanism was implemented, it suffered from some critical issues:
- Schema mismatch vulnerabilities (e.g. `is_published` columns dynamically changing across environments).
- Hardcoded keywords and lack of clear deterministic response handling when data is found but the AI mistakenly responds generically.
- Missing nuanced search filters, causing generic words like "có" or "đề" to mess up exact matching.

## 2. Current Evidence
- Asking "Bạn có đề reading nào trong hệ thống không" incorrectly detected "de" as difficulty `beginner`, returning 0 tests.
- Asking "có đề tam trong thư viện không" matched "tam" instead of using an exact match rule on "tạm".
- The debug logs lacked visibility into exact/fuzzy match status, skill/resource type filters, and fallback overrides.

## 3. Proposed Changes
### Two-Tier Architecture
- **Tier 1: Schema Inspection**: Extract dynamic schemas from the `information_schema` at runtime.
- **Tier 2: Runtime Queries**: Query DB based on accurate mapped columns (like dynamic publish filters) and accurately extracted search terms.
- **Strict Limitation**: AI is strictly forbidden from "inventing" tests, lessons, or resources if the DB queries yield zero rows.

### Keyword Extraction & Stopwords Expansion
- Added common Vietnamese conversational artifacts to stopwords: `"ban", "có", "co", "không", "khong", "nào", "nao", "trong", "he thong", "đề", "de"`.
- Specific filters like `skill` and `resourceType` are correctly mapped and decoupled from keyword searches.

### Matching Strategies
- **Exact First, Fuzzy Second**: Title exact matches are prioritized (e.g. `tam == tạm`). Then fuzzy ILIKE, then latest published as fallback.

### Deterministic Overrides
- When `rowCount > 0` but the AI attempts to use a generic response (like "Mình chưa tìm thấy..."), the backend steps in and deterministic strings are shown detailing the specific found items.

## 4. Remaining Risks
- The LLM might still struggle with very complex, multi-layered intents not mapped to DB lookups.
- High DB latency if library matching gets overly fuzzy on huge datasets.

## 5. Files Affected
- `backend/src/api/assistant/assistant.context.js`
- `backend/src/api/assistant/assistant.service.js`
- `backend/scripts/assistant-inspect-schema.js`
- `backend/scripts/assistant-debug-db.js`
- `backend/scripts/test-assistant-chat.js`

## 6. Test Plan
- Run `npm run assistant:inspect-schema` and `npm run assistant:debug-db` to verify live Supabase environment schemas.
- Execute simulated query tests via `node scripts/test-assistant-chat.js`.
- Confirm logs correctly report: `message`, `detectedIntent`, `queryTable`, `skillFilter`, `resourceTypeFilter`, `searchTerms`, `exactTitleMatch`, `fuzzyTitleMatch`, `rowCount`, `fallbackReason`, and `finalResponseMode`.

## 7. Rollback Plan
- Revert `assistant.context.js` and `assistant.service.js` to their states prior to this stabilization phase, discarding the exact/fuzzy sorting logic.
