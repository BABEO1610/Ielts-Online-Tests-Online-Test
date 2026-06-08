# GLOBAL CONSTRAINTS — Ràng buộc kỹ thuật toàn hệ thống
# Project: IELTSZone | Version: 1.0 | Location: .sdd/constraints/global.md
#
# Mục đích: Chứa các ràng buộc KỸ THUẬT áp dụng cho TOÀN BỘ hệ thống.
#           Mọi spec / code / AI output phải tuân thủ các ngưỡng dưới đây.
#           Đây là nơi chứa "con số cụ thể" — dễ điều chỉnh hơn constitution.md.
#
# Cross-ref: .sdd/constitution.md (ARTICLE 1, 2), .agents/AGENTS.md

---

## G-01 — RUNTIME & MÔI TRƯỜNG

| Ràng buộc            | Giá trị                          | Ghi chú                        |
|----------------------|----------------------------------|--------------------------------|
| Node.js              | 20 LTS (không downgrade)         | Theo Constitution ARTICLE 1    |
| Môi trường           | development / staging / production | Phân biệt qua NODE_ENV       |
| Timezone lưu trữ     | UTC (TIMESTAMPTZ)                | Convert sang local ở frontend  |
| Encoding             | UTF-8 toàn hệ thống              |                                |

---

## G-02 — GIỚI HẠN API

| Ràng buộc                     | Giá trị            | Lý do                              |
|-------------------------------|--------------------|------------------------------------|
| Timeout request mặc định      | 30 giây            | Trừ AI grading (xem business.md)   |
| Payload tối đa (JSON body)    | 1 MB               | Chống abuse                        |
| Pagination mặc định           | 20 item/trang      | `?page=1&limit=20`                 |
| Pagination tối đa             | 100 item/trang     | `limit` > 100 bị reject 422        |
| Rate limit (chung)            | 100 req/phút/IP    | express-rate-limit                 |
| Rate limit (auth endpoints)   | 10 req/phút/IP     | Chống brute-force                  |
| API versioning                | prefix `/api/v1/`  | Bắt buộc cho mọi endpoint          |

> Mọi response phải theo format `{ success, data, error, meta }` (Constitution ARTICLE 2).

---

## G-03 — GIỚI HẠN FILE & UPLOAD

| Loại file              | Giới hạn kích thước | Định dạng cho phép           |
|------------------------|---------------------|------------------------------|
| Writing (ảnh/PDF)      | 10 MB               | pdf, png, jpg, jpeg          |
| Speaking (audio)       | 50 MB               | mp3, m4a, wav                |
| Library resource       | 50 MB               | pdf, mp3, mp4, docx          |
| Avatar                 | 2 MB                | png, jpg, jpeg               |

- Validate MIME bằng magic bytes (`file-type`), KHÔNG chỉ dựa extension (Constitution SEC-04).
- Storage: Local (Multer) trong dev → S3 khi production.
- Đường dẫn upload: `/uploads/{type}/{uuid}.{ext}` — KHÔNG dùng tên file gốc của user.

---

## G-04 — HIỆU NĂNG (Performance budget)

| Chỉ số                          | Ngưỡng mục tiêu     |
|---------------------------------|---------------------|
| API response (p95, không-AI)    | < 500 ms            |
| Query DB đơn lẻ                 | < 100 ms            |
| Frontend First Contentful Paint | < 2 giây            |
| Bundle JS (gzipped)             | < 300 KB            |

- Mọi truy vấn list phải có index phù hợp (xem shared_context.md phần INDEXES).
- Không N+1 query — dùng JOIN hoặc batch.

---

## G-05 — FRONTEND

| Ràng buộc          | Giá trị                                      |
|--------------------|----------------------------------------------|
| Trình duyệt hỗ trợ | 2 phiên bản gần nhất của Chrome, Firefox, Edge, Safari |
| Responsive         | Bắt buộc: mobile (≥360px), tablet, desktop  |
| UI Framework       | Bootstrap 5.x — không Tailwind/CSS-in-JS    |
| State              | React hooks — không class components         |
| i18n               | Mặc định tiếng Việt; chuỗi UI tách ra dễ dịch|

---

## G-06 — DATABASE

| Ràng buộc        | Giá trị                                                  |
|------------------|----------------------------------------------------------|
| Engine           | PostgreSQL 16, truy cập raw SQL qua `pg` (NO ORM)        |
| Primary key      | UUID `gen_random_uuid()` (Constitution DATA-03)         |
| Timestamps       | `created_at` bắt buộc; bảng mutable có `updated_at`      |
| Soft-delete      | `deleted_at TIMESTAMPTZ` cho entity business-critical   |
| Migration        | File tuần tự trong `backend/src/db/migrations/NNN_*.sql` |
| Connection pool  | Tối đa 20 connection                                     |

---

## G-07 — LOGGING & OBSERVABILITY

- Logger: winston hoặc pino — KHÔNG `console.log` trong production code.
- Mỗi request gắn `request_id` (UUID) để truy vết, trả trong `error.request_id`.
- KHÔNG log: password, token, API key, raw PII.
- Level: error / warn / info / debug (debug chỉ bật ở development).
