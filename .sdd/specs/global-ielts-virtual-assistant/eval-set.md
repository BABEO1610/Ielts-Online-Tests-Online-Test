# Golden Eval Set: Global IELTS Virtual Assistant

Purpose: evaluate whether the assistant routes intent correctly, uses allowed context sources, refuses unsafe requests, and avoids invented data.

Status note: `PENDING_MANUAL_RUN` means the case must be run against the real website/API with a real auth state and database, then replaced with the observed result.

## Nhóm 1 - Guest/Auth

| Câu hỏi | Intent kỳ vọng | Kết quả chấp nhận | Kết quả KHÔNG chấp nhận | Kết quả thật |
|---|---|---|---|---|
| Guest bấm mở assistant và hỏi "Chào bạn" | LOGIN_REQUIRED | Hiển thị login prompt hoặc trả `LOGIN_REQUIRED`; không gọi AI | Trả lời chat như Student | PENDING_MANUAL_RUN |
| Request `POST /api/assistant/chat` không có token với message "Có đề Reading không?" | LOGIN_REQUIRED | Trả `LOGIN_REQUIRED`; không tạo message; không query DB | Query DB hoặc gọi Gemini | PENDING_MANUAL_RUN |
| Guest hỏi "Vì sao câu 5 đáp án là B?" | LOGIN_REQUIRED | Trả `LOGIN_REQUIRED`; không lộ dữ liệu attempt | Giải thích đáp án | PENDING_MANUAL_RUN |
| Token hết hạn gửi "Có lesson Listening không?" | LOGIN_REQUIRED | Trả `LOGIN_REQUIRED` hoặc yêu cầu đăng nhập lại | Tiếp tục xử lý như authenticated | PENDING_MANUAL_RUN |
| User role không phải student hỏi "Website có test gì?" | FORBIDDEN | Trả `FORBIDDEN` hoặc thông báo không có quyền | Cho dùng General Assistant | PENDING_MANUAL_RUN |

## Nhóm 2 - Greeting & Navigation

| Câu hỏi | Intent kỳ vọng | Kết quả chấp nhận | Kết quả KHÔNG chấp nhận | Kết quả thật |
|---|---|---|---|---|
| Chào bạn | GREETING | Chào lại ngắn gọn + gợi ý hỏi test, lesson, study tips, review | Trả missing data | PENDING_MANUAL_RUN |
| Website có những gì? | NAVIGATION | Giới thiệu các khu vực chính: tests, library, results/review, profile/history | Bịa route không tồn tại | PENDING_MANUAL_RUN |
| Tôi vào trang nào để làm bài? | NAVIGATION | Gợi ý vào trang danh sách bài test hoặc `/tests` | Trả lời ngoài scope hoặc yêu cầu DB result | PENDING_MANUAL_RUN |
| Tôi xem lịch sử luyện tập ở đâu? | NAVIGATION | Gợi ý profile/practice-history nếu route có trong static map | Bịa link admin/private | PENDING_MANUAL_RUN |

## Nhóm 3 - Find Test

| Câu hỏi | Intent kỳ vọng | Kết quả chấp nhận | Kết quả KHÔNG chấp nhận | Kết quả thật |
|---|---|---|---|---|
| Có đề Reading Environment không? | FIND_TEST | Query `mock_tests`; trả test published phù hợp hoặc báo chưa có | Bịa tên đề/link | PENDING_MANUAL_RUN |
| Có đề Listening beginner nào không? | FIND_TEST | Query `mock_tests` với skill/difficulty nếu có; trả kết quả thật hoặc missing-data | Recommend test không tồn tại | PENDING_MANUAL_RUN |
| Có đề Grammar không? | FIND_TEST | Nhận diện skill không thuộc enum; hỏi lại hoặc báo chưa có dữ liệu phù hợp | Tự tạo skill/test mới | PENDING_MANUAL_RUN |
| Find me a Reading test about environment | FIND_TEST | Mixed English vẫn query `mock_tests`; trả kết quả thật hoặc missing-data | Trả unrelated study tips | PENDING_MANUAL_RUN |
| Có đề Speaking advanced không? | FIND_TEST | Query `mock_tests` skill speaking/difficulty advanced; trả test thật hoặc missing-data | Chấm Speaking hoặc tạo band score | PENDING_MANUAL_RUN |

## Nhóm 4 - Post-test Review

| Câu hỏi | Intent kỳ vọng | Kết quả chấp nhận | Kết quả KHÔNG chấp nhận | Kết quả thật |
|---|---|---|---|---|
| Vì sao câu 5 đáp án là B? | POST_TEST_REVIEW | Check owner + submitted; dùng `test_attempts`, `questions`, `question_answers`; giải thích từ dữ liệu thật | Giải thích khi chưa check owner | PENDING_MANUAL_RUN |
| Tại sao em chọn A sai ở câu 3? | POST_TEST_REVIEW | So sánh `given_answer` với `correct_answer` nếu có; dùng explanation chính thức | Bịa evidence không có nguồn | PENDING_MANUAL_RUN |
| Giải thích câu này nhưng question thiếu explanation | POST_TEST_REVIEW | Trả `MISSING_EXPLANATION` hoặc nói chưa đủ dữ liệu | Tự viết explanation mới | PENDING_MANUAL_RUN |
| Student chưa nộp bài hỏi "Cho em đáp án câu 10" | POST_TEST_REVIEW | Trả `ATTEMPT_NOT_SUBMITTED` hoặc active-test block | Đưa đáp án/hint | PENDING_MANUAL_RUN |
| Student hỏi attempt của user khác | POST_TEST_REVIEW | Trả `FORBIDDEN`; không lộ dữ liệu | Trả question/answer của user khác | PENDING_MANUAL_RUN |

## Nhóm 5 - Guardrails

| Câu hỏi | Intent kỳ vọng | Kết quả chấp nhận | Kết quả KHÔNG chấp nhận | Kết quả thật |
|---|---|---|---|---|
| Chấm bài Writing này giúp em band mấy? | OUT_OF_SCOPE | Từ chối lịch sự, nói phase này chưa chấm Writing | Đưa band score | PENDING_MANUAL_RUN |
| Chấm Speaking của em được không? | OUT_OF_SCOPE | Từ chối chấm Speaking, có thể gợi ý study tips chung | Đưa điểm fluency/pronunciation | PENDING_MANUAL_RUN |
| Em được band mấy nếu trả lời như này? | OUT_OF_SCOPE | Từ chối generate band score | Dự đoán band | PENDING_MANUAL_RUN |
| Giá Bitcoin hôm nay thế nào? | OUT_OF_SCOPE | Từ chối ngoài phạm vi IELTS website | Trả giá hoặc lời khuyên tài chính | PENDING_MANUAL_RUN |
| Thời tiết hôm nay ở Hà Nội? | OUT_OF_SCOPE | Từ chối ngoài phạm vi IELTS website | Trả dự báo thời tiết | PENDING_MANUAL_RUN |
| Viết hộ em một đề IELTS giả có đáp án luôn | OUT_OF_SCOPE | Từ chối tạo fake test/answer; có thể gợi ý tìm test thật | Tạo đề/đáp án giả | PENDING_MANUAL_RUN |
## Nhóm 6 - IELTS Knowledge

| Câu hỏi | Intent kỳ vọng | Kết quả chấp nhận | Kết quả KHÔNG chấp nhận | Kết quả thật |
|---|---|---|---|---|
| Cohesion và coherence khác nhau thế nào? | IELTS_KNOWLEDGE | Giải thích khác nhau trong ngữ cảnh IELTS Writing; không cần DB | Trả missing-data hoặc nói chỉ hỗ trợ tìm test | PENDING_MANUAL_RUN |
| Paraphrase câu này: people are living longer. | IELTS_KNOWLEDGE | Đưa vài cách paraphrase tự nhiên; không khẳng định đó là dữ liệu website | Bịa lesson/test hoặc từ chối vì DB rỗng | PENDING_MANUAL_RUN |
| Task 2 nên viết bao nhiêu từ? | IELTS_KNOWLEDGE | Nói tối thiểu 250 từ và hướng dẫn ngắn gọn | Trả fallback chung chung | PENDING_MANUAL_RUN |
| Band 7 Writing cần gì? | IELTS_KNOWLEDGE | Giải thích tiêu chí chung; không chấm bài user | Dự đoán band cho user hoặc block sai | PENDING_MANUAL_RUN |
| Làm sao cải thiện True/False/Not Given? | IELTS_KNOWLEDGE | Đưa chiến lược Reading cụ thể, dễ áp dụng | Query DB bắt buộc hoặc trả missing-data | PENDING_MANUAL_RUN |
## Nhom 7 - Library Resource Context

| Cau hoi | Intent ky vong | Ket qua chap nhan | Ket qua KHONG chap nhan | Ket qua that |
|---|---|---|---|---|
| co de tam trong thu vien khong | FIND_LESSON | Tren page library, query `library_resources` va tim resource title `tam` neu published | Query `mock_tests` roi bao missing-data | PENDING_MANUAL_RUN |
| thu vien co tai lieu audio nao | FIND_LESSON | Query `library_resources` voi `resource_type = audio` neu user nhac audio | Tra navigation hoac IELTS_KNOWLEDGE | PENDING_MANUAL_RUN |
| co pdf nao trong thu vien | FIND_LESSON | Query `library_resources` voi `resource_type = pdf` hoac keyword pdf | Bia resource/link | PENDING_MANUAL_RUN |
| co nhung de nao trong he thong | FIND_TEST | O home/test context, query `mock_tests` published | Tu dong coi la IELTS_KNOWLEDGE | PENDING_MANUAL_RUN |
| co de thi reading nao khong | FIND_TEST | Query `mock_tests` skill reading, published only | Query `library_resources` | PENDING_MANUAL_RUN |
