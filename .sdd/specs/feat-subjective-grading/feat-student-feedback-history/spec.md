# Đặc tả tính năng: Lịch sử nộp bài và Báo cáo kết quả của Học viên

**Ngày tạo**: 2026-07-23
**Trạng thái**: Nền tảng HIỆN CÓ; các cổng phát hành MỤC TIÊU vẫn còn mở
**Phân loại**: Mỗi mục quy chuẩn được gắn nhãn `AS-BUILT`, `TARGET`, hoặc `NEEDS CLARIFICATION`.

## 1. Tổng quan tính năng và bối cảnh nghiệp vụ

IELTSZone cho phép học viên đã xác thực tra cứu toàn bộ lịch sử bài nộp Writing và Speaking của chính mình, theo dõi trạng thái chấm điểm theo thời gian thực và xem báo cáo phản hồi chi tiết theo 4 tiêu chí IELTS — bất kể bài được chấm bởi AI hay Giảng viên. Hệ thống phân biệt rõ ràng `AI Estimated Band` (ước tính luyện tập, không phải điểm IELTS chính thức) với `Tutor Grade` (điểm chính thức từ Giảng viên). Học viên không thể xem báo cáo của người khác. Khi bài chấm AI gặp sự cố, học viên có thể tự yêu cầu chấm lại mà không cần liên hệ hỗ trợ.

## 2. Phạm vi

- Trang lịch sử bài nộp (`/student/profile/practice-history`): danh sách tổng hợp, lọc theo kỹ năng, badge trạng thái chuẩn hóa.
- Bài nộp Writing 2 Tasks và Speaking 3 Parts được gom nhóm theo `writing_group_id` / `speaking_group_id` thành một mục lịch sử duy nhất.
- Ưu tiên hiển thị điểm: `overall_tutor_band` trước (nếu có), sau đó `overall_ai_band`.
- Trang báo cáo chi tiết (`/submissions/:id/feedback`): 4 tiêu chí IELTS, nhãn nguồn điểm, nhận xét, Improved Version (Writing), audio feedback (Speaking từ Giảng viên), transcript.
- Xác minh quyền sở hữu: chỉ trả về báo cáo cho đúng chủ sở hữu bài nộp (`user_id === req.user.id`).
- Yêu cầu chấm lại AI cho bài gặp sự cố hoặc chưa có kết quả, có kiểm tra quota.

## 3. Ngoài phạm vi

- Thuật toán chấm điểm AI tự động — thuộc `ai-fast-grading`.
- Không gian làm việc chấm bài Giảng viên — thuộc `feat-tutor-grading-workspace`.
- Màn hình thi và thu âm của Học viên — thuộc `feat-writing-test-flow` và `feat-speaking-test-flow`.
- Export báo cáo ra PDF — chưa được phê duyệt phạm vi (ghi nhận là yêu cầu tương lai P3).
- Xóa lịch sử bài nộp bởi Học viên — chưa được quyết định sản phẩm.

## 4. Tác nhân và tóm tắt phân quyền

| Tác nhân | Hành vi được phép |
|---|---|
| Học viên đã xác thực (chủ sở hữu) | Xem lịch sử bài nộp của chính mình, xem chi tiết báo cáo bài của chính mình, yêu cầu chấm lại AI cho bài của mình. |
| Học viên khác | Không thể xem lịch sử hoặc báo cáo của học viên khác; bị từ chối với 403 Forbidden. |
| Giảng viên/Admin | Có thể xem báo cáo qua endpoint Tutor/Admin riêng biệt; không phải tác nhân trong tính năng này. |
| Khách/chưa đăng nhập | Không có quyền truy cập; bị từ chối với 401 Unauthorized. |

## 5. Câu chuyện người dùng và kiểm thử độc lập

### Câu chuyện 1 — Học viên tra cứu Danh sách Lịch sử bài nộp (Ưu tiên: P1)

Với tư cách học viên, tôi muốn truy cập trang Lịch sử bài nộp để xem toàn bộ danh sách các bài thi Writing và Speaking tôi đã thực hiện, lọc theo kỹ năng và theo dõi trạng thái chấm điểm.

**Kiểm thử độc lập**: Đăng nhập tài khoản học viên, mở trang Lịch sử bài làm, kiểm tra API `GET /api/v1/submissions/history` trả về đúng danh sách bài nộp của chính học viên đó, nhóm đúng theo `writing_group_id` / `speaking_group_id`. Xác minh học viên khác không xem được danh sách này.

**Kịch bản chấp nhận**:

1. **Cho trước** học viên đã thực hiện các bài nộp Writing và Speaking, **Khi** truy cập trang Lịch sử, **Thì** hệ thống hiển thị danh sách xếp theo thời gian nộp mới nhất lên đầu, bao gồm tên đề thi, ngày nộp, kỹ năng, trạng thái và điểm số thu gọn.
2. **Cho trước** danh sách bài nộp hiển thị, **Khi** học viên lọc theo "Writing" hoặc "Speaking", **Thì** danh sách lập tức lọc theo kỹ năng tương ứng mà không cần tải lại trang.
3. **Cho trước** một bài nộp đang ở trạng thái `pending`, **Khi** hiển thị, **Thì** badge trạng thái thể hiện rõ "Đang chấm" và nút "Xem chi tiết" bị vô hiệu hóa cho đến khi bài được chấm xong.

### Câu chuyện 2 — Học viên xem Báo cáo phản hồi chi tiết (Ưu tiên: P1)

Với tư cách học viên có bài đã được chấm thành công, tôi muốn mở trang báo cáo chi tiết để xem phân tích điểm 4 tiêu chí IELTS, nhận xét tổng quan, danh sách lỗi sai và bài viết được cải thiện.

**Kiểm thử độc lập**: Mở một bài nộp đã chấm (`/submissions/:id/feedback`), xác minh giao diện hiển thị đủ 4 tiêu chí IELTS, phân biệt rõ nhãn `AI Estimated Band` hoặc `Tutor Grade`, danh sách gợi ý và bài viết cải thiện. Xác minh học viên khác nhận lỗi 403.

**Kịch bản chấp nhận**:

1. **Cho trước** bài nộp được chấm bởi AI, **Khi** học viên xem chi tiết, **Thì** báo cáo hiển thị 4 tiêu chí IELTS kèm nhãn nổi bật `AI Estimated Band` và ghi chú về giới hạn của ước tính AI.
2. **Cho trước** bài nộp được chấm bởi Giảng viên, **Khi** học viên xem chi tiết, **Thì** báo cáo hiển thị điểm chính thức từ Giảng viên (`Tutor Grade`), nhận xét riêng của Giảng viên và file ghi âm nhận xét (nếu có).
3. **Cho trước** bài nộp Writing, **Khi** học viên xem chi tiết, **Thì** giao diện hiển thị song song nội dung bài làm gốc và bài viết được AI/Giảng viên cải thiện (`improvedVersion`).
4. **Cho trước** học viên cố gắng xem báo cáo bài nộp thuộc về học viên khác, **Khi** truy cập, **Thì** hệ thống từ chối với lỗi 403 Forbidden.

### Câu chuyện 3 — Gửi lại yêu cầu chấm AI khi xảy ra sự cố (Ưu tiên: P2)

Với tư cách học viên có bài nộp gặp sự cố chấm AI, tôi muốn bấm nút "Yêu cầu chấm lại AI" từ trang Lịch sử để hệ thống thử lại luồng chấm AI mà không cần thực hiện lại toàn bộ bài thi.

**Kiểm thử độc lập**: Tại trang Lịch sử, với bài nộp có trạng thái lỗi AI, bấm "Chấm lại bằng AI", kiểm tra API `POST /submissions/writing/:id/ai-grade` được gọi và cập nhật lại trạng thái bài nộp.

**Kịch bản chấp nhận**:

1. **Cho trước** bài nộp AI đang ở trạng thái lỗi hoặc chưa có báo cáo, **Khi** học viên bấm "Yêu cầu chấm lại AI", **Thì** hệ thống kiểm tra quota và gửi lại yêu cầu chấm AI cho bài đó.
2. **Cho trước** học viên đã hết lượt chấm AI trong ngày, **Khi** bấm yêu cầu chấm lại, **Thì** hệ thống hiển thị thông báo hết hạn mức bằng tiếng Việt rõ ràng.

## 6. Trường hợp biên

- Học viên xem lịch sử khi chưa có bất kỳ bài thi nào — hiển thị giao diện rỗng (Zero state) thân thiện với hướng dẫn và nút điều hướng đến phần làm bài.
- Báo cáo AI hoàn thành cho Task 1 nhưng Task 2 bị lỗi — hiển thị Task 1 với điểm đầy đủ, Task 2 với badge trạng thái lỗi và nút chấm lại riêng.
- Gián đoạn mạng khi tải dữ liệu báo cáo chi tiết — hiển thị loading spinner và thông báo lỗi tiếng Việt thân thiện.
- Bài nộp Speaking bị Giảng viên thu hồi kết quả — trạng thái quay về `pending` hoặc hiển thị badge "Kết quả đã thu hồi" tùy quyết định sản phẩm.
- Học viên xem lịch sử bài nộp bao gồm cả Listening và Reading (objective test) — danh sách hiển thị tất cả 4 kỹ năng; báo cáo chi tiết tự luận (Writing/Speaking) theo luồng đặc thù tính năng này.

## 7. Quy tắc nghiệp vụ

- **BR-SFH-001 [AS-BUILT]**: API Lịch sử bài nộp phải lấy `user_id` từ `req.user.id` và chỉ trả về bài nộp thuộc về chính học viên đó; không tin dữ liệu từ client.
- **BR-SFH-002 [AS-BUILT]**: API Phản hồi chi tiết phải xác minh quyền sở hữu (`user_id === req.user.id`) trước khi trả về báo cáo; vi phạm bị từ chối với 403.
- **BR-SFH-003 [AS-BUILT]**: Bài nộp Writing 2 Tasks và Speaking 3 Parts phải được gom nhóm theo `group_id` thành một mục lịch sử duy nhất.
- **BR-SFH-004 [AS-BUILT]**: Điểm hiển thị ưu tiên `overall_tutor_band` nếu có; nếu không thì hiển thị `overall_ai_band`.
- **BR-SFH-005 [AS-BUILT]**: Kết quả AI phải được gắn nhãn rõ `AI Estimated Band` để không gây nhầm lẫn với điểm thi IELTS chính thức.
- **BR-SFH-006 [AS-BUILT]**: Yêu cầu chấm lại AI phải kiểm tra hạn mức quota trước khi thực thi; hết quota phải thông báo tiếng Việt.
- **BR-SFH-007 [NEEDS CLARIFICATION]**: Khi Giảng viên thu hồi kết quả chấm, trạng thái bài nộp hiển thị với học viên là gì và badge nào được dùng — chưa được quyết định sản phẩm.

## 8. Yêu cầu chức năng

- **FR-SFH-001 [AS-BUILT]**: API Lịch sử bài nộp (`GET /api/v1/submissions/history`) PHẢI lấy `user_id` từ `req.user.id` và chỉ trả về bài nộp thuộc về chính học viên đó.
- **FR-SFH-002 [AS-BUILT]**: API Lịch sử PHẢI tự động gom nhóm task/part theo `writing_group_id` hoặc `speaking_group_id` để trả về bản ghi bài thi tổng hợp.
- **FR-SFH-003 [AS-BUILT]**: Giao diện Lịch sử bài nộp PHẢI cho phép lọc theo kỹ năng (`all`, `writing`, `speaking`) và hiển thị trạng thái chuẩn hóa bằng tiếng Việt.
- **FR-SFH-004 [AS-BUILT]**: Điểm số hiển thị trên danh sách Lịch sử PHẢI ưu tiên `overall_tutor_band` nếu có; nếu không thì hiển thị `overall_ai_band`.
- **FR-SFH-005 [AS-BUILT]**: API Phản hồi chi tiết (`GET /api/v1/submissions/:id/feedback`) PHẢI xác minh quyền sở hữu `user_id === req.user.id` trước khi trả về chi tiết báo cáo.
- **FR-SFH-006 [AS-BUILT]**: Báo cáo chi tiết Writing PHẢI bao gồm: điểm 4 tiêu chí IELTS từng task, band tổng hợp, summary, strengths, weaknesses, error_highlights, gợi ý từ vựng/ngữ pháp và `improvedVersion`.
- **FR-SFH-007 [AS-BUILT]**: Báo cáo chi tiết Speaking PHẢI bao gồm: điểm 4 tiêu chí IELTS, band tổng hợp, summary, transcript và audio thu âm của 3 Parts.
- **FR-SFH-008 [AS-BUILT]**: Giao diện báo cáo PHẢI hiển thị nhãn nổi bật `AI Estimated Band` cho bài AI chấm và `Tutor Grade` cho bài Giảng viên chấm.
- **FR-SFH-009 [AS-BUILT]**: Endpoint yêu cầu chấm lại AI (`POST /submissions/writing/:id/ai-grade`) PHẢI kiểm tra hạn mức quota trước khi thực thi.
- **FR-SFH-010 [AS-BUILT]**: Mọi API response PHẢI tuân thủ cấu trúc envelope `{ success, data, error, meta }`.
- **FR-SFH-011 [AS-BUILT]**: Giao diện PHẢI hiển thị loading spinner và thông báo lỗi tiếng Việt thân thiện khi gặp sự cố mạng.

## 9. Yêu cầu phi chức năng

- **NFR-SFH-001 [AS-BUILT]**: Mọi đọc/ghi phải thực thi phạm vi chủ sở hữu và trả về 403 cho dữ liệu không thuộc sở hữu.
- **NFR-SFH-002 [AS-BUILT]**: Dữ liệu lịch sử và báo cáo là thông tin cá nhân nhạy cảm; không được cache ở lớp CDN hoặc bộ nhớ đệm chia sẻ.
- **NFR-SFH-003 [TARGET]**: Thời gian tải trang danh sách Lịch sử bài làm dưới 800ms ở điều kiện mạng baseline; bằng chứng đo lường chưa có.

## 10. Thực thể chính

- **Lịch sử bài nộp (Practice History Item)**: Nhóm thông tin tổng hợp gồm `id`, `type`, `test_title`, `submitted_at`, `status`, `ai_status`, `tutor_status`, `band_score` (điểm ưu tiên hiển thị), `ai_band_score`, `tutor_band_score`.
- **Báo cáo AI (ai_grading_reports)**: Chứa chi tiết 4 tiêu chí, feedback, improvedVersion và transcript từ AI.
- **Báo cáo Giảng viên (tutor_feedback_reports)**: Chứa chi tiết 4 tiêu chí và nhận xét từ Giảng viên.

## 11. Tiêu chí thành công

- **SC-SFH-001 [AS-BUILT]**: 100% kết quả truy vấn Lịch sử bài nộp thuộc về đúng học viên đang đăng nhập (`user_id === req.user.id`).
- **SC-SFH-002 [AS-BUILT]**: 100% yêu cầu xem chi tiết báo cáo từ học viên không phải chủ sở hữu bị từ chối với lỗi 403 Forbidden.
- **SC-SFH-003 [AS-BUILT]**: 100% bài nộp Writing 2 tasks hoặc Speaking 3 parts được gom nhóm chính xác theo `group_id` trên giao diện danh sách.
- **SC-SFH-004 [AS-BUILT]**: 100% báo cáo AI hiển thị trên UI đính kèm nhãn `AI Estimated Band` để không gây hiểu nhầm với điểm thi IELTS chính thức.
- **SC-SFH-005 [TARGET]**: Thời gian tải trang danh sách Lịch sử bài làm dưới 800ms ở điều kiện mạng baseline.

## 12. Giả định

- Dữ liệu bài nộp đã có trong `writing_submissions` và `speaking_submissions`.
- Báo cáo kết quả lưu trong `ai_grading_reports` và `tutor_feedback_reports`.
- Middleware `authenticate` cung cấp `req.user.id` hợp lệ.
- Dịch vụ frontend sử dụng React 18, Vite và Bootstrap 5 theo Hiến pháp dự án.

## 13. Phụ thuộc

- API chấm lại AI (`POST /submissions/writing/:id/ai-grade`) — cần `ai-fast-grading` và `aiQuota.service.js`.
- Schema PostgreSQL cho `ai_grading_reports`, `tutor_feedback_reports` với đầy đủ cột 4 tiêu chí.
- Middleware `authenticate` của Express backend.

## 14. Câu hỏi mở

1. **BR-SFH-007**: Khi Giảng viên thu hồi kết quả chấm, badge trạng thái hiển thị với học viên là gì ("Đang chờ chấm lại", "Kết quả đã thu hồi", hay ẩn khỏi danh sách)?
2. Học viên có thể export báo cáo chi tiết ra PDF không — nếu có thì bao giờ triển khai và yêu cầu kỹ thuật là gì?
3. Học viên có thể xem lại bài làm gốc của mình (nội dung Writing đã nộp) qua trang lịch sử không, hay chỉ xem báo cáo điểm?
