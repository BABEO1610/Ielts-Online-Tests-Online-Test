# Deploy AI Speaking Worker lên VPS

Runbook này chỉ áp dụng sau khi thay đổi đã được merge vào `main`. Không chạy baseline migration, không xóa database, không sửa migration đã applied và không in nội dung `.env.production`.

## 1. Chuẩn bị và lấy source

```bash
cd /root/Ielts-Online-Tests-Online-Test

git status --short
```

Nếu lệnh trên có output, dừng lại để xác định chủ sở hữu thay đổi. Không dùng `git reset --hard`.

Sao lưu file môi trường mà không hiển thị nội dung và ghi lại commit để rollback:

```bash
cp .env.production ".env.production.backup.$(date +%Y%m%d-%H%M%S)"
chmod 600 .env.production

PREVIOUS_COMMIT="$(git rev-parse HEAD)"
printf 'Previous commit: %s\n' "$PREVIOUS_COMMIT"
```

Chỉ commit hash là dữ liệu được phép ghi lại; không ghi giá trị biến môi trường.

```bash
git pull origin main
```

## 2. Validate, build và migrate

Validate Compose trước khi tạo container:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  config --quiet
```

Worker dùng chung image `ieltszone-backend:latest`, vì vậy chỉ build service `backend` một lần; không cần build riêng `speaking-worker`:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  build --no-cache backend frontend
```

Chạy preflight bằng image mới, rồi mới chạy migration. Bất kỳ lệnh nào lỗi đều phải dừng deploy:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  run --rm --no-deps backend npm run migrate:preflight

docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  run --rm --no-deps backend npm run migrate
```

Migration runner kiểm tra checksum của migration đã applied. Không chạy `migrate:baseline`, không chạy SQL của migration 030 bằng tay và không chỉnh nội dung migration cũ.

## 3. Khởi động và kiểm tra container

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  up -d --remove-orphans

docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  ps
```

Phải thấy ít nhất `backend`, `speaking-worker`, `frontend` và `redis` ở trạng thái chạy. Worker không được publish port.

Kiểm tra media binary thực sự nằm trong worker container:

```bash
docker exec ieltszone-speaking-worker sh -lc '
  set -e
  command -v ffmpeg
  command -v ffprobe
  ffmpeg -version | head -n 1
  ffprobe -version | head -n 1
'
```

Chạy runtime checker an toàn:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  exec -T backend npm run speaking:runtime-check
```

Kết quả bắt buộc có `prerequisites: ok`, `ffmpeg_executable: true`, `ffprobe_executable: true`, đủ migrations `025`, `026`, `030`, và index `uq_speaking_artifact_job_config` gồm `speaking_submission_id`, `audio_sha256`, `scoring_config_sha256`, `source_job_id`. Đây cũng là cách kiểm tra migrations/index mà không in connection string.

Xem log ngắn:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  logs --tail=200 backend speaking-worker
```

Không sao chép hoặc dán log ra ngoài nếu log chứa secret, signed URL, audio storage key hoặc transcript. Theo dõi worker trong lúc smoke test:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  logs -f speaking-worker
```

Sau bài test, chạy lại checker để xem job gần đây, tuổi job queued cũ nhất và các mã lỗi đã sanitize:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  exec -T backend npm run speaking:runtime-check
```

## 4. Smoke test một bài Speaking thật

Không đưa audio hoặc transcript thật vào log release. Dùng một tài khoản học viên được phép test và chọn rõ `grader=ai`.

1. Mở DevTools → Network, bật Preserve log; không export HAR vì HAR có thể chứa token/signed URL.
2. Ghi đủ Part 1, Part 2, Part 3 bằng định dạng trình duyệt hiện được hỗ trợ.
3. Xác minh có ba request `POST /api/v1/submissions/speaking/audio-uploads` thành công và ba request PUT tới private Supabase storage thành công.
4. Nộp bài và xác minh `POST /api/v1/submissions/speaking/full` trả HTTP 202, có `speaking_group_id`, `job_id`, `status=queued` và status URL.
5. Theo dõi `GET /api/v1/submissions/speaking/{groupId}/grading-status`; ghi lại chỉ status/stage, không ghi result text. Phải quan sát pipeline đi qua `queued`, `running/validating_audio`, `analyzing`, `scoring`, `finalizing`, rồi `completed`.
6. Trong worker log, xác nhận job được claim. Không cần và không được log transcript, object key hay provider raw response.
7. Ở kết quả learner, xác minh `assessment_type=estimated`, `evidence_mode=full_audio`, `is_partial_assessment=false`, `requires_human_review=false`.
8. Xác minh có đúng ba transcript/feedback khớp Part 1/2/3; đủ bốn criterion band; có Overall, disclaimer `AI Estimated Band`, pipeline/calibration version và thời gian tạo.
9. Bấm nghe lại cả ba Part. Nếu signed URL hết hạn, dùng nút tải lại và xác minh frontend xin URL mới; lỗi một Part không được làm crash toàn report.
10. Xác minh `completed` không có nút **Chấm lại bằng AI**. Chỉ bài `failed` với `can_retry=true` mới có nút; retry phải theo canonical child job và không trừ quota lần nữa.
11. Kiểm tra hàng chờ tutor: bài AI này không được tạo tutor assignment và cả ba submission vẫn giữ `grader=ai`.

Đây là smoke test provider thật bắt buộc trước khi gọi release là production-ready. Automated tests trong repository không gọi Gemini thật.

## 5. Rollback source/container

Rollback source chỉ khi đã xác định commit trước deploy ở biến `PREVIOUS_COMMIT`. Không rollback/xóa database và không chạy reverse SQL migration phá dữ liệu.

```bash
cd /root/Ielts-Online-Tests-Online-Test
git status --short
git switch --detach "$PREVIOUS_COMMIT"

docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  config --quiet

docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  build --no-cache backend frontend

docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  up -d --remove-orphans

docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  ps
```

Nếu commit cũ không có `speaking-worker`, rollback sẽ làm luồng Speaking bất đồng bộ ngừng claim job; cân nhắc giữ release mới và xử lý sự cố thay vì rollback mù. Khi quay lại bản mới: `git switch main && git pull origin main`, rồi lặp lại validate/build/preflight/migrate/up.

## 6. Sau khi rotate secret

Các secret từng lộ phải được rotate ngoài repository. Sau khi cập nhật `.env.production`, recreate API và worker để cả hai nhận credential mới:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  up -d --force-recreate backend speaking-worker
```

Sau đó chạy lại kiểm tra container, media binary và runtime checker ở trên.
