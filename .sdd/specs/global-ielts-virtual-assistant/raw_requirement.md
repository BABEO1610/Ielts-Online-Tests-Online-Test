# Yêu cầu thô — Trợ lý ảo IELTS toàn cục (Global IELTS Virtual Assistant)

**Ngày ghi nhận**: 2026-05-18
**Nguồn**: Buổi phỏng vấn nhu cầu nghiệp vụ lần 1 + lần 2 với học viên IELTS có kinh nghiệm thực tế
**Người phỏng vấn**: Nhóm phân tích BA (Team IELTSZone)
**Người được phỏng vấn**: Nguyễn Duy Mạnh (Học viên, cựu học viên IELTS tại trung tâm Lango), Nguyễn Hướng Dương (Học viên, IELTS 6.5), Nguyễn Bá Quang Minh (Học viên, IELTS 6.5)
**Tình trạng**: Đã tiếp nhận → Dùng làm đầu vào để chuẩn hoá thành `spec.md`

---

## 1. Bối cảnh & Vấn đề thực tế (Pain Points)

Qua phỏng vấn, các học viên phản ánh các vấn đề sau khi tự học IELTS trên nền tảng online:

1. **Không biết hỏi ai khi tự học**: Học viên tự luyện đề trên web, gặp câu hỏi không hiểu (ví dụ: "tại sao đáp án là B mà không phải C?") nhưng không có ai giải đáp tức thì. Phải chờ đến buổi học tiếp hoặc hỏi trên group Facebook, mất thời gian và không chắc chắn câu trả lời đúng.
2. **Khó tìm bài thi / tài liệu phù hợp**: Hệ thống có nhiều bài thi và tài liệu nhưng không có cơ chế gợi ý thông minh. Học viên phải tự duyệt từng trang, không biết bài nào phù hợp trình độ, bài nào mới được thêm vào.
3. **Không hiểu lý do sai khi xem lại kết quả**: Sau khi làm bài thi xong, học viên xem lại đáp án nhưng nhiều câu không có giải thích. Hoặc có giải thích nhưng quá ngắn, không hiểu. Cần ai đó "giảng lại" cho từng câu.
4. **Mất ngữ cảnh khi chuyển trang**: Học viên đang hỏi về một topic ở trang Reading, chuyển sang trang Listening thì chatbot quên hết. Mỗi lần phải giải thích lại từ đầu.
5. **Lo ngại bảo mật thông tin cá nhân**: Học viên không muốn chatbot "nhớ" quá nhiều thông tin cá nhân hoặc chia sẻ nội dung trò chuyện với người khác. Cũng không muốn chatbot tiết lộ thông tin hệ thống (API key, model AI...).
6. **Dùng chatbot gian lận khi thi**: Một số học viên thừa nhận sẽ thử dùng chatbot để hỏi đáp án khi đang làm bài thi trên hệ thống. Cần có cơ chế ngăn chặn.

---

## 2. Ghi chép yêu cầu thô từ khách hàng (Customer Voice / Raw Notes)

Dưới đây là nguyên văn các yêu cầu được ghi lại trong buổi phỏng vấn nhu cầu nghiệp vụ:

### Từ Nguyễn Duy Mạnh (Học viên — cựu học viên IELTS tại trung tâm Lango, đã trải nghiệm nhiều nền tảng luyện thi online):

- "Hồi em học ở Lango, mỗi lần tự luyện đề trên web mà không hiểu đáp án thì phải screenshot lại, chờ buổi học hỏi giáo viên. Có khi quên luôn. Em muốn có 1 cái chatbot ở góc màn hình, click vào là hỏi được liền, kiểu như ChatGPT nhưng chuyên IELTS."
- "Chatbot phải biết trả lời bằng tiếng Việt nếu em hỏi tiếng Việt, và tiếng Anh nếu em hỏi tiếng Anh. Đừng bắt em phải hỏi bằng tiếng Anh, nhiều khi em muốn hỏi nhanh bằng tiếng Việt cho tiện."
- "Em muốn hỏi kiểu: 'mẹo làm Reading nhanh', 'cách paraphrase cho Writing Task 2', 'từ vựng topic Environment'. Chatbot phải trả lời được mấy câu kiến thức IELTS cơ bản, không cần quá sâu nhưng phải đúng."
- "Khi em làm xong bài thi Reading trên hệ thống, em xem lại kết quả. Có câu em sai mà không hiểu tại sao. Em muốn click vào chatbot và hỏi: 'Tại sao câu 15 đáp án là TRUE mà không phải FALSE?'. Chatbot phải biết em đang xem bài nào và trả lời dựa trên giải thích chính thức có sẵn."
- "Nhưng mà — nếu em đang làm bài thi (chưa nộp), thì chatbot phải bị khóa. Đừng để em hỏi đáp án. Thi xong mới cho hỏi. Chứ không thì gian lận quá."
- "Chatbot chỉ dành cho học viên thôi. Giáo viên với admin có công cụ riêng rồi, đừng lẫn vào. Đăng nhập rồi mới dùng được, khách vãng lai thì hiện dòng 'Đăng nhập để sử dụng trợ lý'."
- "Nếu AI bị lỗi (ví dụ API die), thì chatbot phải báo kiểu lịch sự: 'Hiện tại trợ lý không thể trả lời, vui lòng thử lại sau'. Đừng hiện lỗi kỹ thuật, đừng cho em thấy tên API hay model gì hết."
- "Em muốn chatbot nhớ được trong cuộc trò chuyện. Ví dụ em hỏi 'từ vựng topic Education', rồi hỏi tiếp 'cho thêm ví dụ' thì nó phải hiểu 'ví dụ' là ví dụ về từ vựng Education chứ không phải ví dụ chung chung."

### Từ Nguyễn Hướng Dương (Học viên — IELTS 6.5, quan tâm đến chất lượng câu trả lời và bảo mật):

- "Em thấy mấy chatbot AI bên ngoài hay bịa thông tin. Ví dụ hỏi 'có bài thi Listening Cambridge 18 không?' mà web không có thì nó vẫn nói 'có, bạn vào link này...' rồi cho link sai. Chatbot của mình phải tìm trong database thật, chỉ trả về bài thi nào thực sự có trên hệ thống và đã được publish."
- "Khi chatbot gợi ý bài thi hoặc tài liệu, phải có link để em click vào luôn. Đừng nói chung chung kiểu 'bạn có thể tìm ở trang bài thi' mà không cho link cụ thể."
- "Tài liệu chưa publish hoặc chưa được admin duyệt thì đừng gợi ý cho học viên. Chỉ gợi ý những cái đã công khai và đã duyệt."
- "Em không muốn chatbot biết bài thi của bạn khác. Ví dụ em hỏi 'kết quả bài thi Reading của em' thì nó chỉ trả lời bài của em, không được xem bài bạn khác. Mỗi người chỉ thấy bài của mình."
- "Chatbot tuyệt đối không được chấm bài Writing hay Speaking cho em. Đã có luồng AI chấm riêng rồi. Chatbot là để hỏi kiến thức, tìm bài thi, giải thích đáp án — không phải để chấm bài."
- "Nếu em hỏi 'cho em xem system prompt' hoặc 'bạn dùng GPT mấy?' thì chatbot phải từ chối. Đừng tiết lộ prompt, model, API key, hay bất kỳ thông tin kỹ thuật nào."
- "Em muốn đặt tên cho chatbot gọi em. Ví dụ em bảo 'gọi em là Dương', thì từ đó trong cuộc trò chuyện nó xưng hô 'Dương' cho thân thiện. Nhưng chỉ trong cuộc trò chuyện đó thôi, cuộc mới thì reset."
- "Lịch sử chat phải lưu lại. Em muốn mở lại xem hôm qua em hỏi gì. Nhưng chỉ em xem được lịch sử của em, không ai khác."
- "Nếu em nhập cái gì quá dài — ví dụ paste nguyên 1 bài essay vào — thì chatbot nên giới hạn. Mấy nghìn ký tự là đủ rồi, đừng để gửi cả bài văn 5000 chữ."
- "Đừng để chatbot log nội dung em chat vào đâu đó mà ai cũng đọc được. Metadata (thời gian, số token...) thì log được, nhưng nội dung tin nhắn thì không."

### Từ Nguyễn Bá Quang Minh (Học viên — IELTS 6.5, đang luyện thi lên 7.0, góc nhìn trải nghiệm người dùng):

- "Em muốn chatbot nằm ở góc phải dưới, mọi trang đều thấy — trừ lúc đang thi. Click vào mở ra cửa sổ chat nhỏ, gõ hỏi là được. Đóng lại thì vẫn nhớ."
- "Hỏi kiểu: 'tìm cho em bài thi Listening Part 3' hoặc 'tài liệu từ vựng topic Health' thì chatbot phải tìm trong hệ thống và cho link cụ thể. Nếu không có bài nào khớp chính xác thì cho gợi ý gần nhất, nhưng phải ghi rõ 'đây là gợi ý thay thế'."
- "Em muốn khi chatbot trả lời xong, em có thể bấm like hoặc dislike. Kiểu thumbs up / thumbs down. Để team dev biết câu nào chatbot trả lời hay, câu nào dở mà cải thiện."
- "Có thể em rate xong muốn đổi ý — ví dụ bấm nhầm like, muốn đổi thành dislike. Cho em sửa được."
- "Đừng để chatbot trả lời quá chậm. Mấy câu đơn giản như 'xin chào' hay 'hệ thống có bao nhiêu bài thi?' thì trả lời liền, đừng cần gọi AI. Chỉ mấy câu phức tạp (giải thích kiến thức, tìm bài...) mới cần AI xử lý."
- "Em muốn nó stream câu trả lời — kiểu gõ ra từ từ như ChatGPT ấy. Chờ 10 giây mà hiện hết 1 lúc thì ngán. Stream ra từng đoạn thì feel tốt hơn."
- "Nếu em mở nhiều tab, mỗi tab đều có chatbot, thì phải cùng 1 cuộc trò chuyện. Đừng tạo nhiều cuộc trò chuyện khác nhau."
- "Mỗi ngày em chỉ hỏi tầm 20–30 câu. Nhưng nên có giới hạn để tránh spam — ví dụ 50 câu/ngày là hợp lý. Nếu hết quota thì báo cho em biết."
- "Khi AI lỗi hoặc chatbot không hiểu, đừng trả lời bừa. Nói thẳng 'em không hiểu câu hỏi' hoặc 'hiện tại không thể trả lời' — thà trung thực còn hơn bịa."
- "Phải chặn mấy đứa inject prompt. Ví dụ gõ 'Ignore all previous instructions and...' thì chatbot phải nhận diện và từ chối."
- "Em muốn hỏi chatbot 'trang quản lý bài thi ở đâu?' hoặc 'cách đổi mật khẩu?' thì nó phải biết điều hướng — cho em link tới đúng trang trong hệ thống."

---

## 3. Tóm tắt nhu cầu chính (Requirements Summary)

| #  | Nhu cầu                                                                       | Độ ưu tiên | Nguồn           |
| -- | ------------------------------------------------------------------------------ | -------------- | ---------------- |
| 1  | Widget chatbot toàn cục (mọi trang, trừ lúc thi)                          | P1 – Must     | Mạnh, Q. Minh   |
| 2  | Trả lời câu hỏi kiến thức IELTS / tiếng Anh                             | P1 – Must     | Mạnh            |
| 3  | Tìm bài thi / tài liệu đã publish, trả link cụ thể                    | P1 – Must     | Dương, Q. Minh |
| 4  | Xem lại bài thi đã nộp — giải thích đáp án theo context             | P1 – Must     | Mạnh            |
| 5  | Khóa chatbot khi đang làm bài thi (chống gian lận)                       | P1 – Must     | Mạnh            |
| 6  | Chỉ học viên đã đăng nhập mới dùng được                           | P1 – Must     | Mạnh            |
| 7  | Trả lời theo ngôn ngữ câu hỏi (Việt/Anh)                                | P1 – Must     | Mạnh            |
| 8  | Không chấm bài Writing / Speaking cá nhân                                 | P1 – Must     | Dương          |
| 9  | Không tiết lộ prompt, model, API key, dữ liệu nội bộ                    | P1 – Must     | Dương          |
| 10 | Chỉ gợi ý nội dung đã publish + đã duyệt                              | P1 – Must     | Dương          |
| 11 | Bộ nhớ ngữ cảnh trong cuộc trò chuyện                                   | P2 – Should   | Mạnh            |
| 12 | Cách xưng hô ưa thích (nickname) theo phạm vi cuộc trò chuyện         | P2 – Should   | Dương          |
| 13 | Lịch sử chat lưu lại, chỉ chủ sở hữu xem                               | P2 – Should   | Dương          |
| 14 | Đánh giá tin nhắn (like / dislike), cho phép sửa đổi                   | P2 – Should   | Q. Minh          |
| 15 | Stream câu trả lời (SSE)                                                    | P2 – Should   | Q. Minh          |
| 16 | Fallback an toàn khi AI lỗi — không bịa, không tiết lộ lỗi kỹ thuật | P1 – Must     | Mạnh, Q. Minh   |
| 17 | Giới hạn độ dài tin nhắn (~2000 ký tự)                                 | P2 – Should   | Dương          |
| 18 | Quota hàng ngày (~50 tin nhắn/ngày)                                        | P3 – Nice     | Q. Minh          |
| 19 | Rate limiting chống spam (30 req/phút)                                       | P2 – Should   | (Kỹ thuật)     |
| 20 | Chống prompt injection                                                        | P1 – Must     | Q. Minh          |
| 21 | Điều hướng trang trong hệ thống                                          | P2 – Should   | Q. Minh          |
| 22 | Câu đơn giản (chào, thao tác) trả lời xác định, không cần gọi AI | P2 – Should   | Q. Minh          |
| 23 | Phân quyền chủ sở hữu: chỉ xem bài thi/kết quả của mình             | P1 – Must     | Dương          |
| 24 | Không log nội dung tin nhắn thô, chỉ log metadata                         | P2 – Should   | Dương          |

---

## 4. Các câu hỏi làm rõ phát sinh trong quá trình phân tích (Clarification Questions)

Trước khi viết `spec.md`, nhóm phân tích đã đặt lại các câu hỏi sau cho các học viên và nội bộ team để làm rõ yêu cầu:

1. **Hỏi**: Chatbot hiển thị ở mọi trang hay chỉ một số trang nhất định?
   **Trả lời**: Mọi trang đều hiển thị widget chatbot ở góc phải dưới. Ngoại trừ khi học viên đang trong bài thi (active test) thì widget bị vô hiệu hoá. Server cần kiểm tra trạng thái bài thi đang làm.
2. **Hỏi**: Chatbot có hỗ trợ ngôn ngữ nào ngoài Việt và Anh không?
   **Trả lời**: Phase 1 chỉ Việt và Anh. Trả lời theo ngôn ngữ câu hỏi. Nếu gõ tiếng Việt thì trả tiếng Việt, gõ tiếng Anh thì trả tiếng Anh.
3. **Hỏi**: Khi học viên hỏi về bài thi đã nộp, chatbot lấy giải thích từ đâu?
   **Trả lời**: Lấy từ dữ liệu giải thích chính thức (official explanation) đã lưu trong database. Không tự bịa giải thích. Nếu câu hỏi không có giải thích chính thức thì nói rõ "câu này chưa có giải thích chi tiết". Bài phải thuộc sở hữu người hỏi và đã nộp mới trả lời.
4. **Hỏi**: Chatbot có chấm Writing / Speaking không?
   **Trả lời**: Tuyệt đối KHÔNG. Chatbot không được chấm bài, cho điểm band, hay dự đoán band cá nhân. Đã có luồng AI chấm riêng. Chatbot chỉ giải đáp kiến thức, tìm bài, giải thích đáp án.
5. **Hỏi**: Nếu không tìm thấy bài thi / tài liệu khớp chính xác thì xử lý sao?
   **Trả lời**: Gợi ý bài/tài liệu gần nhất (thay thế), nhưng phải ghi rõ "đây là gợi ý thay thế, không phải kết quả khớp chính xác". Đừng bịa ra bài không tồn tại. (*→ Ghi nhận vào spec mục grounded search*)
6. **Hỏi**: Giới hạn độ dài tin nhắn bao nhiêu?
   **Trả lời**: Tối đa 2.000 ký tự đã trim. Đủ để hỏi chi tiết nhưng tránh paste nguyên bài essay. Tin nhắn rỗng hoặc chỉ khoảng trắng cũng bị reject.
7. **Hỏi**: Lịch sử chat lưu bao nhiêu tin nhắn? Có xoá được không?
   **Trả lời**: Hiển thị 100 tin nhắn gần nhất trong cuộc trò chuyện. Xoá lịch sử chưa quyết, để sau. (*→ Ghi nhận vào spec mục "NEEDS CLARIFICATION"*)
8. **Hỏi**: Chatbot nhớ bao lâu? Nhớ xuyên cuộc trò chuyện không?
   **Trả lời**: Chỉ nhớ trong 1 cuộc trò chuyện (session). Cuộc trò chuyện mới thì reset bộ nhớ. Không có cá nhân hoá dài hạn xuyên session. Nhớ mấy lượt gần nhất (vài cặp hỏi-đáp) để giữ ngữ cảnh.
9. **Hỏi**: Cách xưng hô ưa thích (nickname) có quy tắc gì?
   **Trả lời**: Tối đa 60 ký tự, 8 từ. Từ chối nội dung giống chỉ thị (prompt injection qua nickname). Chỉ có hiệu lực trong cuộc trò chuyện đó. Có thể xoá/reset.
10. **Hỏi**: Hệ thống đánh giá tin nhắn hoạt động thế nào?
    **Trả lời**: Chỉ đánh giá tin nhắn của trợ lý (không đánh giá tin người dùng). Thumbs up hoặc thumbs down. Cho phép đổi ý (re-rate). Chỉ chủ sở hữu cuộc trò chuyện mới rate được.
11. **Hỏi**: Có cần lý do khi đánh giá (rating reason) không?
    **Trả lời**: Có thể thêm lý do tùy chọn, nhưng chưa quyết giới hạn độ dài và chính sách nội dung. (*→ Ghi nhận vào spec mục "NEEDS CLARIFICATION"*)
12. **Hỏi**: Chatbot dùng AI provider nào? Nếu provider die thì sao?
    **Trả lời**: Team dev quyết định provider. Yêu cầu: khi AI lỗi, trả fallback an toàn (tin nhắn xác định, lịch sự, không tiết lộ lỗi kỹ thuật). Chưa cần chuyển đổi dự phòng sang provider khác (failover).
13. **Hỏi**: SSE stream hay JSON response?
    **Trả lời**: Hỗ trợ cả 2. JSON endpoint cho câu trả lời ngắn/đơn giản. SSE stream cho câu trả lời dài — hiển thị từ từ kiểu ChatGPT. Frontend phải xử lý được SSE events: `assistant.start → assistant.delta → assistant.done`.
14. **Hỏi**: Mấy câu đơn giản (chào hỏi, status) có cần gọi AI không?
    **Trả lời**: Không. Lời chào, thao tác tùy chọn, điều hướng route đã biết, fallback khi lỗi — tất cả đều xác định (deterministic), không cần gọi AI. Chỉ gọi AI khi cần tạo ngôn ngữ tự nhiên (giải thích kiến thức, tổng hợp nội dung...).
15. **Hỏi**: Rate limiting như thế nào?
    **Trả lời**: 30 request/phút/IP cho chat và stream. Quota 50 tin nhắn/ngày/học viên — nhưng cách tính (bị chặn/lỗi có tính không?) chưa quyết. (*→ Ghi nhận vào spec mục "NEEDS CLARIFICATION"*)
16. **Hỏi**: Chatbot có tìm kiếm kiểu RAG (vector search / embedding) không?
    **Trả lời**: Phase 1 chưa. Dùng truy vấn database trực tiếp với điều kiện publish/approve. RAG/vector search để phase sau.
17. **Hỏi**: Giáo viên / admin có dùng được chatbot này không?
    **Trả lời**: Không. Chatbot này chỉ cho học viên. Giáo viên và admin có công cụ riêng. Đừng cho phép dùng chatbot học viên chỉ vì có role cao hơn.
18. **Hỏi**: Khi server detect học viên đang làm bài thi, chatbot bị khóa hoàn toàn hay vẫn mở nhưng giới hạn?
    **Trả lời**: Khóa hoàn toàn. Không cho gửi tin nhắn. Hiện thông báo "Trợ lý không khả dụng trong khi bạn đang làm bài thi". Hiện tại server tin tưởng page type do client gửi, nhưng mục tiêu là server tự kiểm tra bài thi active.
19. **Hỏi**: Chatbot có hỗ trợ gửi hình ảnh / file không?
    **Trả lời**: Phase 1 chỉ text thuần. Không upload hình, file, audio. Chỉ gõ text và nhận text.
20. **Hỏi**: Log nội dung chat vào đâu?
    **Trả lời**: Chỉ log metadata (thời gian, số token, mã lỗi). KHÔNG log nội dung tin nhắn thô hoặc prompt vào bảng usage/metrics. Tin nhắn lưu trong bảng chat history, chỉ chủ sở hữu truy cập.
21. **Hỏi**: Nếu chỉ lưu được tin nhắn người dùng mà lưu tin trợ lý bị lỗi (hoặc ngược lại), xử lý sao?
    **Trả lời**: Vẫn trả câu trả lời cho người dùng — đừng block vì lỗi lưu trữ. Nhưng ghi nhận là cần cải thiện: target là lưu cặp người dùng/trợ lý nguyên tử (atomic). (*→ Ghi nhận vào spec mục TARGET*)
22. **Hỏi**: Cuộc trò chuyện cũ có thể mở lại không? Có thể xoá không?
    **Trả lời**: Chưa quyết. Tạm thời chỉ có cuộc trò chuyện active. Đóng/mở lại/xoá/xuất dữ liệu — tất cả để sau. (*→ Ghi nhận vào spec mục "NEEDS CLARIFICATION"*)

---

## 5. Ràng buộc & giả định từ học viên

- Hệ thống đã có sẵn xác thực cookie/session và phân quyền vai trò (student/tutor/admin).
- Database đã có bảng bài thi (tests), tài liệu (materials/resources) với cờ published/approved, và bảng submissions với dấu thời gian nộp.
- Học viên đã quen giao diện chatbot kiểu ChatGPT / Messenger, nên UX không cần quá khác biệt.
- Không cần chatbot "thông minh" 100% — nhưng phải an toàn, không bịa, không tiết lộ thông tin nội bộ.
- Budget AI provider ước tính ~$100–200/tháng cho chatbot (ít hơn AI chấm bài vì tin nhắn ngắn hơn).

---

## 6. Phụ lục: Ghi chú buổi phỏng vấn

> **Ghi chú buổi phỏng vấn lần 1 (2026-05-18)**
>
> - Hình thức: Online (Google Meet)
> - Thời lượng: ~75 phút
> - Tham gia: Nguyễn Duy Mạnh, Nguyễn Hướng Dương, BA team (2 người)
> - Chủ đề: Pain points khi tự học IELTS online, nhu cầu chatbot hỗ trợ
> - Đặc biệt: Mạnh chia sẻ trải nghiệm dùng chatbot ở Lango (rất basic, chỉ FAQ tĩnh), mong muốn chatbot thông minh hơn

> **Ghi chú buổi phỏng vấn lần 2 (2026-05-25)**
>
> - Hình thức: Online (Google Meet)
> - Thời lượng: ~60 phút
> - Tham gia: Nguyễn Bá Quang Minh, Nguyễn Hướng Dương, BA team (2 người)
> - Chủ đề: Trải nghiệm UX chatbot, tìm bài thi, đánh giá, streaming, bảo mật
> - Đặc biệt: Quang Minh demo cách mình dùng ChatGPT để hỏi IELTS → chỉ ra hạn chế (hay bịa link, không biết bài nào có trên hệ thống)

> **Ghi chú bổ sung (2026-05-30)**
>
> - Dương gửi email bổ sung yêu cầu: chatbot KHÔNG chấm Writing/Speaking, nickname chỉ trong session
> - Mạnh confirm: phải khóa chatbot khi đang thi, không ngoại lệ
> - Team dev đề xuất dùng SSE single-delta pattern → cả nhóm đồng ý
> - Thống nhất: Phase 1 không làm RAG, không làm multi-provider failover, không cá nhân hoá dài hạn
