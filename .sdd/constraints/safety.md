# SAFETY CONSTRAINTS — Ràng buộc an toàn & bảo mật
# Project: IELTSZone | Version: 1.0 | Location: .sdd/constraints/safety.md
#
# Mục đích: Chứa các ràng buộc về AN TOÀN, BẢO MẬT, BẢO VỆ DỮ LIỆU và GIỚI HẠN
#           HÀNH VI của AI Agent. Đây là tầng "không bao giờ được phép" —
#           vi phạm = dừng ngay, báo cáo, không tự ý xử lý tiếp.
#
# Cross-ref: .sdd/constitution.md (ARTICLE 3 Security, ARTICLE 8 Agent, ARTICLE 10 Data)
#            .agents/AGENTS.md (Cấm tuyệt đối), .agents/.agentignore

---

## S-01 — BẢO MẬT NỀN TẢNG (non-negotiable)

| ID    | Ràng buộc                                                              |
|-------|------------------------------------------------------------------------|
| S-01a | Mật khẩu: bcrypt cost ≥ 12. KHÔNG plain text, KHÔNG MD5/SHA1.          |
| S-01b | SQL: chỉ parameterized query `$1, $2`. Zero string concat với input.   |
| S-01c | Secrets (API key, JWT secret, DB pass): chỉ trong `.env`, KHÔNG hardcode.|
| S-01d | Mọi endpoint mutating (POST/PUT/PATCH/DELETE) phải có auth middleware.  |
| S-01e | CORS: whitelist domain cụ thể, KHÔNG dùng wildcard `*` ở production.    |
| S-01f | Input validation (express-validator/joi) BẮT BUỘC trước khi chạm DB.    |
| S-01g | KHÔNG trả stack trace trong response — chỉ ghi vào server log.          |
| S-01h | userId & role lấy từ auth middleware, KHÔNG từ body/query/params.       |

> Chi tiết đầy đủ: Constitution ARTICLE 3 (SEC-01 → SEC-10).

---

## S-02 — BẢO VỆ DỮ LIỆU CÁ NHÂN (PII)

PII trong dự án gồm: email, full_name, avatar, IP address, audio/ảnh bài làm,
raw_profile OAuth, token.

- KHÔNG log PII thô (mask email: `a***@gmail.com`, không log token/password).
- KHÔNG đưa PII vào response cho user không có quyền (chỉ chủ sở hữu / tutor phụ trách / admin).
- KHÔNG gửi PII của học viên ra dịch vụ bên thứ ba ngoài luồng AI grading đã được duyệt.
- Khi gọi AI: chỉ gửi nội dung bài làm cần thiết, KHÔNG kèm email/tên thật nếu không cần.
- Dữ liệu nhạy cảm (bài làm, feedback) dùng soft-delete, KHÔNG hard-delete (DATA-01).

---

## S-03 — AN TOÀN NỘI DUNG AI

- Mọi output AI phải được **sanitize + validate schema** trước khi lưu DB hoặc trả về (IELTS-05).
- AI grading phải idempotent — cùng bài cho kết quả nhất quán.
- KHÔNG lộ partial result / intermediate AI response ra ngoài khi chưa hoàn tất.
- Nếu AI call fail → status `grading_failed`, ghi log, cho phép retry. KHÔNG kẹt ở `pending` (IELTS-06).
- Chatbot/Explain-with-AI: lọc prompt injection từ input user; KHÔNG để user ép AI lộ system prompt
  hoặc dữ liệu người dùng khác.
- KHÔNG hiển thị `raw_ai_response` thô cho học viên — chỉ field đã chuẩn hóa (band, criteria, feedback).

---

## S-04 — GIỚI HẠN HÀNH VI AI AGENT

AI Agent (Claude/Kiro) khi làm việc trong repo này:

| Cấm tuyệt đối                                                              |
|----------------------------------------------------------------------------|
| KHÔNG đọc: `.env`, `*.secret`, `credentials/*` (xem .agentignore)          |
| KHÔNG commit thẳng vào `main` — luôn qua branch + PR + review               |
| KHÔNG dùng ORM hoặc nối chuỗi SQL                                          |
| KHÔNG xóa file trong `/uploads` khi chưa có xác nhận của người dùng         |
| KHÔNG chạy lệnh phá hủy (DROP TABLE, rm -rf, force push, reset --hard) khi chưa được duyệt |
| KHÔNG tự ý cài thêm dependency lớn / đổi tech stack (cần RFC + team vote)   |
| KHÔNG approve/merge output mà không giải thích được cho thành viên khác     |

- Nếu không chắc (đặc biệt phần TBD như Auth method) → HỎI, không đoán (AGENTS.md mục 4).
- Mọi thay đổi đáng kể ghi vào `.sdd/agents_changelog.md` (AGENT-07).
- Tuân thủ Pre-Commit Checklist (Constitution ARTICLE 9) trước mọi PR.

---

## S-05 — THAO TÁC NGUY HIỂM (cần xác nhận con người)

Các thao tác sau BẮT BUỘC có xác nhận rõ ràng của người dùng trước khi thực hiện:

- Xóa dữ liệu hàng loạt, drop bảng, truncate.
- Thay đổi schema production / chạy migration trên production.
- Reset mật khẩu hàng loạt, đổi role nhiều user.
- Xóa hoặc ghi đè file trong `/uploads`.
- Bất kỳ thao tác nào sửa CORS, auth, hoặc cấu hình bảo mật.
- Push lên remote, tạo PR (theo git workflow đã duyệt).

> Quy tắc chung: thao tác KHÓ HOÀN TÁC hoặc ảnh hưởng hệ thống dùng chung → dừng và xin xác nhận.

---

## S-06 — XỬ LÝ SỰ CỐ BẢO MẬT

Khi phát hiện vi phạm (vd: `.env` bị commit, key lộ, SQL injection):

1. DỪNG ngay thao tác đang chạy, KHÔNG cố tự sửa che giấu.
2. Revoke key/secret bị lộ ngay lập tức.
3. Ghi vào `.sdd/agents_changelog.md` theo format báo cáo vi phạm (Constitution ARTICLE 9).
4. Báo cho team trước khi tiếp tục.

**Format báo cáo:**
```
[SECURITY VIOLATION]
Rule:      {S-xx hoặc SEC-xx}
File:      {file_path}, Line: {n}
Violation: {mô tả cụ thể}
Action:    {đã revoke / cần human review / blocked}
```
