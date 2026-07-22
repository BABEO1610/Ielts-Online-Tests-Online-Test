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

Nên giữ `.env.example` ở root để hội đồng biết tên biến, nhưng tuyệt đối không nộp `.env` thật.

## 5. File/dữ liệu không được đưa vào gói review

- `.env`, API key Gemini/AWS/Supabase, private key ký calibration hoặc credential database.
- `node_modules/`, `dist/`, coverage, log runtime, file audio tạm và object-storage dump.
- Audio/ngữ liệu calibration có dữ liệu cá nhân nếu chưa ẩn danh và chưa có quyền sử dụng.
- Baseline SQL sinh từ production, database snapshot thật hoặc signed URL còn hiệu lực.
- Các thay đổi ngoài feature nếu hội đồng chỉ review `ai-fast-grading`; nên tách diff/commit để tránh nhiễu.

## 6. Bằng chứng hiện có

- Backend mục tiêu: 29 suite, 130/130 test đạt.
- Frontend mục tiêu: 6 file, 32/32 test đạt.
- Feature-targeted ESLint: backend và frontend đạt, không có warning/error.
- `node --check`: toàn bộ JavaScript mục tiêu của feature đạt.
- Giới hạn Constitution 300 dòng/file và 40 dòng/hàm đạt cho backend feature mới cùng hook polling/summary mới; các màn hình frontend kế thừa còn nợ refactor được giữ ở T059.
- Frontend production build đạt; bundle 2.886,27 kB (gzip 814,40 kB) còn cảnh báo lớn, không chặn tính đúng nhưng phải code-split ở T059 trước production.
- OpenAPI parse được, local refs resolve và các nhánh AI/tutor/cache-control/response envelope được contract test.

Đã chạy smoke test provider thật, đọc ba audio private và trả `completed/full_audio` đủ bốn tiêu chí trong khoảng 34 giây; test này không sửa report/job lịch sử. Chưa chạy load/chaos test và chưa có calibration/fairness approval. Migration đã chạy trên database hiện tại có backup, nhưng không thay thế restore rehearsal/staging.

Smoke test Writing vô danh cũng đạt trong khoảng 11 giây bằng `gemini-3.6-flash`, trả đủ bốn tiêu chí; lỗi 404 do model `gemini-2.5-flash` cũ không còn trong cấu hình grading. Lint mục tiêu sạch; lint toàn repository vẫn có lỗi legacy ngoài feature (backend 27, frontend 344) và không được ghi nhận là gate đã đạt.

## 7. Cổng còn mở trước production

- **G-01 Calibration**: chưa có bundle đã ký và được hội đồng phê duyệt; kết quả hiện chỉ được gọi là `AI Estimated Band`, không phải điểm IELTS chính thức.
- **G-02 Speech evidence**: Gemini đã phân tích audio thật, nhưng vẫn cần đo độ tin cậy trên gold set người Việt trước khi nâng nhãn chất lượng; transcript-only không đủ.
- **G-03 Audio format**: WebM chỉ được bật sau RFC/policy; browser không có MIME được duyệt phải bị chặn rõ ràng.
- **G-04 Privacy/retention**: chốt retention, backfill audio public legacy sang private storage và quy trình xóa.
- **G-05 Database/reliability**: chạy migration, concurrency, restore, load/chaos test trên môi trường disposable/staging.
- **G-06 Cost/scale**: duyệt forecast traffic, quota provider, storage và ngưỡng cảnh báo.
- **G-07 Frontend maintainability**: tách các màn hình legacy vượt giới hạn và code-split bundle 2.883,70 kB theo T059.

Cho tới khi các cổng này đóng, cấu hình phù hợp để demo/review là `AI Estimated Band` đủ bốn tiêu chí với disclaimer. Không quảng bá nó là điểm IELTS chính thức/đã hiệu chuẩn và không tự handoff tutor khi AI lỗi.
