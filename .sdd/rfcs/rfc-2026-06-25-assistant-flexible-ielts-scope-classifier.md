# RFC: Flexible IELTS Scope Classifier

## Problem

Keyword-only detection (Regex) is insufficient to accurately distinguish between nuanced user intents. For example, "Paraphrase câu này giúp em" and "Paraphrase câu này: people are living longer" both contain the word "paraphrase" and would map to `IELTS_KNOWLEDGE`. However, the former lacks the actual sentence and should map to `CLARIFICATION`, while the latter contains the sentence and should be passed to the LLM for `IELTS_KNOWLEDGE`.

Furthermore, filtering out restricted scopes (e.g., coding, medical advice, explicit band score requests) requires exhaustive keyword lists that are difficult to maintain and easily bypassed.

## Proposed Solution

Introduce an **LLM-based Flexible Scope Classifier**.

The system will use a hybrid routing flow:
1. **Rule-based (Regex) Intents**: `FIND_TEST`, `FIND_LESSON`, `POST_TEST_REVIEW`, `GREETING`, `GRADING_REQUEST_SAFE_FEEDBACK`, `OUT_OF_SCOPE`. These are matched first for performance and determinism.
2. **LLM Scope Classifier**: If regex matches `UNKNOWN`, the prompt is sent to a fast, cheap LLM call (JSON mode) to evaluate the scope and assign an intent.

### JSON Response Structure

The Classifier will be prompted to return exactly this JSON schema:
```json
{
  "intent": "IELTS_KNOWLEDGE | WEBSITE_HELP | CLARIFICATION | OUT_OF_SCOPE | FIND_TEST | FIND_LESSON",
  "allowed": true,
  "confidence": 0.0,
  "reason": "short reason",
  "skill": "reading | listening | writing | speaking | vocabulary | grammar | null",
  "needsUserInput": false,
  "missingInput": null
}
```

### Allowed Scopes
- Finding tests/exams -> `FIND_TEST`
- Finding lessons/resources -> `FIND_LESSON`
- IELTS Reading, Listening, Writing, Speaking
- IELTS grammar, vocabulary, paraphrase, sentence improvement
- IELTS test strategy, study tips, question types
- IELTS Writing Task 1/Task 2
- IELTS Speaking Part 1/2/3
- Website help/navigation/features
- Post-test review after submitted attempt

### Blocked Scopes
- Coding/programming
- Medical, financial, legal, political advice
- Non-IELTS Math/Physics/Chemistry
- Personal life advice unrelated to IELTS study
- Requests to officially grade/assign numeric band scores to Writing/Speaking texts directly in chat
- Requests to invent fake official tests or answers

### Routing Flow
- If `classifierIntent === 'IELTS_KNOWLEDGE'`, route to AI tutor generation.
- If `classifierIntent === 'CLARIFICATION'`, trigger deterministic clarification response.
- If `classifierIntent === 'WEBSITE_HELP'`, inject site knowledge and route to AI generation.
- If `classifierIntent === 'OUT_OF_SCOPE'`, trigger deterministic out-of-scope response.

### Telemetry Updates
`AssistantDebug` will be extended with:
- `ruleIntent`
- `classifierUsed`
- `classifierIntent`
- `classifierConfidence`
- `finalIntent`
- `guardrailApplied`
- `siteKnowledgeUsed`

## Test Plan
- Unit test regex boundaries.
- E2E tests validating the routing in `test-assistant-chat.js` using real AI provider responses to verify classifier behavior against nuanced prompts like:
  - "Paraphrase câu này giúp em"
  - "Paraphrase câu này: people are living longer"
  - "Website này có chức năng gì?"
  - "Chấm bài này band mấy?"
  - "Viết code React cho tôi"
  - "mình muốn luyện reading thì có gì" (Regex `UNKNOWN` -> Classifier `FIND_LESSON` -> DB Query)

## Known Risks & Hardening
- **JSON Parsing Failures**: If the LLM produces invalid JSON, timeouts, or format errors, the system is designed NOT to crash. It catches the error, assigns `error: true`, and returns a safe fallback: `finalResponseMode: 'classifier_error_clarification'`.
- **Latency / Cost**: A 2-tier LLM call (Classifier + Generator) incurs more latency. Telemetry tracks `classifierProviderCalled`, `answerProviderCalled`, and `totalAiCalls` explicitly so we can monitor API usage and optimize with smaller models like Gemini Flash if needed.
- **Classifier Hallucinations**: Since the classifier schema now allows `FIND_TEST` and `FIND_LESSON`, it can directly instruct the service to query the database instead of hallucinating answers. This ensures DB grounding is always enforced.

## Rollback Plan
- Revert `detectIntent` back to including `IELTS_KNOWLEDGE` and `GENERAL_STUDY_TIPS`.
- Remove the LLM step in `runAssistantPipeline`.

## Approval Status
**PENDING**
