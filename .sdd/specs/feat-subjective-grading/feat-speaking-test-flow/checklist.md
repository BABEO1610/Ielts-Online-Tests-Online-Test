# Specification Quality Checklist: feat-speaking-test-flow

**Purpose**: Validate specification completeness, clarity, consistency, and testability for Speaking Test Flow requirements.
**Created**: 2026-07-23
**Feature**: [spec.md](./spec.md)

## Requirement Completeness

- [x] CHK001 Are 3-part state machine transitions (Intro → Part 1 → Part 2 → Part 3 → Summary → Result) fully specified? [Completeness, Spec §FR-001]
- [x] CHK002 Are temporary audio upload requirements and storage key patterns (`speaking/{userId}/{uuid}.ext`) clearly documented? [Completeness, Spec §FR-003]
- [x] CHK003 Are requirements defined for Part 2 preparation time (60s) vs speaking time (120s)? [Completeness, Spec §FR-005]
- [x] CHK004 Are database transaction boundaries specified for saving grouped speaking submissions (`speaking_group_id`)? [Completeness, Spec §FR-009]
- [x] CHK005 Are error handling requirements specified when AI grading fails post-submission? [Completeness, Spec §FR-011]

## Requirement Clarity

- [x] CHK006 Is the storage path security rule (`speaking/{userId}/` ownership + no `..`) explicitly defined? [Clarity, Spec §FR-008]
- [x] CHK007 Are part count validation requirements (`parts.length === 3`) explicitly quantified? [Clarity, Spec §FR-007]
- [x] CHK008 Are legacy endpoint (`POST /speaking`) rejection rules for `grader = ai` explicitly stated? [Clarity, Spec §FR-010]

## Requirement Consistency

- [x] CHK009 Do frontend submission payload requirements align with backend `SubmissionController` contract? [Consistency, Spec §FR-007, Plan]
- [x] CHK010 Are grader routing rules (`grader = ai` vs `grader = tutor`) consistent between student selection and tutor queue boundaries? [Consistency, Spec §FR-012]

## Scenario & Edge Case Coverage

- [x] CHK011 Are requirements defined for invalid or malicious storage paths (path traversal, wrong user ID)? [Coverage, Spec §FR-008]
- [x] CHK012 Are requirements defined for incomplete submissions (fewer than 3 parts)? [Coverage, Spec §FR-007]
- [x] CHK013 Are requirement specifications clear regarding immutability of submission history? [Coverage, Spec §FR-009]

## Measurability & Success Criteria

- [x] CHK014 Is the 100% rejection rate for unowned audio paths objectively testable? [Measurability, Spec §SC-002]
- [x] CHK015 Is the sub-1-second submission enqueue latency target testable under baseline conditions? [Measurability, Spec §SC-006]
