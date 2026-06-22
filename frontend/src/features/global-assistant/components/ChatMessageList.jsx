import { BookOpen, Loader2 } from 'lucide-react';
import ChatMessageItem from './ChatMessageItem';

const ChatMessageList = ({ messages, isLoading, onRate }) => {
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="assistant-empty-state">
        <BookOpen size={26} aria-hidden="true" />
        <h2>Trợ lý IELTS sẵn sàng</h2>
        <p>Hỏi về đề luyện thi, lesson, skill, topic, level, study tips hoặc giải thích đáp án sau khi nộp bài.</p>
      </div>
    );
  }

  return (
    <div className="assistant-message-list" aria-live="polite">
      {messages.map((message) => (
        <ChatMessageItem key={message.id} message={message} onRate={onRate} />
      ))}
      {isLoading && (
        <div className="assistant-message assistant-message--assistant">
          <div className="assistant-message__bubble assistant-message__bubble--loading">
            <Loader2 size={16} aria-hidden="true" />
            <span>Đang xử lý...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessageList;
