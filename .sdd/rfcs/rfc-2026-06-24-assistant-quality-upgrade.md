# RFC: Assistant Quality Upgrade

**Date**: 2026-06-24  
**Status**: PENDING  
**Feature**: `global-ielts-virtual-assistant`

## Lý Do Thay Đổi

Global Assistant cần trả lời dựa trên dữ liệu thật của hệ thống thay vì chỉ dựa vào prompt hoặc tài liệu SDD. Các cập nhật này bổ sung schema snapshot, feature-to-table mapping, intent context map và golden eval set để giảm rủi ro assistant bịa bảng, bịa test/lesson, hoặc trả lời ngoài phạm vi.

## Những Gì Thay Đổi So Với tasks.md Gốc

- Thêm task: fix dòng changelog cuối bị corrupt/không đúng format trong `.sdd/agents_changelog.md`.
- Thêm task: tạo `.sdd/context/db-schema-snapshot.md` làm snapshot schema thật từ `.sdd/shared_context.md`.
- Thêm task: thêm `Feature-to-Table Mapping` vào `.sdd/shared_context.md`.
- Thêm task: reconcile section Database hiện có trong Global Assistant spec với schema thật.
- Thêm task: thêm `INTENT_CONTEXT_MAP` vào `backend/src/api/assistant/assistant.constants.js`.
- Thêm task: tạo golden eval set tối thiểu 25 câu cho Global Assistant.
- Thêm task: yêu cầu human review trước khi tiếp tục runtime code dựa trên schema mapping.

## Những Gì Giữ Nguyên

- Không thay đổi Constitution.
- Không thêm migration database trong RFC này.
- Không thay đổi business rule Guest không được chat.
- Không thay đổi active-test block.
- Không mở scope AI Writing/Speaking grading cho Global Assistant.
- Không dùng vector database, embeddings hoặc advanced RAG trong phase hiện tại.
- Tiếp tục ưu tiên `chatbot_sessions` và `chatbot_messages` cho session memory.

## Files Bị Ảnh Hưởng

- `.sdd/agents_changelog.md`
- `.sdd/context/db-schema-snapshot.md`
- `.sdd/shared_context.md`
- `.sdd/specs/global-ielts-virtual-assistant/spec.md`
- `.sdd/specs/global-ielts-virtual-assistant/eval-set.md`
- `backend/src/api/assistant/assistant.constants.js`

## Approval Status

PENDING
