import { BookOpen, Bot } from 'lucide-react';
import ChatMessageItem from './ChatMessageItem';

const ChatMessageList = ({ messages, isLoading, onRate, listRef }) => {
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
    <div className="assistant-message-list" aria-live="polite" ref={listRef}>
      {messages.map((message) => (
        <ChatMessageItem key={message.id} message={message} onRate={onRate} />
      ))}
      {isLoading && (
        <div className="assistant-message assistant-message--assistant">
          <div className="assistant-message__avatar" aria-hidden="true">
            <Bot size={18} />
          </div>
          <div className="assistant-message__bubble assistant-message__bubble--loading">
            <div className="assistant-loading-dots" aria-label="Đang trả lời...">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessageList;
