# Checklist chất lượng đặc tả: Chấm nhanh Speaking bằng AI

**Mục đích**: Kiểm tra chất lượng, độ đầy đủ và khả năng kiểm thử của yêu cầu; không phải checklist chạy implementation.  
**Đặc tả**: [spec.md](./spec.md)

## Chất lượng nội dung

- [x] CHK001 Spec diễn đạt nhu cầu và hành vi, còn chi tiết code nằm trong plan/tasks.
- [x] CHK002 Ranh giới learner AI, tutor-selected flow và legacy fallback được nêu rõ.
- [x] CHK003 Thuật ngữ group, Part, job, stage, artifact, report và canonical chain nhất quán.
- [x] CHK004 Estimate và calibrated publication được tách thành hai mức rõ ràng.
- [x] CHK005 Không còn placeholder hoặc `[NEEDS CLARIFICATION]`.

## Độ đầy đủ và rõ ràng

- [x] CHK006 Mỗi user story có ưu tiên, kiểm thử độc lập và kịch bản Given/When/Then.
- [x] CHK007 Exact Part set, token binding, private storage và object preflight đều có yêu cầu.
- [x] CHK008 Transaction boundary, idempotency, fingerprint và quota được quy định.
- [x] CHK009 Lease/fencing, retry budget, watchdog và manual retry chain được quy định.
- [x] CHK010 ASR/audio evidence và điều kiện fail-closed cho bốn criterion được phân biệt.
- [x] CHK011 Overall half-up và việc bỏ provider Overall/reliability được định nghĩa.
- [x] CHK012 Authorization owner/assigned tutor/admin và AI prelim không persist được nêu rõ.
- [x] CHK013 Legacy fallback không được dùng để tạo band/artifact mới.

## Tính nhất quán với code hiện tại

- [x] CHK014 Endpoint trong plan khớp `backend/src/routes/api/v1/submissions.routes.js` và tutor routes.
- [x] CHK015 State/stage khớp constraints/query/finalizer hiện hành.
- [x] CHK016 Plan ghi đúng worker chỉ claim Speaking và provider call ngoài transaction.
- [x] CHK017 Machine-readable OpenAPI được giữ vì contract test thực thi.
- [x] CHK018 Các regression/gate còn mở xuất hiện trong cả plan và tasks, không bị tuyên bố hoàn tất.

## Khả năng kiểm thử và đo lường

- [x] CHK019 Success criteria định lượng concurrency, evidence, authorization, latency và coverage.
- [x] CHK020 Happy path, invalid upload, stale lease, retry, calibration failure và IDOR đều kiểm thử được.
- [x] CHK021 Task items có ID, story tag và đường dẫn file chính xác.
- [x] CHK022 Conditional tasks T028/T029 có điều kiện kích hoạt rõ ràng.
- [x] CHK023 Ma trận user story ↔ yêu cầu ↔ task bao phủ toàn phạm vi.
- [x] CHK024 Provider smoke/approval/load evidence không bị thay thế bằng mock test.

## Ghi chú

- Chất lượng đặc tả đạt để tiếp tục triển khai.
- Production release chưa đạt cho tới khi các task `[ ]` và release gates trong `tasks.md` được xử lý.
