# Khởi động Nhanh (Quickstart): User Profile

## Yêu cầu Cần thiết (Prerequisites)

- Database đã chạy migration với một user đang hoạt động (active user).
- Môi trường lưu trữ Avatar đã được cấu hình nếu dùng cloud storage; chức năng tải lên cục bộ (local upload fallback) luôn có sẵn khi được cấu hình.
- Dev servers của frontend và backend đang chạy.

## Chạy (Run)

```powershell
cd backend
npm test -- --runTestsByPath backend/tests/unit/services/users.profile.test.js backend/tests/unit/controllers/users.controller.test.js
npm run dev
```

```powershell
cd frontend
npm test -- --run tests/pages/UserProfilePage.test.jsx tests/components/auth/OnboardingForm.test.jsx
npm run dev
```

## Các Kịch bản Xác thực (Validation Scenarios)

1. Mở `/profile` trong khi đã đăng nhập (authenticated).
   Kết quả mong đợi: hiển thị (render) định danh, email, role, status, avatar hoặc ảnh giữ chỗ (initial placeholder), mục tiêu điểm (target band), và ngày thi dự kiến (target test date).

2. Mở `/profile` trong khi chưa đăng nhập (unauthenticated).
   Kết quả mong đợi: điều hướng (redirect) về `/login`.

3. Cập nhật họ tên (full name), avatar URL, target band, và target date.
   Kết quả mong đợi: phương thức PATCH gửi tới `/users/me` thành công, hồ sơ được làm mới, các giá trị được lưu lại.

4. Nhập target band không hợp lệ.
   Kết quả mong đợi: frontend chuẩn hóa (normalizes) dữ liệu nếu có thể; backend từ chối các giá trị ngoài phạm vi hoặc không phải là bước nhảy 0.5.

5. Upload avatar có định dạng hỗ trợ và dung lượng dưới giới hạn.
   Kết quả mong đợi: API `/users/me/avatar` trả về `avatar_url`; sau khi lưu hồ sơ thì giá trị này được giữ lại.

6. Upload avatar không được hỗ trợ định dạng hoặc quá dung lượng.
   Kết quả mong đợi: xuất hiện lỗi rõ ràng và hồ sơ không bị thay đổi.

7. Đổi mật khẩu từ cài đặt bảo mật (security settings).
   Kết quả mong đợi: đổi mật khẩu hợp lệ (đối với local-password) thành công; mật khẩu không khớp hoặc quá ngắn sẽ bị chặn.

8. Mở lịch sử hỗ trợ (support history).
   Kết quả mong đợi: các yêu cầu cũ và câu trả lời của admin được hiển thị; nếu không có lịch sử thì hiển thị trạng thái rỗng (empty state).
