import { ThumbsDown, ThumbsUp, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const AssistantMarkdown = ({ content }) => (
  <div className="assistant-message__markdown">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>
      {content || ''}
    </ReactMarkdown>
  </div>
);

const ChatMessageItem = ({ message, onRate }) => {
  const role = message.role === 'user' ? 'user' : 'assistant';
  const canRate = role === 'assistant' && message.messageId && !message.isStreaming;
  const content = role === 'assistant'
    ? <AssistantMarkdown content={message.content} />
    : message.content;

  return (
    <div className={`assistant-message assistant-message--${role}`}>
      {role === 'assistant' && (
        <div className="assistant-message__avatar" aria-hidden="true">
          <Bot size={18} />
        </div>
      )}
      <div className="assistant-message__bubble">
        {content}
        {canRate && (
          <div className="assistant-message__rating" aria-label="Đánh giá câu trả lời">
            <button
              type="button"
              className={message.rating === 'up' ? 'is-selected' : ''}
              onClick={() => onRate?.(message.messageId, 'up')}
              disabled={Boolean(message.rating)}
              title="Hữu ích"
              aria-label="Câu trả lời hữu ích"
            >
              <ThumbsUp size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={message.rating === 'down' ? 'is-selected' : ''}
              onClick={() => onRate?.(message.messageId, 'down')}
              disabled={Boolean(message.rating)}
              title="Không hữu ích"
              aria-label="Câu trả lời không hữu ích"
            >
              <ThumbsDown size={14} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessageItem;
