# Yêu cầu thô — Chấm điểm Speaking bằng AI (AI Fast Grading – Speaking)

* [ ] **Ngày ghi nhận**: 2026-05-15
  **Nguồn**: Buổi phỏng vấn nhu cầu nghiệp vụ lần 1 + lần 2 với học viên IELTS có kinh nghiệm thực tế
  **Người phỏng vấn**: Nhóm phân tích BA (Team IELTSZone)
  **Người được phỏng vấn**: Nguyễn Duy Mạnh (Học viên, cựu học viên IELTS tại trung tâm Lango), Nguyễn Hướng Dương (Học viên, IELTS 6.5), Nguyễn Bá Quang Minh (Học viên, IELTS 6.5)
  **Tình trạng**: Đã tiếp nhận → Dùng làm đầu vào để chuẩn hoá thành `spec.md`

---

## 1. Bối cảnh & Vấn đề thực tế (Pain Points)

Qua phỏng vấn, các học viên phản ánh các vấn đề sau trong quy trình luyện Speaking tại các trung tâm IELTS hiện tại:

1. **Không có phản hồi tức thì**: Học viên ghi âm bài Speaking xong phải chờ 2–5 ngày để giáo viên chấm. Nhiều học viên mất động lực vì chờ quá lâu, đặc biệt vào mùa thi (tháng 5–8).
2. **Giáo viên quá tải**: Mỗi giáo viên Speaking phải nghe trung bình 15–20 bài/ngày, mỗi bài 11–14 phút audio (3 Part). Thời gian chấm + viết nhận xét mất 25–40 phút/bài. Cuối tháng dồn bài, giáo viên kiệt sức, chất lượng feedback giảm.
3. **Thiếu tính nhất quán**: Hai giáo viên chấm cùng một bài có thể cho điểm chênh nhau 0.5–1.0 band. Học viên phàn nàn "sao bài em chị A cho 6.0 mà anh B cho 5.5?". Trung tâm không có cơ chế đối chiếu hay chuẩn hoá điểm Speaking.
4. **Chi phí nhân sự cao**: Trung tâm đang trả ~200.000 VNĐ/bài Speaking cho freelance tutor. Với ~300 bài/tháng, chi phí chấm riêng Speaking đã ~60 triệu. Nếu có AI chấm nhanh (dù là tham khảo), có thể giảm 60–70% lượng bài cần tutor chấm.
5. **Học viên tự luyện không có feedback**: Nhiều học viên muốn tự ghi âm ở nhà để luyện nhưng không biết mình nói sai ở đâu. Hiện tại hệ thống chỉ cho phép ghi âm rồi... để đó. Không có cơ chế đánh giá tự động.
6. **Không theo dõi được tiến bộ Speaking**: Khác với Reading/Listening (chấm tự động, có biểu đồ điểm), Speaking không có dữ liệu điểm liên tục nên không vẽ được đường tiến bộ cho học viên.

---

## 2. Ghi chép yêu cầu thô từ khách hàng (Customer Voice / Raw Notes)

Dưới đây là nguyên văn các yêu cầu được ghi lại trong buổi phỏng vấn nhu cầu nghiệp vụ:

### Từ Nguyễn Duy Mạnh (Học viên — cựu học viên IELTS tại trung tâm Lango, đã trải nghiệm quy trình chấm bài tại trung tâm):

- "Hồi em học ở Lango, mỗi lần nộp bài Speaking phải chờ 3–5 ngày mới có điểm. Nộp xong quên luôn mình nói gì, đến khi có feedback thì không nhớ context nữa. Em muốn có AI chấm tức thì — nộp bài xong, đi làm việc khác, lát quay lại thấy điểm luôn."
- "Em từng bị 2 giáo viên ở trung tâm chấm cùng 1 bài mà cho điểm chênh nhau gần 1.0 band. Cô A cho 6.0, thầy B cho 5.0. Em không biết tin ai. Nếu có AI chấm thì ít nhất nó nhất quán, cùng bài cho cùng điểm."
- "Kết quả AI phải ghi rõ 'đây là điểm ước tính AI, không phải điểm IELTS chính thức'. Đừng để mọi người hiểu nhầm, đặc biệt phụ huynh. Phải có dòng disclaimer rõ ràng."
- "Điểm phải chia 4 tiêu chí giống thi IELTS thật: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation. Mỗi tiêu chí có band riêng, rồi tính Overall band. Ở Lango giáo viên cũng chấm theo 4 tiêu chí này nên em quen rồi."
- "Audio em nộp lên phải riêng tư. Em không muốn ai khác — kể cả bạn cùng lớp hay giáo viên khác — nghe được bài Speaking của em. Đây là bài nói cá nhân, liên quan quyền riêng tư."
- "Nếu AI bị lỗi thì cho em thử lại, đừng tự chuyển sang giáo viên chấm. Em chọn AI là vì muốn kết quả nhanh, chuyển giáo viên thì chờ thêm mấy ngày, mất ý nghĩa."
- "Em muốn nó ghi lại hết: nộp bài lúc nào, AI chấm xong lúc nào, kết quả bao nhiêu. Cuối tháng em muốn mở ra xem tiến bộ thế nào, Band 5.5 → 6.0 → 6.5, có bằng chứng rõ ràng chứ không phải mơ hồ."
- "Mỗi ngày em muốn luyện 2–3 bài Speaking, nên số lần được chấm AI phải đủ. Gói Free cho 2 bài/ngày, gói Premium nhiều hơn thì hợp lý. Nhưng giá trị cụ thể để sau, miễn là config được."

### Từ Nguyễn Hướng Dương (Học viên — IELTS 6.5, quan tâm đến chất lượng chấm và tính chính xác của AI):

- "Em muốn AI chấm phải cho ra transcript — bản ghi lại lời em nói. Em cần đọc transcript để biết AI chấm có hợp lý không. Ví dụ AI cho Pronunciation 7.0 nhưng transcript đầy lỗi phát âm thì em nghi ngờ kết quả đó."
- "Transcript nên có 2 bản: bản thô từ speech-to-text và bản đã clean up cho dễ đọc. Bản thô giữ nguyên làm bằng chứng, bản sạch để hiển thị. Đừng để bản sạch ghi đè bản thô, vì em muốn đối chiếu."
- "Audio upload lên phải kiểm tra kỹ: file có đúng là audio không, có đúng định dạng không, có bị rỗng không, có tiếng người nói không. Hồi trước em từng lỡ nộp file bị lỗi ở trung tâm, mất cả tuần chờ mà không có kết quả gì."
- "Mỗi bài Speaking có 3 Part, mỗi Part có đề riêng. AI phải biết đề là gì để chấm cho đúng context. Ví dụ Part 2 đề 'Describe a book', mà mình nói về 'a trip to Đà Lạt' thì phải bị trừ điểm chứ."
- "Đừng để AI tự bịa nội dung. Nếu audio em nhiễu quá, nghe không ra, thì cứ báo 'không thể chấm do chất lượng audio'. Đừng cố đoán rồi cho điểm lung tung — thà không có điểm còn hơn điểm sai."
- "Overall band phải do hệ thống tính từ 4 tiêu chí. Em hay test mấy app AI bên ngoài, overall nó trả về hay sai. Mình tự tính từ 4 band cho chắc, theo đúng quy tắc làm tròn IELTS."
- "Feedback phải chia theo từng Part. Part 1 nhận xét riêng, Part 2 riêng, Part 3 riêng. Đừng gom chung chung kiểu 'bạn nói tốt' là xong. Em cần biết Part nào yếu để tập trung luyện."
- "Nếu em mở 2 tab cùng nộp 1 bài thì đừng tạo 2 job tính 2 lần quota. Chỉ tạo 1 lần, lần sau trả kết quả cũ là được."

### Từ Nguyễn Bá Quang Minh (Học viên — IELTS 6.5, đang luyện thi lên 7.0, góc nhìn trải nghiệm người dùng):

- "Em muốn thi thử Speaking trên máy tính. Ghi âm 3 phần giống thi thật, nộp lên, rồi vài phút sau thấy kết quả. Giống mấy app bên Trung Quốc mà bạn em hay dùng ấy, nhưng cho IELTS."
- "Em muốn biết em nói sai ở đâu. Ví dụ phát âm sai từ nào, câu nào ngữ pháp lỗi. Có transcript để em đọc lại thì tốt. Trước giờ em chỉ nghe lại audio của mình mà không biết đúng sai."
- "Nếu AI chấm lỗi, em muốn bấm 'Thử lại' chứ không muốn phải ghi âm lại từ đầu. Em đã nói cả 14 phút rồi mà bắt nói lại thì chán lắm. Retry phải dùng lại audio đã upload."
- "Điểm AI em biết là tham khảo thôi, nhưng em muốn nó gần đúng. Ít nhất chênh lệch với giáo viên chấm không quá 1 band thì em chấp nhận được."
- "Em chỉ muốn thấy bài của em thôi. Đừng để bạn khác thấy bài Speaking của em, ngại lắm. Bài AI là bài tự luyện, tách biệt với bài nộp cho giáo viên."
- "Em muốn xem lại lịch sử, so sánh bài tuần trước với tuần này xem tiến bộ chưa. Có biểu đồ band theo thời gian thì hay."
- "Lúc em nộp bài xong, đừng bắt em ngồi chờ ở trang đó. Cho em biết 'đang chấm', em đi xem bài khác, lát quay lại thấy kết quả. Hoặc có thông báo realtime thì càng tốt."
- "File ghi âm em upload lên, em muốn nghe lại được. Đừng xoá mất. Mỗi lần bấm 'Nghe lại' thì tạo link tạm là được, không cần lưu link vĩnh viễn."
- "Upload audio phải nhanh. Em thấy mấy trang upload qua server rất chậm. Cho upload thẳng lên cloud đi, server chỉ cấp link upload thôi."
- "Nếu AI lỗi hết mấy lần retry rồi thì thôi, báo lỗi cho em biết, đừng có âm thầm chuyển sang giáo viên. Em chọn AI là chủ đích, hai luồng phải tách biệt."

---

## 3. Các câu hỏi làm rõ phát sinh trong quá trình phân tích (Clarification Questions)

Trước khi viết `spec.md`, nhóm phân tích đã đặt lại các câu hỏi sau cho khách hàng để làm rõ yêu cầu:

1. **Hỏi**: Bài Speaking có 3 Part (Part 1, 2, 3). Học viên upload cả 3 cùng lúc hay upload từng Part rồi nộp?
   **Trả lời**: Upload từng Part riêng (3 file audio riêng biệt), rồi bấm nộp 1 lần để gửi cả 3 Part cùng lúc cho AI chấm. Không cho phép nộp thiếu Part.
2. **Hỏi**: Định dạng audio hỗ trợ những gì? Có giới hạn dung lượng không?
   **Trả lời**: Hỗ trợ các format phổ biến: MP3, WAV, WebM, M4A, OGG. Giới hạn mỗi file tối đa 50 MB. Thời lượng mỗi Part tối đa 5 phút (Part 1), 3 phút (Part 2), 7 phút (Part 3) — lấy theo format thi IELTS thật.
3. **Hỏi**: Khi AI chấm lỗi, học viên được retry bao nhiêu lần?
   **Trả lời**: Hệ thống tự động retry 1 lần (nếu lỗi tạm thời). Nếu vẫn lỗi, cho học viên tự bấm retry tối đa 2 lần nữa. Tổng cộng tối đa 2 lần retry thủ công. Retry không tốn thêm quota.
4. **Hỏi**: Điểm band AI tính theo thang nào? Nửa band hay tròn band?
   **Trả lời**: Theo thang IELTS chuẩn: nửa band (5.0, 5.5, 6.0, 6.5...). Cả 4 tiêu chí đều theo nửa band. Overall tính trung bình rồi làm tròn theo quy tắc IELTS.
5. **Hỏi**: AI provider là gì? Dùng OpenAI, Google, hay tự build model?
   **Trả lời**: Để team dev quyết định. Yêu cầu là phải wrap lại thành adapter, sau này đổi provider không ảnh hưởng business logic. Hiện tại có thể dùng OpenAI Whisper (speech-to-text) + GPT-4 (chấm điểm) hoặc tương đương.
6. **Hỏi**: Học viên có thể xoá bài Speaking đã nộp không?
   **Trả lời**: Chưa quyết định. Tạm thời không cho xoá. Để sau khi có chính sách data retention rồi tính. (*→ Ghi nhận vào spec mục "NEEDS CLARIFICATION"*)
7. **Hỏi**: Giáo viên có quyền xem bài Speaking AI của học viên không?
   **Trả lời**: Không. Bài AI là bài tự luyện, chỉ học viên đó xem được. Giáo viên chỉ chấm bài được phân công qua luồng riêng (admin assignment). Hai luồng hoàn toàn tách biệt.
8. **Hỏi**: Audio upload qua đâu? Qua server hay trực tiếp lên cloud storage?
   **Trả lời**: Upload trực tiếp lên cloud storage (pre-signed URL) để giảm tải server. Server chỉ cấp URL upload có thời hạn (5 phút), học viên upload thẳng lên storage, xong gọi API submit.
9. **Hỏi**: Nếu 2 tab cùng nộp 1 bài (race condition), xử lý sao?
   **Trả lời**: Dùng idempotency key. Lần nộp đầu tiên tạo job, lần sau trả về job cũ. Không tạo trùng, không tốn thêm quota. (*→ Ghi nhận vào spec mục idempotency*)
10. **Hỏi**: Khi AI đang chấm, học viên có thể rời trang không? Quay lại có thấy kết quả không?
    **Trả lời**: Có, hoàn toàn được rời trang. Khi quay lại trang Speaking history sẽ thấy trạng thái (đang chấm / đã xong). Nếu đang mở trang thì dùng polling hoặc realtime notification để cập nhật.
11. **Hỏi**: Transcript AI có cho phép học viên chỉnh sửa không?
    **Trả lời**: Không. Transcript là bằng chứng, không được sửa. Cả bản ASR thô lẫn bản clean đều read-only với học viên.
12. **Hỏi**: Kết quả AI có hiển thị cùng kết quả giáo viên chấm (nếu có) không?
    **Trả lời**: Không. Hai luồng hoàn toàn tách biệt. Bài nộp AI không liên quan bài nộp cho giáo viên. Học viên vào mục "AI Practice" thấy bài AI, vào mục "My Submissions" thấy bài giáo viên chấm.
13. **Hỏi**: Có cần chức năng calibration (hiệu chuẩn AI) với điểm giáo viên không?
    **Trả lời**: Có, nhưng sau. Phase 1 ra ước tính (estimate) trước. Phase 2 mới làm calibration — so sánh điểm AI với điểm giáo viên trên cùng bài để tinh chỉnh. Tạm thời ghi là TARGET. (*→ Ghi nhận vào spec mục calibration gates*)
14. **Hỏi**: URL audio có thời hạn bao lâu? Học viên nghe lại bài cũ thì sao?
    **Trả lời**: URL download audio có chữ ký (signed URL) hết hạn sau 5 phút. Mỗi lần học viên bấm "Nghe lại", hệ thống tạo URL mới. Không lưu URL vĩnh viễn.
15. **Hỏi**: Có phân biệt gói Free / Premium cho tính năng AI Speaking không?
    **Trả lời**: Có ý định nhưng chưa quyết giá trị cụ thể. Tạm thời làm config quota theo env, sau này tích hợp với hệ thống subscription. Đừng hard-code giá trị.
16. **Hỏi**: Bài thi Speaking (đề bài) lấy từ đâu?
    **Trả lời**: Từ ngân hàng đề thi Speaking đã có trên hệ thống (do Content Admin tạo). Mỗi bài thi Speaking có sẵn 3 Part với câu hỏi cụ thể. AI chấm phải tham chiếu đề tương ứng.
17. **Hỏi**: Nếu audio nghe rõ nhưng không phải tiếng Anh (ví dụ học viên nói tiếng Việt), AI xử lý sao?
    **Trả lời**: Giảm điểm nặng ở tất cả tiêu chí. ASR vẫn cố transcribe, AI đánh giá dựa trên nội dung thực tế. Không cần reject hoàn toàn.
18. **Hỏi**: Có cần gửi email/notification khi AI chấm xong không?
    **Trả lời**: Phase 1 chưa cần. Realtime update trên web (Socket.io hoặc polling) là đủ. Push notification để sau.
19. **Hỏi**: Worker xử lý AI chạy ở đâu? Cùng server hay riêng?
    **Trả lời**: Để team dev quyết định kiến trúc. Yêu cầu là phải bất đồng bộ, không block API server. Có thể dùng queue (Bull/BullMQ) hoặc tương đương.
20. **Hỏi**: Nếu worker bị crash giữa chừng khi đang chấm, bài chấm dở xử lý sao?
    **Trả lời**: Cần có cơ chế heartbeat. Nếu worker không heartbeat trong X giây thì bài đó được nhả ra cho worker khác nhặt. Không mất bài.
