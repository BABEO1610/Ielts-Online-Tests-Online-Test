# RFC: Assistant Knowledge Base and RAG Roadmap

**Date:** 2026-07-01
**Author:** Codex
**Status:** PENDING_APPROVAL
**Feature:** `global-ielts-virtual-assistant`
**Decision Required From:** Project owner / tech lead
**Implementation Gate:** DO NOT implement any code from this RFC until owner approval is given.

## 1. Purpose

This RFC records the proposed upgrade plan for the Global IELTS Assistant knowledge layer.

The goal is to improve answers for IELTS learning questions such as:

- "Matching headings nen lam the nao cho band 7?"
- "True/False/Not Given khac nhau the nao?"
- "Writing Task 1 overview viet nhu the nao?"
- "Task 2 agree/disagree va discuss both views khac gi nhau?"
- "Lam sao cai thien Listening Section 3 trong 2 tuan?"

The current assistant already has intent routing, guardrails, session memory, DB lookup for website data, and post-test review context. The missing layer is a dedicated IELTS Knowledge Context: a controlled source of IELTS learning content that the assistant can retrieve and inject into prompts.

## 2. Related RFCs and Context

This RFC extends, but does not replace:

- `.sdd/rfcs/rfc-2026-06-24-assistant-ielts-knowledge-upgrade.md`
- `.sdd/rfcs/rfc-2026-06-24-assistant-quality-upgrade.md`
- `.sdd/rfcs/rfc-2026-06-25-assistant-db-grounding-stabilization.md`
- `.sdd/context/assistant-db-grounding-architecture.md`

The previous RFCs correctly split the assistant into:

- Website data assistant: grounded on real platform DB rows.
- IELTS learning tutor: allowed to explain IELTS concepts without requiring website DB rows.

This RFC adds the next architecture layer: a controlled IELTS Knowledge Base first, then true vector RAG later.

## 3. Current Evidence From Code

Current implementation evidence:

- `backend/src/api/assistant/assistant.intent.js` already supports `IELTS_KNOWLEDGE`.
- `backend/src/api/assistant/assistant.context.js` currently returns plain context for `IELTS_KNOWLEDGE`; it does not retrieve IELTS knowledge chunks.
- `backend/src/api/assistant/assistant.prompts.js` allows general IELTS knowledge answers, but does not inject a project-owned knowledge source.
- `backend/src/api/assistant/assistant.context.js` limits recent session memory to 8 messages and truncates message content, so memory summarization is useful later but is not the first bottleneck.

Therefore the current system is best described as:

```text
Context Injection + Session Memory + Guardrails + Operational DB Context
```

It is not yet:

```text
Full IELTS Knowledge RAG
```

## 4. Decision Proposal

Adopt a hybrid roadmap:

1. Use the content/product ideas from the first opinion: skill guides, band descriptors, common mistakes, writing templates, and examples.
2. Use the engineering rollout from the second opinion: static knowledge first, vector RAG later, personalization after the base layer is stable.
3. Treat memory summarization as a follow-up improvement, not the first implementation task.

Recommended implementation order:

1. Phase 1: Static IELTS Knowledge Base.
2. Phase 2: True RAG with embeddings and PostgreSQL pgvector.
3. Phase 3: Personalized learning advice and mistake pattern detection.
4. Phase 4: Tutor/Admin knowledge management.
5. Phase 5: Conversation summary memory, if long conversations become a measurable issue.

## 5. Non-Goals For Initial Approval

Approving Phase 1 must not automatically approve the whole roadmap.

Phase 1 does NOT include:

- No PostgreSQL migration.
- No pgvector.
- No embeddings.
- No PDF upload ingestion.
- No Admin/Tutor knowledge panel.
- No large frontend redesign.
- No numeric band prediction in chat.
- No Writing/Speaking grading inside the assistant chat.
- No new external AI provider contract unless separately approved.
- No broader chatbot scope. The Knowledge Base must not turn the assistant into a general-purpose chatbot.

## 6. Phase 1: Static IELTS Knowledge Base

### 6.1 Goal

Give the assistant a controlled, project-owned "IELTS textbook" that it can retrieve from before answering `IELTS_KNOWLEDGE` questions.

This gives a fast quality improvement without new infrastructure.

### 6.2 Proposed Files

Add a static knowledge directory under the existing assistant module:

```text
backend/src/api/assistant/knowledge-base/
  registry.json
  reading-true-false-not-given.json
  reading-matching-headings.json
  listening-section-strategies.json
  writing-task1-overview.json
  writing-task2-essay-types.json
  speaking-parts-guide.json
  band-descriptors-writing.json
  band-descriptors-speaking.json
  common-mistakes.json
```

Add helper modules:

```text
backend/src/api/assistant/assistant.knowledge-base.js
backend/src/api/assistant/assistant.knowledge-retriever.js
```

Possible future split, if the module grows:

```text
backend/src/api/assistant/assistant.knowledge.repository.js
backend/src/api/assistant/assistant.rag.service.js
```

For Phase 1, keep it simple.

### 6.2.1 `registry.json` Schema

`registry.json` is the static corpus index used by `assistant.knowledge-base.js`.

It should list every knowledge file and provide enough metadata for the retriever to decide what to load and how to score it:

```json
{
  "version": "2026-07-01",
  "files": [
    {
      "file": "reading-true-false-not-given.json",
      "skill": "reading",
      "questionTypes": ["true_false_not_given"],
      "categories": ["strategy", "common_mistake"],
      "matchHints": ["true false not given", "tfng", "false vs not given"]
    }
  ]
}
```

Phase 1 should eagerly load the whole static corpus into memory and cache it at module level. This is acceptable because the corpus is intentionally small. If the corpus grows large, lazy loading or Phase 2 semantic retrieval can be considered later.

### 6.3 Static Chunk Shape

Each JSON file should contain chunks shaped like:

```json
[
  {
    "id": "reading_tfng_core_rule",
    "title": "True False Not Given Core Rule",
    "skill": "reading",
    "questionType": "true_false_not_given",
    "category": "strategy",
    "bandRange": "4.0-7.0",
    "tags": ["reading", "tfng", "strategy", "common_mistake"],
    "sourceName": "IELTSZone Static Knowledge Base",
    "content": "True means the passage confirms the statement. False means the passage clearly says the opposite. Not Given means the passage does not provide enough information to decide."
  }
]
```

### 6.3.1 Seed Content and Size Constraints

Phase 1 seed content must stay small, focused, and testable:

- Each core JSON file should contain at least 3 chunks before Phase 1 is accepted.
- Each chunk should explain one focused idea only.
- Prefer `rule + explanation + example + common mistake` over long article-style content.
- `content` should be no more than 800 characters per chunk.
- The retriever should inject no more than 5 chunks.
- Total injected knowledge content should be capped at about 3,000 characters.
- If a chunk needs more depth, split it into multiple focused chunks instead of making one long chunk.

### 6.4 Retrieval Logic

For `IELTS_KNOWLEDGE`:

1. Normalize user message with the existing `normalizeText`.
2. Detect skill: reading, listening, writing, speaking.
3. Detect question type: true/false/not given, matching headings, task 1 overview, task 2 essay types, speaking part 2, etc.
4. Score static chunks by metadata and keyword overlap.
5. Apply a minimum score threshold.
6. Select top 3 to 5 chunks.
7. Cap total injected content to a safe character budget.
8. Add selected chunks into `contextInjection`.

If no chunk passes the minimum score threshold:

1. Do not inject unrelated chunks.
2. Set `knowledgeResults` to an empty array.
3. Set `knowledgeDebug.noMatch = true`.
4. Set `knowledgeDebug.usedKnowledgeBase = false`.
5. Allow the assistant to answer with a safe general IELTS explanation if the question is still within IELTS scope.
6. Do not claim the answer is based on the project Knowledge Base.

This fallback is intentional: existing `IELTS_KNOWLEDGE` behavior already allows safe general IELTS explanations. The Knowledge Base should improve groundedness when relevant chunks exist, not force bad retrieval when it has no match.

Implementation detail:

1. `assistant.context.js` should call the static knowledge retriever only when `intent === IELTS_KNOWLEDGE`.
2. `assistant.service.js` should continue the existing pipeline, but include retrieved knowledge in the `contextInjection` before prompt construction.
3. `FIND_TEST`, `FIND_LESSON`, and `POST_TEST_REVIEW` must not be rerouted through static knowledge retrieval.

Debug requirements:

In debug mode, the assistant should expose:

1. `detectedIntent`
2. `detectedSkill`
3. `detectedQuestionType`
4. `selectedKnowledgeChunkIds`
5. `retrievalScores`
6. `usedKnowledgeBase`
7. `noMatch`
8. `totalInjectedKnowledgeChars`

Suggested context shape:

```js
{
  mode: "IELTS_KNOWLEDGE",
  databaseResults: [],
  knowledgeResults: [
    {
      id: "reading_tfng_core_rule",
      title: "True False Not Given Core Rule",
      skill: "reading",
      questionType: "true_false_not_given",
      content: "..."
    }
  ],
  knowledgeDebug: {
    strategy: "static_keyword_metadata",
    detectedSkill: "reading",
    detectedQuestionType: "true_false_not_given",
    selectedKnowledgeChunkIds: ["reading_tfng_core_rule"],
    retrievalScores: [{ id: "reading_tfng_core_rule", score: 12 }],
    usedKnowledgeBase: true,
    noMatch: false,
    totalInjectedKnowledgeChars: 320
  }
}
```

### 6.5 Prompt Change

Update `assistant.prompts.js` so the user prompt has a dedicated block:

```text
Retrieved IELTS Knowledge:
Chunk 1:
Title: ...
Skill: ...
Question Type: ...
Content: ...
```

Priority order for IELTS knowledge answers:

1. User's current question.
2. Retrieved IELTS knowledge chunks.
3. Recent conversation.
4. General IELTS knowledge only when retrieved chunks are insufficient.

Priority order when multiple context types exist:

1. For `POST_TEST_REVIEW`, official DB attempt/question/answer/explanation context has higher priority than the Knowledge Base. The Knowledge Base may only supplement general strategy; it must not override official answer data.
2. For `FIND_TEST` and `FIND_LESSON`, DB context is the only trusted source for website records and links.
3. For `IELTS_KNOWLEDGE`, retrieved Knowledge Base chunks have higher priority than generic LLM knowledge.
4. If the Knowledge Base has no relevant chunk, the assistant may use safe general IELTS knowledge but must not claim project Knowledge Base grounding.

The assistant must not claim that a test, lesson, resource, link, official answer, or user score exists unless that data comes from DB context.

### 6.5.1 Out-of-Scope Boundary

The Knowledge Base only supports IELTS learning and IELTSZone website assistance.

The assistant must still refuse or redirect questions that are unrelated to:

- IELTS skills, strategies, question types, band descriptors, grammar, vocabulary, or study planning.
- Existing IELTSZone website features such as tests, lessons, library, profile, history, and post-test review.

If a question is not related to IELTS learning, the IELTS exam, English learning for IELTS, or website usage, the assistant must use the existing out-of-scope response. The presence of a Knowledge Base must not widen scope classification so that unrelated questions are routed to `IELTS_KNOWLEDGE`.

### 6.6 Acceptance Criteria

Phase 1 is accepted only if:

- Asking "Matching headings lam sao de khong sai nhieu?" retrieves a matching headings guide.
- Asking "True False Not Given khac False the nao?" retrieves a TFNG guide.
- Asking "Task 1 overview viet nhu the nao?" retrieves the overview guide.
- Asking "Discuss both views va agree disagree khac gi nhau?" retrieves Task 2 essay-type guidance.
- `FIND_TEST` and `FIND_LESSON` behavior remains DB-grounded and unchanged.
- `POST_TEST_REVIEW` still refuses to invent explanations when official DB context is missing.
- Chat does not return numeric band scores for real Writing/Speaking submissions.
- Unrelated non-IELTS questions still route to out-of-scope behavior.
- A no-match IELTS knowledge query does not inject unrelated chunks and records `knowledgeDebug.noMatch = true`.
- Debug output includes selected chunk IDs, scores, and whether Knowledge Base was used.
- Unit tests cover retrieval selection, prompt injection, and no-regression intent routing.

### 6.7 Suggested Tests

Add or update tests:

```text
backend/tests/unit/api/assistant.knowledge-retriever.test.js
backend/tests/unit/api/assistant.context.test.js
backend/tests/unit/api/assistant.prompts.test.js
backend/tests/unit/api/assistant.intent.test.js
backend/tests/unit/api/assistant.service.test.js
```

Manual/eval updates:

```text
.sdd/specs/global-ielts-virtual-assistant/eval-set.md
```

Suggested local verification:

```text
npm test -- assistant
```

## 7. Phase 2: True RAG With pgvector

### 7.1 When To Start

Start Phase 2 only after Phase 1 is stable and the static knowledge corpus becomes too large or too hard to maintain with keyword/metadata matching.

### 7.2 Proposed Database Table

Use PostgreSQL with pgvector, assuming the environment supports the extension.

Vector dimension must match the chosen embedding model. Do not hardcode the dimension until the embedding provider is selected.

Proposed schema shape:

```sql
CREATE TABLE ielts_knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  skill TEXT,
  topic TEXT,
  question_type TEXT,
  band_level TEXT,
  content TEXT NOT NULL,
  source_type TEXT,
  source_name TEXT,
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding VECTOR(/* provider dimension */),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.3 Proposed Modules

```text
backend/src/api/assistant/assistant.embedding.service.js
backend/src/api/assistant/assistant.knowledge.repository.js
backend/src/api/assistant/assistant.retriever.js
backend/src/api/assistant/assistant.rag.service.js
backend/scripts/assistant-embed-knowledge.js
```

### 7.4 Retrieval Flow

```text
User message
  -> detectIntent()
  -> if IELTS_KNOWLEDGE:
       detect skill/question type
       embed query
       semantic search top K chunks
       apply metadata filters when available
       inject retrieved chunks into prompt
  -> LLM answer
  -> self-check/guardrails
```

### 7.5 Phase 2 Acceptance Criteria

- Static Phase 1 retrieval can be replaced or complemented by semantic retrieval.
- Top-K retrieval returns relevant chunks for paraphrased questions.
- Metadata filters improve precision for skill and question type.
- No website data hallucination is introduced.
- No DB migration is required for users who only run Phase 1.

## 8. Phase 3: Personalized Learning Advice

### 8.1 Goal

Make assistant advice user-aware without turning chat into grading.

Examples:

- Student A often misses TFNG questions, so the assistant prioritizes TFNG strategy.
- Student B has weak Task Response feedback, so the assistant prioritizes planning and idea development.
- Student C has grammar feedback issues, so the assistant suggests grammar-focused practice.

### 8.2 Possible Data Sources

Use existing data first:

- `test_attempts`
- `question_answers`
- `questions`
- `ai_feedback_reports`, if available and reliable
- tutor feedback reports, if available and approved for assistant use

Only add new tables if existing data cannot express the required pattern.

### 8.2.1 Data Access Constraint

Phase 3 must comply with IELTS-07 in `.sdd/constitution.md`: students must not see results when a submission is not in an approved graded state.

For personalized advice:

- Do not read or expose pending, in-progress, failed, or ungraded subjective submissions.
- Only use records whose status is an approved graded/reviewed state for the relevant feature, such as `ai_graded`, `tutor_graded`, `reviewed`, or the equivalent `graded` status if that table uses it.
- Do not expose raw scoring internals unless the existing product already allows the student to see those results.
- Prefer pattern-level advice over raw score disclosure.

Possible future table:

```sql
CREATE TABLE student_error_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  skill TEXT NOT NULL,
  question_type TEXT,
  error_type TEXT NOT NULL,
  frequency INT NOT NULL DEFAULT 1,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);
```

### 8.3 Guardrail

Personalized advice may say:

```text
In your recent Reading attempts, you missed several TFNG-style questions. You should review the difference between False and Not Given.
```

It must not say:

```text
Your Writing is band 5.5.
```

unless that score exists as an official, allowed platform record and the product scope allows showing it in chat.

## 9. Phase 4: Tutor/Admin Knowledge Management

This is a product feature, not a prerequisite for RAG.

Possible features:

- Tutor creates or edits IELTS knowledge chunks.
- Tutor tags chunk skill/question type/band level.
- Admin reviews and publishes chunks.
- PDF upload splits document into chunks.
- Re-generate embeddings after content edits.

Do not start this before Phase 1 and Phase 2 retrieval quality are proven.

## 10. Phase 5: Conversation Summary Memory

### 10.1 Current Priority

This is useful, but not the first bottleneck.

The current assistant already limits recent messages and truncates content. Therefore memory summary should be added after the knowledge layer unless testing shows long conversation quality is a major issue.

### 10.2 Proposed Future Design

Add optional summary storage to `chatbot_sessions`:

```text
summary TEXT or JSONB
summary_updated_at TIMESTAMPTZ
```

After every 5 to 8 turns:

1. Summarize stable user goals, recent topic, and unresolved context.
2. Store the summary.
3. Inject summary plus the latest 2 to 4 messages, not the entire raw history.

### 10.3 Guardrail

The summary must not store sensitive data beyond what is already allowed in assistant chat history.

## 11. File Impact Summary

Phase 1 expected files:

```text
backend/src/api/assistant/knowledge-base/*.json
backend/src/api/assistant/assistant.knowledge-base.js
backend/src/api/assistant/assistant.knowledge-retriever.js
backend/src/api/assistant/assistant.context.js
backend/src/api/assistant/assistant.prompts.js
backend/src/api/assistant/assistant.service.js
backend/tests/unit/api/assistant.knowledge-retriever.test.js
backend/tests/unit/api/assistant.context.test.js
backend/tests/unit/api/assistant.prompts.test.js
backend/tests/unit/api/assistant.service.test.js
.sdd/specs/global-ielts-virtual-assistant/eval-set.md
```

Phase 1 service impact:

- Update `buildContextInjection` or the equivalent context-building path to call the static knowledge retriever when `intent === IELTS_KNOWLEDGE`.
- Preserve the existing `runAssistantPipeline` order: intent detection, guardrails, context injection, prompt construction, AI call, self-check, persistence.
- Do not route `FIND_TEST`, `FIND_LESSON`, or `POST_TEST_REVIEW` through the Knowledge Base retriever.

Phase 2 expected files:

```text
backend/src/api/assistant/assistant.embedding.service.js
backend/src/api/assistant/assistant.knowledge.repository.js
backend/src/api/assistant/assistant.retriever.js
backend/src/api/assistant/assistant.rag.service.js
backend/scripts/assistant-embed-knowledge.js
database migration file, location to be confirmed
```

Phase 3 and later require separate approval.

## 12. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Static knowledge becomes stale | Medium | Keep source files small, reviewed, and versioned. |
| Prompt becomes too large | Medium | Limit top chunks and cap total injected content. |
| Retrieval selects wrong chunk | Medium | Add metadata scoring and unit tests. |
| RAG introduces hallucinated website claims | High | Keep DB data and Knowledge Base data in separate prompt sections. |
| Vector DB setup delays project | High | Do not start pgvector until Phase 1 is accepted. |
| Admin panel expands scope | High | Treat as separate product feature after RAG quality is proven. |

## 13. Rollback Plan

Phase 1 rollback:

- Remove knowledge retrieval modules.
- Remove `knowledgeResults` prompt injection.
- Keep existing `IELTS_KNOWLEDGE` prompt behavior.
- No DB rollback needed because Phase 1 has no migration.

Phase 2 rollback:

- Disable semantic retrieval behind a config flag.
- Fall back to static knowledge retrieval.
- Keep DB table if already migrated, but stop using it at runtime until fixed.

## 14. Approval Checklist

Owner should approve only the desired scope:

- [ ] Approve Phase 1 only: Static IELTS Knowledge Base.
- [ ] Approve Phase 1 plus eval/test updates.
- [ ] Approve Phase 2 design exploration, but no migration yet.
- [ ] Approve Phase 2 implementation including pgvector migration.
- [ ] Approve Phase 3 personalization design only.
- [ ] Approve Phase 4 admin/tutor panel design only.
- [ ] Approve Phase 5 memory summary design only.

Default recommendation:

```text
Approve Phase 1 only: Static IELTS Knowledge Base + eval/test updates.
Do not implement Phase 2 pgvector, embeddings, migrations, PDF ingestion, admin panel, personalization, or memory summary until separate approval.
```

## 15. Recommendation

Approve Phase 1 first.

This gives the best ratio of quality improvement to engineering risk. It directly fixes the current weakness: `IELTS_KNOWLEDGE` has no project-owned knowledge source. It avoids premature pgvector work, avoids database migration risk, and keeps the implementation aligned with the existing assistant pipeline.

After Phase 1 is working and tested, evaluate whether Phase 2 semantic RAG is worth the added infrastructure.
