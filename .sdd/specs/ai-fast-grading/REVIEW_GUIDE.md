# Hướng dẫn review hội đồng: AI Fast Grading

## 1. Kết luận ngắn

Phần nền tảng đã được triển khai theo chế độ **fail-closed**:

- Writing giữ luồng chấm hiện có, bổ sung validation, idempotency và quota dùng chung.
- Speaking upload audio riêng tư, nộp bất đồng bộ, xử lý bằng worker và theo dõi trạng thái.
- Gemini API key chỉ là credential gọi provider; file OpenAPI là hợp đồng giữa frontend/backend, không thay thế hoặc chứa API key.
- Speaking dùng transcript ASR cho Coherence/Lexical/Grammar và audio thật cho Fluency/Pronunciation; chỉ trả khi đủ bốn tiêu chí dưới nhãn `AI Estimated Band`.
- Lỗi AI tự retry rồi `failed`, không tự chuyển tutor. Tutor chỉ nhận bài học viên chủ động chọn `grader=tutor` và có nút AI prelim để tạo bản nháp chỉnh sửa.

## 2. Database: thêm gì và tận dụng gì

Chỉ thêm đúng hai bảng nghiệp vụ của feature:

1. `ai_grading_jobs`: queue, lease, retry, idempotency, quota reservation và audit trạng thái.
2. `speaking_analysis_artifacts`: evidence có phiên bản cho từng Speaking Part.

Các bảng hiện có được tận dụng:

- `writing_submissions`, `speaking_submissions`: bài nộp và group ba Part.
- `ai_grading_reports`: kết quả nghiệp vụ cuối, không dùng làm queue.
- `ai_usage_logs`: usage/metrics đã làm sạch.
- `tutor_feedback_reports`: kết quả tutor và soft-delete khi thu hồi.
- `assigned_tutor_id` trên `speaking_submissions`: assignment; không tạo bảng assignment mới.
- `mock_tests`, `test_passages`, `users`: nguồn đề và quyền sở hữu.

`schema_migrations` có thể được runner tạo nếu hệ thống chưa có bảng tương đương. Đây là bảng hạ tầng dùng chung toàn repository, không phải bảng feature thứ ba.

`008a` có `CREATE TABLE IF NOT EXISTS library_resources`, nhưng không đưa thêm bảng nghiệp vụ AI. Đây là bootstrap nguyên trạng bảng legacy vốn đã được định nghĩa ở migration `012`, vì migration lịch sử `011` lại tham chiếu bảng đó trước `012`. Trên database hiện hữu đã có bảng, câu lệnh là no-op; static test khóa schema bootstrap phải trùng schema gốc của `012`. Cách này tránh sửa checksum các migration lịch sử đã có thể được triển khai.

Migration cần review theo thứ tự:

1. `008a_bootstrap_missing_prerequisites.sql`
2. `025_harden_ai_grading_schema.sql`
3. `026_create_speaking_analysis_artifacts.sql`

Database hiện tại đã được baseline có xác nhận và apply `025`–`026` sau một bản backup `public` đã verify; số dòng nghiệp vụ trước/sau không đổi. Trước khi tuyên bố production-ready vẫn phải chạy fresh/concurrency và diễn tập restore trên PostgreSQL disposable/staging.

## 3. Luồng demo nên trình bày

1. Học viên ghi đủ ba Part bằng MIME được policy cho phép.
2. Frontend xin ba signed upload, PUT trực tiếp với `credentials: omit`, chỉ giữ opaque upload token.
3. `POST /speaking/full` với `grader=ai` trả `202` và job `queued`; refresh trang vẫn phục hồi polling.
4. Worker xác minh checksum/audio, tạo transcript/evidence và dùng fencing để ngăn worker cũ ghi kết quả.
5. Job thành công trả `completed/full_audio`, đủ bốn criterion band và Overall; màn hình ghi rõ đây là điểm AI ước tính để luyện tập.
6. Giả lập lỗi provider retryable: hai attempt tự động, sau đó learner mới thấy một nút chấm lại idempotent; group vẫn thuộc `grader=ai`.
7. Nộp một bài khác với `grader=tutor`; hai tutor thử claim thì chỉ một người thành công, tutor khác không xem audio/detail.
8. Tutor được phân công chạy “AI chấm nháp để tutor chỉnh sửa”, kiểm tra bốn ô điểm được điền nhưng database chỉ có tutor report sau khi tutor bấm lưu.

## 4. Bộ file nên giữ khi nộp hội đồng

Tài liệu bắt buộc:

- `spec.md`, `plan.md`, `tasks.md`, `research.md`, `data-model.md`, `quickstart.md`
- `checklist.md`, `checklists/requirements.md`, `REVIEW_GUIDE.md`
- `contracts/speaking-grading-api.md`, `contracts/speaking-grading.openapi.yaml`

Mã nguồn/migration cốt lõi:

- `backend/src/db/migrations/008a_bootstrap_missing_prerequisites.sql`
- `backend/src/db/migrations/025_harden_ai_grading_schema.sql`
- `backend/src/db/migrations/026_create_speaking_analysis_artifacts.sql`
- `backend/scripts/migrate.js`, `backend/scripts/baseline-migrations.js`
- `backend/src/config/aiGrading.config.js`
- `backend/src/ai/calibration/`, `speakingResult.validator.js`, `transcriber.adapter.js`, `speechEvidence.adapter.js`, `speakingRubricScorer.adapter.js` và cổng `grading.service.js`
- `backend/src/security/`, `backend/src/storage/`, `backend/src/media/`
- `backend/src/db/queries/aiGradingJobs.queries.js`, `speakingAnalysis.queries.js`
- `backend/src/services/speakingSubmission.service.js`, `speakingSubmission.helpers.js`, `speakingSubmission.persistence.js`, `speakingEvidence.service.js`, `speakingGrading.service.js`, `speakingGradingRetry.service.js`, `speakingTutorPrelim.service.js`, `aiQuota.service.js`
- `backend/src/jobs/`, `backend/src/worker.js`
- Các controller/route/tutor/submission/AI service đã thay đổi trong diff.
- `frontend/src/hooks/useSpeakingGrading.js`, `frontend/src/pages/subjective-testing/speakingTest.utils.js` và các file grading/recorder/history/tutor đã thay đổi trong diff.
- Toàn bộ test mới dưới `backend/tests/{contract,integration,unit}` và các test frontend liên quan.

Giữ `.env.example` ở root để hội đồng biết đầy đủ tên biến và fail-closed defaults; T072 đã kiểm tra file này không chứa credential thật. Tuyệt đối không nộp `.env` thật.

## 5. File/dữ liệu không được đưa vào gói review

- `.env`, API key Gemini/AWS/Supabase, private key ký calibration hoặc credential database.
- `node_modules/`, `dist/`, coverage, log runtime, file audio tạm và object-storage dump.
- Audio/ngữ liệu calibration có dữ liệu cá nhân nếu chưa ẩn danh và chưa có quyền sử dụng.
- Baseline SQL sinh từ production, database snapshot thật hoặc signed URL còn hiệu lực.
- Các thay đổi ngoài feature nếu hội đồng chỉ review `ai-fast-grading`; nên tách diff/commit để tránh nhiễu.
- Các artifact phục hồi ở root như `recovered_FeedbackReport.jsx`, `recovered_FeedbackReport.txt`, `recovered_outputs.json`; đây không phải source runtime và không được đưa vào gói review.

## 6. Bằng chứng hiện có

- Lần đối chiếu docs ngày 2026-07-22 đúng phạm vi AI Fast Grading: tập Speaking/OpenAPI tái lập trong `quickstart.md` đạt backend 6 suite, 23/23 test; frontend Speaking grading đạt 2 file, 6/6 test.
- Writing regression chưa xanh: backend còn 1 fail vì envelope lỗi ngắn chưa đặt `word_count`/`required_words` trong `error.details` và `request_id` trong `meta` (T070); frontend Writing Detail còn 1 fail vì thiếu `Overall Writing Band` tổng hợp 33%/67% (T071).
- Các số liệu full-suite 29 suite/130 test backend và 6 file/32 test frontend là bản ghi lịch sử của lượt kiểm tra trước; cần chạy lại nếu dùng làm bằng chứng hội đồng.
- Kết quả lint của chatbot thuộc feature `global-ielts-virtual-assistant`, không được dùng làm bằng chứng đạt cho AI Fast Grading. Lượt chuẩn hóa tài liệu này không tuyên bố lint/coverage toàn feature xanh; các cổng tương ứng vẫn được giữ mở trong T056 và rehearsal phát hành.
- `node --check`/build ghi nhận trước cần chạy lại trong release rehearsal nếu dùng làm bằng chứng cuối.
- Giới hạn Constitution 300 dòng/file và 40 dòng/hàm đạt cho backend feature mới cùng hook polling/summary mới; các màn hình frontend kế thừa còn nợ refactor được giữ ở T059.
- Frontend production build đạt; bundle 2.886,27 kB (gzip 814,40 kB) còn cảnh báo lớn, không chặn tính đúng nhưng phải code-split ở T059 trước production.
- OpenAPI parse được, local refs resolve và các nhánh AI/tutor/cache-control/response envelope được contract test.

Chưa có bằng chứng provider end-to-end có thể tái lập cho Speaking ba Part: các lần demo gần nhất dừng ở lỗi quota và job `failed`. Code/test mô phỏng đã chứng minh shape `completed/full_audio`, nhưng không được thay cho smoke test audio thật. Writing từng hoạt động trong demo nhưng không được coi là regression hiện tại đang xanh cho tới khi T070–T071 đạt; lần rehearsal cuối phải ghi model, thời gian và response đã làm sạch thay vì dùng số liệu cũ không tái lập.

## 7. Cổng còn mở trước production

- **G-01 Calibration**: chưa có bundle đã ký và được hội đồng phê duyệt; kết quả hiện chỉ được gọi là `AI Estimated Band`, không phải điểm IELTS chính thức.
- **G-02 Speech evidence**: Gemini đã phân tích audio thật, nhưng vẫn cần đo độ tin cậy trên gold set người Việt trước khi nâng nhãn chất lượng; transcript-only không đủ.
- **G-03 Audio format**: WebM chỉ được bật sau RFC/policy; browser không có MIME được duyệt phải bị chặn rõ ràng.
- **G-04 Privacy/retention**: chốt retention, backfill audio public legacy sang private storage và quy trình xóa.
- **G-05 Database/reliability**: chạy migration, concurrency, restore, load/chaos test trên môi trường disposable/staging.
- **G-06 Cost/scale**: duyệt forecast traffic, quota provider, storage và ngưỡng cảnh báo.
- **G-07 Frontend maintainability**: tách các màn hình legacy vượt giới hạn và code-split bundle 2.883,70 kB theo T059.
- **G-08 Runtime evidence detail**: Gemini transcription hiện là plain transcript, ba Part chạy tuần tự và chưa có chunk/deduplicate; chỉ tuyên bố structured ASR/bounded parallel/chunking sau T068–T069.

Cho tới khi các cổng này đóng, cấu hình phù hợp để demo/review là `AI Estimated Band` đủ bốn tiêu chí với disclaimer. Không quảng bá nó là điểm IELTS chính thức/đã hiệu chuẩn và không tự handoff tutor khi AI lỗi.
