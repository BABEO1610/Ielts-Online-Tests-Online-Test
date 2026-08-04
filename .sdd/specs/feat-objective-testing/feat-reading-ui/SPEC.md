# Đặc tả tính năng: Giao diện Thi Reading (feat-reading-ui)

**Ngày tạo**: 2026-07-27
**Trạng thái**: Draft
**Phân loại**: Mỗi mục quy chuẩn được gắn nhãn `AS-BUILT`, `TARGET`, hoặc `NEEDS CLARIFICATION`.

## 1. Tổng quan tính năng và bối cảnh nghiệp vụ

Học viên làm bài Reading cần thao tác đọc đoạn văn và làm câu hỏi đồng thời, nhưng giao diện cũ không hỗ trợ chia đôi màn hình gây bất tiện. Ngoài ra, việc mất đáp án khi đổi trang, không hỗ trợ Partial Practice, và không có Navigation tổng quan làm giảm chất lượng luyện thi.
Tính năng cung cấp Split View layout chuẩn, quản lý state vững chắc, Navigation tổng quan và các tính năng hỗ trợ như Highlight text.

## 2. Phạm vi

- Giao diện Split-view (Chia đôi màn hình) cho màn hình ngang (>=1024px) hoặc Stack View cho màn hình dọc/nhỏ.
- State câu trả lời được bảo toàn khi điều hướng qua lại.
- Cho phép luyện tập một phần (Partial Practice) theo Passage.
- Navigation Grid, đồng hồ đếm ngược, chuyển tab tự động theo câu hỏi.
- Gắn hình ảnh phụ trợ với khối câu hỏi tương ứng.

## 3. Ngoài phạm vi

- Lưu trữ highlight text vào database (chỉ hiển thị bằng DOM tạm).
- Tối ưu layout Split-view cho Mobile màn hình nhỏ (chỉ dùng Stack-view tạm thời).
- Auto-save vào local storage ở phase 1.

## 4. Tác nhân và tóm tắt phân quyền

| Tác nhân | Hành vi được phép |
|---|---|
| Học viên | Chọn passage luyện, làm bài trên giao diện split-view, highlight text, xem timer, submit. |

## 5. Câu chuyện người dùng và kiểm thử độc lập

### Câu chuyện 1 — Split View đọc bài và làm câu hỏi (Ưu tiên: P1)

Với tư cách học viên, tôi muốn giao diện chia đôi màn hình: trái là bài đọc, phải là câu hỏi — cuộn hoàn toàn độc lập nhau.

**Kiểm thử độc lập**: Cuộn văn bản bên trái, kiểm tra cột câu hỏi bên phải không di chuyển.

**Kịch bản chấp nhận**:

1. **Cho trước** màn hình Desktop, **Khi** scroll bài đọc, **Thì** câu hỏi đứng im.
2. **Cho trước** click vào câu số 15 trong Navigation Grid thuộc Passage 2, **Khi** đang ở Passage 1, **Thì** bài đọc đổi qua Passage 2 và câu hỏi tự cuộn tới số 15.

### Câu chuyện 2 — Điền từ và giữ state (Ưu tiên: P1)

Với tư cách học viên, tôi nhập câu trả lời vào ô điền trống và nó phải được giữ lại khi tôi chuyển qua lại các câu.

**Kiểm thử độc lập**: Điền text, đổi câu, quay lại text vẫn còn.

**Kịch bản chấp nhận**:

1. **Cho trước** đang làm bài, **Khi** điền xong và đổi qua passage khác rồi quay lại, **Thì** text input không bị mất.

## 6. Trường hợp biên

- Mobile/Tablet dọc: tự động fallback về Stack-view.
- Dữ liệu chậm tải: Hiển thị Skeleton loading.
- Ô trống bị bỏ không: Nộp bình thường, Backend sẽ tự chấm 0.

## 7. Quy tắc nghiệp vụ

- **BR-RDUI-001 [TARGET]**: Layout Split-view chỉ kích hoạt khi bề ngang >= 1024px.
- **BR-RDUI-002 [TARGET]**: Khi chuyển câu hỏi qua Navigation Grid, hệ thống tự động đổi tab bài đọc tương ứng.
- **BR-RDUI-003 [TARGET]**: Highlight text chỉ có hiệu lực trong session thi hiện tại.
- **BR-RDUI-004 [TARGET]**: Chế độ Review (xem lại sau khi thi) tái sử dụng Split-view nhưng hiển thị đỏ/xanh, giải thích, vô hiệu hóa form.

## 8. Yêu cầu chức năng

- **FR-RDUI-001 [TARGET]**: Hệ thống MUST hiển thị layout Split-view (CSS grid) với 2 scrollpane độc lập.
- **FR-RDUI-002 [TARGET]**: Hệ thống MUST ghim (sticky) tiêu đề Passage và bộ đếm thời gian ở trên cùng.
- **FR-RDUI-003 [TARGET]**: Hệ thống MUST hiển thị Skeleton loading lúc mới load data.
- **FR-RDUI-004 [TARGET]**: Hệ thống MUST hỗ trợ Partial Practice cho các passage tùy chọn.
- **FR-RDUI-005 [TARGET]**: Hệ thống MUST render hình ảnh (Diagram) hoặc phụ trợ ngay phía trên khối câu hỏi liên quan.
- **FR-RDUI-006 [TARGET]**: Hệ thống MUST tái sử dụng `ReviewModal` và `TimerBar` từ feat-listening-ui.

## 9. Yêu cầu phi chức năng

- **NFR-RDUI-001 [TARGET]**: Bài đọc dài không gây giật lag khi cuộn.
- **NFR-RDUI-002 [TARGET]**: Component chịu lỗi tốt khi parse HTML bài đọc.

## 10. Thực thể chính

- **Panes**: DOM elements xử lý scroll.
- **`answers` state**: Dữ liệu đáp án cục bộ.

## 11. Tiêu chí thành công

- **SC-RDUI-001 [TARGET]**: Cuộn bài đọc độc lập 100%.
- **SC-RDUI-002 [TARGET]**: Nhảy câu hỏi đổi tab mượt mà.
- **SC-RDUI-003 [TARGET]**: Đầy đủ đáp án được lấy vào payload nộp bài.

## 12. Giả định

- API Backend trả về passage và questions đầy đủ dạng HTML an toàn.

## 13. Phụ thuộc

- Backend cung cấp API chấm tự động và get test.
- Tái sử dụng components từ `feat-listening-ui`.

## 14. Câu hỏi mở
- None.
