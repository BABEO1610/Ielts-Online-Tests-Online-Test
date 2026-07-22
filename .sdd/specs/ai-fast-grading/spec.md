# Đặc tả tính năng: Chấm nhanh Writing và Speaking bằng AI

**Nhánh tính năng**: `feature-global-ielts-virtual-assistant/Datnt`

**Ngày tạo**: 2026-07-21

**Ngày cập nhật**: 2026-07-22

**Trạng thái**: Đã duyệt triển khai AI Estimated Band cho Speaking; calibration tiếp tục là cổng nâng độ tin cậy, không tự động chuyển bài AI sang tutor

**Đầu vào**: Giữ nguyên luồng Writing đang hoạt động; luồng Speaking AI chấm bất đồng bộ từ transcript kết hợp audio và trả đủ bốn tiêu chí. Hàng đợi tutor chỉ dùng khi học viên chủ động chọn tutor.

## Bối cảnh nghiệp vụ

Học viên cần nhận phản hồi nhanh cho Writing và Speaking mà không phải chờ toàn bộ quy trình chấm thủ công. Writing có thể tiếp tục dùng bài viết làm bằng chứng cho bốn tiêu chí. Speaking khác biệt vì transcript không giữ đầy đủ độ trôi chảy, nhịp điệu, trọng âm, ngữ điệu, lỗi phát âm, khoảng dừng và tự sửa lỗi.

Vì vậy hệ thống không được suy ra Fluency & Coherence hoặc Pronunciation từ transcript đơn thuần. Transcript được dùng cho Lexical Resource, Grammatical Range & Accuracy và vế Coherence; audio thật được dùng cho Fluency và Pronunciation. Khi học viên chọn AI, hệ thống phải trả đủ bốn band nếu pipeline hoàn tất; lỗi provider hoặc evidence không đủ chuyển job sang `failed` theo retry policy, tuyệt đối không tự đổi `grader` sang tutor.

Điểm AI là ước tính phục vụ luyện tập, không phải điểm IELTS chính thức. Mỗi lần nộp tạo lịch sử mới và không ghi đè bài cũ.

## Kịch bản người dùng và kiểm thử *(bắt buộc)*

### Câu chuyện người dùng 1 - Giữ ổn định chấm Writing (Ưu tiên: P1)

Là học viên, tôi muốn nộp đủ Writing Task 1 và Task 2, chọn AI chấm và nhận phản hồi theo bốn tiêu chí để biết điểm mạnh, điểm yếu và hướng cải thiện.

**Lý do ưu tiên**: Writing là luồng đang tạo giá trị và không được bị gián đoạn trong lúc production hóa Speaking.

**Kiểm thử độc lập**: Dùng nhà cung cấp AI giả, nộp đúng Task 1 và Task 2, xác minh hai bài mới được lưu, ngưỡng từ được kiểm tra trước khi tiêu thụ lượt, hai báo cáo có thể truy xuất và band tổng hợp đúng trọng số 33%/67%.

**Kịch bản chấp nhận**:

1. **Cho trước** học viên gửi đúng một Task 1 và một Task 2 hợp lệ, **khi** nhà cung cấp trả dữ liệu đúng cấu trúc, **thì** hệ thống lưu hai báo cáo và chỉ công bố band tổng hợp khi cả hai task hoàn tất.
2. **Cho trước** Task 1 dưới 50 từ hoặc Task 2 dưới 100 từ, **khi** học viên nộp, **thì** hệ thống từ chối trước khi gọi nhà cung cấp hoặc trừ lượt.
3. **Cho trước** cùng một yêu cầu được gửi lại, **khi** kết quả đã tồn tại, **thì** hệ thống trả kết quả cũ mà không gọi nhà cung cấp lần nữa.

---

### Câu chuyện người dùng 2 - Nộp Speaking và theo dõi chấm bất đồng bộ (Ưu tiên: P1)

Là học viên, tôi muốn tải riêng tư đủ audio Part 1, Part 2 và Part 3, nộp một lần rồi theo dõi trạng thái để không phải giữ màn hình chờ trong lúc hệ thống phân tích.

**Lý do ưu tiên**: Xử lý audio có thể kéo dài và phụ thuộc dịch vụ ngoài; một request đồng bộ dễ timeout, tạo bài trùng hoặc để bài kẹt.

**Kiểm thử độc lập**: Dùng kho tệp và pipeline giả, xin quyền tải lên cho ba Part, nộp đúng tập `{1,2,3}` với một khóa chống lặp, nhận trạng thái chờ ngay và theo dõi tới trạng thái cuối mà không tạo thêm bài hoặc job.

**Kịch bản chấp nhận**:

1. **Cho trước** ba audio hợp lệ thuộc cùng học viên và đúng đề Speaking đã phát hành, **khi** học viên nộp đủ ba Part, **thì** hệ thống lưu ba bài cùng một phiên, tạo đúng một công việc chấm và trả trạng thái chờ mà không đợi AI hoàn tất.
2. **Cho trước** request thiếu Part, trùng Part, sai đề, tệp không thuộc học viên hoặc token tải lên không hợp lệ, **khi** nộp, **thì** hệ thống từ chối trước khi tạo công việc chấm hoặc tiêu thụ lượt.
3. **Cho trước** nhiều request đồng thời có cùng khóa và cùng dữ liệu, **khi** xử lý, **thì** tất cả tham chiếu cùng một phiên/công việc; cùng khóa nhưng dữ liệu khác bị từ chối.
4. **Cho trước** học viên làm mới trang, **khi** mở lại phiên đã nộp, **thì** trạng thái được lấy từ hệ thống và không phụ thuộc bộ nhớ tạm của trình duyệt.

---

### Câu chuyện người dùng 3 - Nhận đủ bốn band Speaking từ transcript và audio (Ưu tiên: P1)

Là học viên chọn AI, tôi muốn nhận đủ Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation và Overall mà không bị chuyển sang tutor.

**Lý do ưu tiên**: Đây là điều kiện tối thiểu để kết quả có thể bảo vệ về mặt chuyên môn trước hội đồng.

**Kiểm thử độc lập**: Chạy pipeline giả với ba audio Part, transcript ASR chưa sửa và audio evidence; xác minh kết quả đủ bốn band/Overall. Giả lập lỗi provider/evidence để xác minh job thất bại theo retry policy và `grader` vẫn là `ai`.

**Kịch bản chấp nhận**:

1. **Cho trước** cả ba Part có audio đạt chất lượng và transcript ASR, **khi** pipeline hoàn tất, **thì** hệ thống công bố bốn criterion band cùng Overall dưới nhãn `AI Estimated Band` và không đưa phiên vào hàng đợi tutor.
2. **Cho trước** một hoặc nhiều Part không đủ evidence audio, **khi** pipeline kết thúc, **thì** job thất bại an toàn, không sinh điểm một phần và không tự đổi `grader` sang tutor.
3. **Cho trước** chỉ có transcript nhưng không có audio evidence, **khi** chấm Speaking AI, **thì** hệ thống từ chối sinh Fluency/Pronunciation/Overall thay vì tạo điểm giả.
4. **Cho trước** nhà cung cấp trả Overall, **khi** hệ thống lưu kết quả, **thì** giá trị đó bị bỏ; Overall chỉ được tính từ đúng bốn criterion band đã hiệu chuẩn và đủ evidence.

---

### Câu chuyện người dùng 4 - Lỗi và thử lại an toàn (Ưu tiên: P2)

Là học viên, tôi muốn biết bài đang chờ, đang xử lý, đang tự thử lại hay đã thất bại để có hành động phù hợp mà không tạo lượt chấm trùng; trạng thái tutor chỉ áp dụng cho bài tôi chủ động chọn tutor.

**Kiểm thử độc lập**: Giả lập timeout, giới hạn tốc độ, lỗi tạm thời, file hỏng và worker dừng đột ngột; xác minh trạng thái, số lần thử, quyền retry và dữ liệu không bị nhân đôi.

**Kịch bản chấp nhận**:

1. **Cho trước** lỗi mạng hoặc lỗi tạm thời từ nhà cung cấp, **khi** còn ngân sách tự thử lại, **thì** hệ thống lên lịch thử lại và không trừ thêm lượt của học viên.
2. **Cho trước** công việc gốc đã dùng hết hai lần thử do lỗi nhà cung cấp có thể retry, **khi** học viên yêu cầu thử lại, **thì** hệ thống tạo tối đa một công việc con với một lần thử và giữ nguyên cấu hình chấm đã khóa.
3. **Cho trước** file hỏng, không có tiếng nói hoặc lỗi dữ liệu không thể retry, **khi** worker xác nhận lỗi, **thì** cả phiên chuyển `grading_failed`, không gọi chấm thừa và không cho manual retry sai chính sách.
4. **Cho trước** worker cũ quay lại sau khi mất lease, **khi** worker khác đã nhận lại công việc, **thì** output của worker cũ không thể ghi artifact, report hoặc trạng thái cuối.

---

### Câu chuyện người dùng 5 - Gia sư chấm bài được học viên chủ động gửi và dùng AI làm bản nháp (Ưu tiên: P2)

Là gia sư, tôi muốn claim nguyên tử phiên mà học viên chọn `grader=tutor`, có thể bấm AI chấm nháp đủ bốn tiêu chí, rồi tự nghe, chỉnh điểm và lưu kết quả cuối.

**Kiểm thử độc lập**: Cho nhiều gia sư claim cùng một phiên; xác minh chỉ một người thắng, cả ba Part có cùng assignment và chỉ người đó hoặc admin được đọc chi tiết, audio và ghi điểm.

**Kịch bản chấp nhận**:

1. **Cho trước** một phiên chưa gán đang chờ gia sư, **khi** nhiều gia sư claim đồng thời, **thì** đúng một người được gán cho cả ba Part.
2. **Cho trước** gia sư chưa được gán nhưng biết ID phiên, **khi** yêu cầu transcript, tham chiếu AI hoặc audio, **thì** hệ thống từ chối.
3. **Cho trước** gia sư được gán bấm AI chấm nháp, **khi** Gemini phân tích transcript và audio, **thì** form được điền gợi ý bốn tiêu chí nhưng submission vẫn `pending/tutor` cho tới khi tutor tự lưu kết quả.
4. **Cho trước** gia sư hoàn tất chấm, **khi** lưu báo cáo, **thì** học viên đọc kết quả gia sư qua luồng hiện có và bản nháp AI không thay thế quyết định của tutor.
5. **Cho trước** báo cáo gia sư bị thu hồi, **khi** thu hồi, **thì** báo cáo được soft-delete và lịch sử không bị xóa vật lý.

### Trường hợp biên

- Hai request nộp đồng thời khi học viên chỉ còn một lượt trong ngày.
- Khóa idempotency được phát lại sau khi cửa sổ replay đã hết hạn.
- Audio khai báo đúng MIME nhưng magic bytes, codec, duration hoặc checksum thật không khớp.
- Có đủ ba file nhưng một tiêu chí có uncertainty cao hoặc mẫu nằm ngoài calibration population.
- Transcript thiếu filler, repetition, false start hoặc tự sửa lỗi mà audio vẫn còn các tín hiệu đó.
- Worker mất lease sau khi provider đã trả về nhưng trước khi ghi kết quả.
- Registry cấu hình thay đổi giữa attempt đầu, attempt sau và manual retry.
- Signed URL hết hạn trong lúc người có quyền đang nghe audio.
- Một phiên legacy chỉ có public URL/transcript nhưng không có verified hash hoặc cấu hình chấm.

## Yêu cầu *(bắt buộc)*

### Yêu cầu chức năng

- **FR-001**: Mọi thao tác ghi dữ liệu PHẢI xác thực; danh tính và vai trò PHẢI lấy từ phiên đăng nhập, không lấy từ body/query.
- **FR-002**: Luồng Writing PHẢI giữ đúng bốn tiêu chí, ngưỡng từ 50/100, trọng số Task 1/Task 2 là 33%/67%, response nhất quán và không hồi quy.
- **FR-003**: Audio Speaking mới PHẢI nằm trong kho riêng tư; hệ thống chỉ cấp quyền upload/download có thời hạn và không lưu URL ký tạm vào database hoặc log.
- **FR-004**: Luồng Speaking AI PHẢI nhận đúng Part `{1,2,3}`, resolve đề chính thức từ hệ thống, tạo lịch sử mới và không tin `prompt_text`, owner hoặc object key do client tự khai báo.
- **FR-005**: Request nộp Speaking PHẢI tạo ba submission và một grading job trong một transaction, trả trạng thái chờ ngay và không gọi provider trong request đó.
- **FR-006**: Idempotency PHẢI bảo vệ cả request tuần tự và đồng thời; replay được giải quyết trước quota và một object upload chỉ được gắn vào một submission.
- **FR-007**: Worker PHẢI dùng lease có fencing generation; mọi heartbeat, artifact, report và final write phải bị từ chối nếu lease/generation không còn hiệu lực.
- **FR-008**: Audio PHẢI được xác minh bằng bytes thật về checksum, magic bytes, codec, kích thước, duration và khả năng decode trước mọi provider call.
- **FR-009**: Pipeline PHẢI lưu riêng output ASR trước hậu xử lý ứng dụng và transcript hiển thị; không có bước sửa ngữ pháp rồi dùng bản sửa làm evidence chấm.
- **FR-010**: Fluency & Coherence PHẢI dùng evidence thời gian/độ trôi chảy cùng nội dung transcript; Pronunciation PHẢI dùng evidence âm thanh. Transcript đơn thuần không được dùng để suy ra hai tiêu chí âm thanh này.
- **FR-011**: Kết quả Speaking AI thành công PHẢI có đủ bốn criterion band; thiếu evidence bắt buộc làm job thất bại, không công bố band một phần và không tự handoff tutor.
- **FR-012**: `full_audio` PHẢI có đủ bốn band và Overall; `partial_audio` PHẢI có Overall `null`; `transcript_only` PHẢI có cả bốn band và Overall `null`.
- **FR-013**: Overall Speaking PHẢI bỏ giá trị provider, tính trung bình bằng nhau của bốn band hợp lệ và làm tròn nửa band theo quy tắc half-up tại các tie `.25/.75`.
- **FR-014**: Học viên chỉ được nhận AI result khi job `completed` và phiên `ai_graded`; bài chọn AI không được tự chuyển thành bài tutor.
- **FR-015**: Lỗi tạm thời chỉ được retry theo ngân sách tối đa ba pipeline run cho một chain; lỗi dữ liệu không retry; không tạo failed report giả và không để submission kẹt `pending` vô thời hạn.
- **FR-016**: Chỉ request có `grader=tutor` mới vào hàng đợi tutor. AI failure giữ `grader=ai`, dùng trạng thái lỗi/retry hiện có và không tạo bảng assignment/review mới.
- **FR-017**: Tutor claim PHẢI khóa nguyên tử cả group; detail, tham chiếu, audio và grade PHẢI giới hạn theo `assigned_tutor_id`, ngoại trừ admin có scope và audit.
- **FR-018**: Mọi provider call PHẢI đi qua cổng AI grading chung, được mock trong test, pin provider/model/config và ghi metadata an toàn vào usage log mà không ghi audio/transcript/prompt thô.
- **FR-019**: Mọi API PHẢI dùng envelope `{ success, data, error, meta }`, lỗi máy ổn định và thông báo người dùng bằng tiếng Việt; không trả stack trace, object key, raw AI response hoặc reliability nội bộ.
- **FR-020**: Dữ liệu legacy chỉ được đọc fallback để hiển thị; không tạo synthetic job/artifact và không dùng transcript legacy để sinh band mới.
- **FR-021**: Writing và Speaking submission mới PHẢI dùng cùng luật quota 10 original submissions mỗi người mỗi ngày UTC; replay và retry hợp lệ không tính thêm.
- **FR-022**: Band Speaking công bố cho học viên PHẢI mang nhãn `AI Estimated Band` và disclaimer không phải điểm IELTS chính thức. Calibration bundle là phiên bản nâng độ tin cậy/audit; không phải điều kiện để tự động chuyển bài AI sang tutor.
- **FR-023**: Tutor AI prelim PHẢI là bản nháp không làm thay đổi `grader`, `status`, assignment hoặc báo cáo tutor cho tới khi tutor chủ động lưu.

### Thực thể chính

- **Bài nộp Speaking**: Ba Part thuộc một phiên, chứa tham chiếu đề chính thức và metadata object audio riêng tư.
- **Công việc chấm AI**: Trạng thái bất đồng bộ, khóa idempotency, cấu hình đã pin, lease, số lần thử và lỗi cuối của một lần chấm.
- **Artifact phân tích Speaking**: Evidence có phiên bản của một Part gồm ASR, timestamp, chất lượng audio, fluency metrics và pronunciation evidence đã whitelist.
- **Báo cáo AI**: Kết quả tổng hợp cấp phiên; chỉ là kết quả công bố hoặc tham chiếu reviewer, không dùng làm hàng đợi.
- **Báo cáo gia sư**: Kết quả human review hiện có, neo vào phiên Speaking qua Part đại diện và được soft-delete khi thu hồi.

## Tiêu chí thành công *(bắt buộc)*

### Kết quả đo lường được

- **SC-001**: 100% kết quả Speaking AI thành công trong bộ test có đủ bốn criterion band và Overall; không learner nào nhận partial/intermediate AI result.
- **SC-002**: 100% kết quả `full_audio` có transcript ASR, audio evidence cho Fluency/Pronunciation và Overall khớp phép tính half-up đã duyệt.
- **SC-003**: Với 20 request đồng thời cùng idempotency key/payload, hệ thống chỉ tạo 3 submission, 1 original job và tối đa 1 pipeline provider run tại một thời điểm.
- **SC-004**: Với ít nhất hai worker cùng chạy, một job chỉ có một lease hợp lệ và 100% write từ generation cũ bị từ chối sau khi lease được thu hồi.
- **SC-005**: 100% file sai magic bytes, checksum, codec, decode hoặc không có tiếng nói bị chặn trước rubric scoring.
- **SC-006**: 100% request audio/detail/grade từ tutor không được assign bị từ chối; khi 20 tutor claim đồng thời chỉ một tutor thắng cả group.
- **SC-007**: API enqueue không chờ provider và đạt p95 dưới 500 ms ở baseline 30 lượt/phút; pipeline mock đạt p95 dưới 5 phút với 10 job đồng thời trên staging.
- **SC-008**: Service/business logic mới đạt tối thiểu 80% coverage; mọi endpoint mới có happy path và ít nhất một error-path test, không gọi Internet/provider thật.
- **SC-009**: Các regression test Writing, history và tutor feedback liên quan vẫn đạt sau rollout Speaking async.
- **SC-010**: Khi provider/evidence thất bại, 100% phiên AI giữ `grader=ai`, đi theo retry/failed; 0% bị tự động đưa vào tutor queue.

## Giả định và phụ thuộc

- Yêu cầu bắt đầu implementation ngày 2026-07-22 được coi là phê duyệt hướng nghiệp vụ của đặc tả này; không được coi là tự động phê duyệt thay đổi Constitution.
- Cổng provider và storage được thiết kế qua adapter. Production phải tuân thủ provider/storage đã được Constitution hoặc RFC toàn đội cho phép; Gemini/Supabase hiện có chỉ được dùng ở môi trường được phê duyệt.
- Quy tắc Overall được chốt cho implementation là decimal round-half-up tại tie `.25/.75`.
- Cửa sổ replay idempotency và retention audio là cấu hình bắt buộc theo môi trường; nếu chưa có giá trị đã duyệt, feature flag công bố band giữ tắt và hệ thống fail-closed.
- Không có calibration bundle hợp lệ trong repository tại thời điểm cập nhật spec. Vì vậy kết quả hiện tại phải ghi rõ là AI estimate; không tự tạo reliability hoặc tuyên bố tương đương giám khảo chính thức.
- Browser chỉ được dùng định dạng audio nằm trong policy đã phê duyệt. WebM không được âm thầm đổi đuôi thành M4A.

## Ngoài phạm vi

- Tự huấn luyện ASR hoặc mô hình pronunciation.
- Realtime grading khi học viên đang nói.
- Tuyên bố điểm IELTS chính thức hoặc thay thế giám khảo.
- Xóa bảng/cột legacy trong cùng release.
- Tạo regrade bằng cấu hình mới cho cùng audio; đó là operation audit riêng.
- Công bố band khi chưa có gold set, approval và calibration bundle đạt gate.
