# CONTEXT.md — feat-ai-assistance
Người viết: Nguyễn Duy Mạnh | Ngày: 21/05/2026


## **1. PROBLEM STATEMENT (Nỗi đau của User)**
Nỗi đau: Người học IELTS thường gặp khó khăn khi:

Không hiểu lời giải thích của Tutor trong Reading/Listening.
Không biết vì sao đáp án đúng hoặc sai.
Cần phản hồi nhanh trong lúc tự học nhưng Tutor không luôn online.
Thiếu người hỗ trợ khi luyện Writing/Speaking tại nhà.

Giải pháp:
Hệ thống AI Assistance sẽ hỗ trợ Student bằng:

Nút "Explain with AI" để giải thích lại phần giải thích của Tutor theo cách dễ hiểu hơn.
AI Chatbot hỗ trợ trả lời nhanh các câu hỏi học thuật IELTS trong workspace của Student.

Feature này hỗ trợ quá trình học tập nhưng không thay thế Tutor.

## **2. DOMAIN KNOWLEDGE (Kiến thức nghiệp vụ)**
Thuật ngữ: 

IELTS Band Score
Tutor Explanation
AI Explanation
Speaking Transcript
Grammar Feedback
Vocabulary Suggestion
Prompt
Streaming Response

Quy tắc nghiệp vụ:

AI phải giữ vai trò như một IELTS Assistant/Tutor.
AI chỉ giải thích, hướng dẫn và đưa gợi ý học tập.
AI không được làm bài thi hộ Student.
AI phải bám sát nội dung của:
câu hỏi
đáp án đúng
lời giải của Tutor
AI phải sử dụng cách giải thích đơn giản, dễ hiểu cho người học IELTS.


## **3. STAKEHOLDERS (Ai liên quan?)**
Student:
Sử dụng Explain with AI để hiểu lời giải.
Sử dụng AI Chatbot để hỏi nhanh các câu hỏi IELTS.
Tutor:
Cung cấp explanation gốc cho hệ thống.
Theo dõi quá trình học tập của Student thông qua feedback và grading.
Admin:
Theo dõi AI usage và hiệu suất hệ thống.
Quản lý giới hạn sử dụng AI API.
AI System:
Xử lý prompt.
Trả về explanation hoặc chatbot response.

## **4. CONSTRAINTS (Ràng buộc cứng)**
Kỹ thuật:

Hệ thống sử dụng OpenAI API.
AI response phải hỗ trợ streaming realtime.
Hệ thống phải giới hạn request timeout để tránh treo UI.
Chatbot response cần phản hồi nhanh để đảm bảo trải nghiệm người dùng.
AI explanation phải được generate dựa trên:
question content
correct answer
tutor explanation

Bảo mật:
Không gửi password hoặc thông tin nhạy cảm lên AI API.
Chỉ gửi dữ liệu cần thiết cho AI processing.


## **5. ASSUMPTIONS (Giả định cần confirm)**
Giả định rằng Student phải đăng nhập mới được sử dụng AI Assistance.

Giả định rằng mỗi câu hỏi Reading/Listening đã có Tutor explanation trước khi AI giải thích.

Giả định rằng hệ thống sẽ lưu basic chatbot history trong session hiện tại.

Giả định rằng AI Chatbot chỉ hỗ trợ các câu hỏi liên quan đến IELTS learning.

## 6. OPEN QUESTIONS 

**Câu hỏi 1: Có cần giới hạn số lượt sử dụng "Explain with AI" mỗi ngày cho mỗi Student không?**


**Câu hỏi 2: Hệ thống có lưu toàn bộ chatbot history hay chỉ lưu trong phiên hiện tại?**


**Câu hỏi 3: Nếu AI trả lời sai hoặc không liên quan, Student có cần nút report feedback không?**