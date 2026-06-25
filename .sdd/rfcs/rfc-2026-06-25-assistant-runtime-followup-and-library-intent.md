# RFC: Assistant Runtime Follow-up and Library Intent Gap

**Date**: 2026-06-25  
**Status**: PENDING  
**Feature**: `global-ielts-virtual-assistant`  
**Related RFCs**:
- `.sdd/rfcs/rfc-2026-06-24-assistant-quality-upgrade.md`
- `.sdd/rfcs/rfc-2026-06-24-assistant-ielts-knowledge-upgrade.md`

## Reason

After the latest assistant runtime changes, the assistant is better at separating:

- Website data lookup: tests, lessons, library resources, post-test review.
- IELTS knowledge: concepts, criteria, grammar, vocabulary, strategies.

However, a new runtime gap is visible on the Library page:

```text
User: "co nhung de nao trong he thong"
User: "co de tam trong thu vien khong"
Assistant: "Minh chua tim thay du lieu phu hop..."
```

The screenshot shows Library resources exist, for example:

- `haha` with resource type `pdf`
- `tam` with resource type `audio`

The assistant did not fail because it was asked IELTS knowledge. It failed because the phrase `de` was interpreted as a test lookup (`FIND_TEST`) and therefore queried `mock_tests`, while the visible page data belongs to `library_resources`.

## What Changed in the Previous Two Updates

### Update 1 - IELTS Knowledge Upgrade

Implemented or documented the split between:

- `IELTS_KNOWLEDGE`: no DB required, AI may answer general IELTS learning questions.
- DB-required intents: `FIND_TEST`, `FIND_LESSON`, `POST_TEST_REVIEW`.

Affected runtime behavior:

- Added `IELTS_KNOWLEDGE` intent.
- Added IELTS expert prompting.
- Allowed valid IELTS learning questions to call AI without requiring database rows.
- Kept guardrails against Writing/Speaking grading, band prediction, fake tests, fake answer keys, and fake website data.

Important clarification:

- Questions like "coherence la gi?" are `IELTS_KNOWLEDGE`.
- Questions like "co de/tai lieu nao trong thu vien khong?" are not IELTS knowledge; they are website data lookup.

### Update 2 - Query Robustness and Auto-scroll

Implemented runtime changes for lookup and chat UX:

- Moved `FIND_TEST` / `FIND_LESSON` before `NAVIGATION` in intent routing.
- Added keyword search for `mock_tests` and `library_resources`.
- Kept `is_published = TRUE` as the source-of-truth rule for student-visible data.
- Added fallback query when keyword search is too narrow.
- Added deterministic fallback answer when DB results exist but AI returns generic or invalid output.
- Added assistant chat auto-scroll to the bottom after history load, new messages, streaming, done/error, and suggested links.

Files affected by Update 2:

- `backend/src/api/assistant/assistant.intent.js`
- `backend/src/api/assistant/assistant.context.js`
- `backend/tests/unit/api/assistant.intent.test.js`
- `frontend/src/features/global-assistant/components/GlobalAssistantPanel.jsx`
- `frontend/src/features/global-assistant/components/ChatMessageList.jsx`

## Current Gap

The current intent routing is still too literal around the Vietnamese word `de`.

In IELTS pages:

- `de reading`, `de speaking`, `de thi`, `mock test` should map to `FIND_TEST`.

In Library context:

- `de trong thu vien`, `de tam trong thu vien`, or a title search while on `/library` should usually map to `FIND_LESSON`, because Library cards are rows from `library_resources`.

The assistant needs page-aware intent routing:

```text
If pageType or route is library:
  "de" can mean "item/resource shown in library"
  Prefer FIND_LESSON unless the user clearly says mock test / de thi / reading test.
```

## Proposed Follow-up Change

Add page-context-aware disambiguation.

### Intent Rules

1. If `context.pageType === 'lesson'` or frontend sends `pageType === 'library'`:
   - Questions containing `thu vien`, `tai lieu`, `pdf`, `audio`, `video`, `sach`, `resource`, or a visible resource title should route to `FIND_LESSON`.
   - Only route to `FIND_TEST` when user clearly says `mock test`, `practice test`, `de thi`, `reading test`, `listening test`, `speaking test`, or `writing test`.

2. If user asks broad website test availability:
   - "co nhung de nao trong he thong" should route to `FIND_TEST`.

3. If user asks Library item availability:
   - "co de tam trong thu vien khong" should route to `FIND_LESSON`.

### Context Query Rules

For `FIND_LESSON`:

- Query `library_resources`.
- Keep `is_published = TRUE`.
- Search keyword terms against `title`, `description`, `resource_type`, and `category` when the column exists.
- If keyword search is empty, return latest published resources.

For `FIND_TEST`:

- Query `mock_tests`.
- Keep `is_published = TRUE`.
- Search keyword terms against `title`, `description`, `skill`, and `difficulty`.

## Eval Cases to Add

| User Question | Page Context | Expected Intent | Acceptable Result |
|---|---|---|---|
| `co nhung de nao trong he thong` | home | `FIND_TEST` | List published tests or missing-data if none exist. |
| `co de tam trong thu vien khong` | library | `FIND_LESSON` | Find `tam` from `library_resources` if published. |
| `thu vien co tai lieu audio nao` | library | `FIND_LESSON` | List published audio resources. |
| `co de reading Cambridge 18 khong` | home/reading | `FIND_TEST` | Search `mock_tests` by skill and keyword. |
| `coherence trong IELTS Writing la gi` | any | `IELTS_KNOWLEDGE` | Explain concept; no DB required. |

## Files Expected to Change Next

- `backend/src/api/assistant/assistant.intent.js`
- `backend/src/api/assistant/assistant.context.js`
- `backend/tests/unit/api/assistant.intent.test.js`
- `frontend/src/features/global-assistant/hooks/useAssistantAvailability.js` or equivalent availability source, if the frontend currently does not send `pageType: 'library'`.
- `.sdd/specs/global-ielts-virtual-assistant/eval-set.md`

## Approval Status

PENDING
