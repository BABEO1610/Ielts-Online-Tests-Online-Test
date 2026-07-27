# RFC: Kho Tài Liệu (feat-library-management)

**Tài liệu chuẩn bị bảo vệ trước Hội đồng chuyên môn**
**Ngày cập nhật:** 2026-07-27

---

## 1. Phân Tích Luồng Hệ Thống Theo Từng File (Source Code Flow Analysis)

Hệ thống quản lý Kho tài liệu (Library Management) đặc thù ở chỗ nó không chỉ xử lý text/JSON thông thường mà phải xử lý **Dữ liệu nhị phân (Binary Data - File Upload)**. Luồng đi của một file từ máy tính người dùng lên Cloud được cấu trúc qua các file sau:

### 1.1. Frontend Layer (React)
*   **`pages/tutor/TutorLibraryPage.jsx`**: Giao diện dashboard tổng quan của kho tài liệu, nơi hiển thị các thư mục hoặc filter tìm kiếm.
*   **`pages/tutor/TutorLibraryManagementPage.jsx`**: Dạng xem danh sách (Table/List) chi tiết, hỗ trợ phân trang, sort, và các action (View, Edit, Delete).
*   **`pages/tutor/TutorLibraryCreatePage.jsx` & `TutorLibraryEditPage.jsx`**: Các trang bọc (Wrapper) chứa form để tạo mới hoặc cập nhật thông tin tài liệu.
*   **`components/library/ResourceUploadModal.jsx`**: Chứa thẻ `<input type="file">`. Đây là nơi thu thập file, sinh ra đối tượng `FormData` (chứa file binary + title + description) để bắn request `POST` qua Axios.
*   **`components/library/ResourceEditModal.jsx` & `DocumentForm.jsx`**: Form nhập liệu metadata (tên tài liệu, môn học, mô tả).
*   **`components/library/ResourceCard.jsx`**: Thẻ hiển thị UI của một tài liệu (có icon PDF/Audio, title, ngày upload).

### 1.2. Backend Layer (Node.js & Express)
*   **`src/config/multer.js`**: File cấu hình sống còn. Khởi tạo middleware `multer`, set giới hạn dung lượng `limits: { fileSize: 200 * 1024 * 1024 }` (200MB), và viết hàm `fileFilter` để chỉ cho phép các đuôi file hợp lệ (pdf, mp3, mp4, docx) đi qua.
*   **`src/routes/api/v1/library.routes.js`**: Cấu hình endpoint `POST /library`. Phải đặt middleware `multer.single('file')` trước controller để Express biết cách parse gói tin `multipart/form-data`.
*   **`src/controllers/library.controller.js`**: Nhận request đã được multer xử lý. File binary nằm ở `req.file`, thông tin text nằm ở `req.body`. Tiến hành validate rỗng và đẩy xuống Service.
*   **`src/services/library.service.js`**: **Linh hồn của tiến trình Upload**. Đóng vai trò cầu nối giao tiếp với Supabase Storage (Cloud) để lưu trữ file, lấy link Public URL về, và gọi Database để lưu link đó.
*   **`src/db/queries/library.queries.js`**: Chứa câu SQL `INSERT INTO library_resources (title, file_url, size, mimetype, uploader_id) VALUES (...)`.

---

## 2. Phần Xử Lý Khó Nhất: Logic Tải File & Đồng Bộ Đa Hệ Thống (Distributed Transaction)

Khi hội đồng hỏi về độ khó của tính năng này, hãy tập trung vào **File `library.service.js` - Xử lý bài toán "Distributed Transaction" (Giao dịch phân tán) giữa 2 hệ thống độc lập: Database (PostgreSQL) và Cloud Storage (Supabase).**

### 2.1. Bài toán khó: "Mồ côi dữ liệu" (Orphaned Data)
Trong 1 API Call tạo tài liệu mới, ta phải làm 2 việc: (1) Bơm file lên Supabase và (2) Lưu link file vào PostgreSQL.
Vì đây là 2 server khác nhau, ta không thể dùng lệnh `BEGIN/COMMIT` SQL để bọc cả 2 lại được. Rủi ro xảy ra:
*   **Trường hợp 1:** Upload file lên Supabase thành công. Nhưng lúc `INSERT` vào Database bị lỗi (ví dụ: mất kết nối DB, hoặc thiếu trường title). Hậu quả: File rác nằm vĩnh viễn trên Supabase mà không có DB nào trỏ tới, gây tốn tiền lưu trữ (Orphaned File).
*   **Trường hợp 2:** Xóa tài liệu. Đã xóa trong DB thành công, nhưng lệnh gọi API xóa file trên Supabase bị timeout mạng. Hậu quả: DB thì mất link, nhưng file vẫn nằm tốn chỗ trên Cloud.

### 2.2. Giải phẫu Logic xử lý trong `library.service.js` (Hàm `createResource`)
Để giải quyết bài toán trên, em xử lý logic code theo cơ chế **Kéo/Thả (Compensation Transaction)**:

**Bước 1: Chống trùng lặp tên file (Collision Avoidance)**
```javascript
const uniqueFilename = `${Date.now()}-${uuidv4()}-${file.originalname}`;
```
Nếu 2 giáo viên cùng tải lên file có tên `de_thi.pdf`, Supabase sẽ ghi đè. Để tránh việc này, em tự động đổi tên file bằng cách nối Timestamp và UUID.

**Bước 2: Upload lên Cloud (Supabase Storage)**
```javascript
const { data, error } = await supabase.storage
    .from('library_bucket')
    .upload(uniqueFilename, file.buffer, { contentType: file.mimetype });
if (error) throw new Error('Upload to Cloud failed');
```
Em lấy buffer của file từ Multer đẩy thẳng lên Cloud.

**Bước 3: Lấy Public URL**
```javascript
const publicUrl = supabase.storage.from('library_bucket').getPublicUrl(uniqueFilename).data.publicUrl;
```

**Bước 4: Insert Database Kèm Try/Catch bọc hậu (Compensation logic)**
```javascript
try {
    const result = await db.query(insertQuery, [title, publicUrl, ...]);
    return result.rows[0];
} catch (dbError) {
    // CHỐT CHẶN VÀNG: Nếu DB lỗi, phải dọn dẹp rác trên Cloud ngay lập tức
    await supabase.storage.from('library_bucket').remove([uniqueFilename]);
    throw new AppError('Failed to save to database. Upload rolled back.', 500);
}
```
Đây là **đoạn code ăn tiền nhất**. Nếu lệnh SQL bị lỗi, khối catch sẽ ngay lập tức gọi API của Supabase để **XÓA THỦ CÔNG** file vừa mới tải lên thành công ở Bước 2. Việc này đảm bảo hệ thống luôn sạch sẽ, không có file rác.

---

## 3. 10 Câu Hỏi Giả Lập Từ Hội Đồng Chuyên Môn (Kèm Trả Lời)

**Q1: Khách hàng muốn tải lên file Video bài giảng nặng 200MB. Trong file `multer.js`, em dùng `memoryStorage` hay `diskStorage`? Tại sao?**
> **Trả lời:** Với file 200MB, em BẮT BUỘC phải dùng `diskStorage` (hoặc streaming trực tiếp) thay vì `memoryStorage`. Nếu dùng `memoryStorage`, toàn bộ 200MB sẽ được nạp thẳng vào RAM của server Node.js. Chỉ cần 5 user cùng upload lúc, server Node.js sẽ bị tràn RAM (Out of Memory - OOM) và crash ngay lập tức. `diskStorage` sẽ lưu file tạm xuống ổ cứng của server, sau đó stream lên Supabase, giải phóng RAM.

**Q2: Giải thích bài toán "Mồ côi file" (Orphaned file) giữa Supabase và Database. Em xử lý nó trong `library.service.js` như thế nào?**
> **Trả lời:** (Trả lời bằng nội dung của Mục 2.2 phía trên - Nói về khối try/catch và lệnh rollback thủ công `supabase.storage.remove()`).

**Q3: Dữ liệu metadata (title, description) và file nhị phân (binary) được gửi chung từ Frontend lên Backend bằng giao thức nào?**
> **Trả lời:** Chúng được gửi chung qua giao thức HTTP POST với header `Content-Type: multipart/form-data`. Không thể dùng `application/json` thông thường vì JSON không thể mã hóa hiệu quả file nhị phân lớn. Tại Frontend, em dùng đối tượng `new FormData()` để append file và các text field vào chung một gói tin.

**Q4: Frontend làm sao hiển thị được thanh tiến trình (Progress Bar) % đang tải file lên?**
> **Trả lời:** Em sử dụng config `onUploadProgress` của thư viện Axios ở Frontend. Axios cung cấp event `ProgressEvent`, từ đó em tính toán phần trăm hoàn thành bằng công thức `Math.round((progressEvent.loaded * 100) / progressEvent.total)` và cập nhật vào State của React để render ra UI thanh Progress Bar.

**Q5: Khi user ấn nút "Xóa" một tài liệu, em sẽ xóa trong Database trước hay gọi Supabase xóa file trước? Tại sao?**
> **Trả lời:** Nguyên tắc an toàn là: Xóa Cloud trước, xóa DB sau. Nếu em xóa DB trước thành công, nhưng gọi Supabase bị lỗi rớt mạng, file đó sẽ kẹt vĩnh viễn trên Supabase vì ta đã mất thông tin URL trong DB để tìm lại nó. Ngược lại, nếu xóa Supabase trước thành công, mà xóa DB lỗi, thì cùng lắm trong DB còn một link chết (404), ta có thể dọn dẹp dễ dàng hơn là để rác tốn tiền trên Cloud.

**Q6: Làm sao em ngăn chặn người dùng tải lên một file có chứa mã độc giả dạng đuôi `.pdf`?**
> **Trả lời:** Em cấu hình phòng thủ 2 lớp. 
> 1. Frontend dùng thuộc tính `accept=".pdf"` ở thẻ input. 
> 2. Backend, trong hàm `fileFilter` của `multer.js`, em kiểm tra chuỗi `file.mimetype` (ví dụ `application/pdf`). 
> Dù vậy, mimetype vẫn có thể bị fake qua Postman. Để an toàn tuyệt đối, hệ thống cần tích hợp thêm thư viện check Magic Bytes (đọc 4 byte đầu tiên của file buffer) để xác định chính xác định dạng thực của file.

**Q7: Nếu đổi nhà cung cấp từ Supabase sang Amazon S3 thì file `library.service.js` của em bị ảnh hưởng thế nào? Em thiết kế kiến trúc có dễ thay đổi không?**
> **Trả lời:** Kiến trúc của em tuân theo nguyên lý Dependency Inversion. Trong Controller, em chỉ biết gọi `libraryService.uploadFile()`. Trong Service, em cô lập logic gọi SDK của Supabase vào một hàm helper/module riêng. Khi đổi sang AWS S3, em chỉ cần sửa duy nhất logic bên trong hàm helper đó để dùng SDK `aws-sdk`, luồng nhận file từ Multer và ghi vào DB không hề bị ảnh hưởng.

**Q8: Bucket trên Supabase của em đang cấu hình là Public hay Private? Tại sao?**
> **Trả lời:** Đối với Kho tài liệu (Library), nếu tài liệu là chia sẻ miễn phí cho toàn bộ học sinh, em cấu hình bucket là **Public**. Supabase sẽ trả về public URL, ai có link cũng tải được, server của em không tốn công tính toán. Tuy nhiên, nếu tài liệu là bảo mật chỉ dành cho học sinh đã mua khóa học, em sẽ cấu hình bucket **Private**. Khi đó Frontend muốn xem file phải gọi lên Backend, Backend sẽ request Supabase gen ra một `Signed URL` có hạn sử dụng (vd: 60 phút) để trả về cho Frontend, chống việc chia sẻ link trái phép.

**Q9: Nếu 2 user upload cùng 1 lúc 2 file khác nhau hoàn toàn, nhưng vô tình đặt trùng tên là `grammar.pdf`, Supabase xử lý ghi đè (overwrite) thế nào?**
> **Trả lời:** Em đã xử lý trước việc này ở Backend bằng cách không bao giờ dùng tên gốc (`file.originalname`) làm khóa chính trên Supabase. Ở Bước 1 của Service, em nối thêm `Date.now()` và chuỗi ngẫu nhiên `uuidv4()` vào trước tên gốc (ví dụ: `167890123-ab34c-grammar.pdf`). Việc này đảm bảo tỷ lệ trùng tên file bằng 0, không bao giờ xảy ra lỗi ghi đè rác dữ liệu.

**Q10: Thư mục `config/multer.js` tại sao lại tách ra một file riêng biệt mà không viết thẳng logic setup vào trong `library.routes.js`?**
> **Trả lời:** Việc tách rời nhằm đảm bảo tính tái sử dụng (Reusability) và Nguyên lý Đơn trách nhiệm (Single Responsibility). Việc upload file có thể được dùng ở nhiều nơi (vd: upload Avatar user, upload âm thanh cho Listening Test). Việc gom cấu hình giới hạn dung lượng, logic filter đuôi file vào một file `multer.js` giúp các routes khác chỉ việc `import` vào xài, tránh duplicate code và dễ dàng thay đổi giới hạn file hệ thống ở 1 nơi duy nhất.
