import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ExternalLink, X } from 'lucide-react';
import assistantApi from '../services/assistantApi';
import ChatInputBox from './ChatInputBox';
import ChatMessageList from './ChatMessageList';
import LoginRequiredPrompt from './LoginRequiredPrompt';

const createMessageId = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const toMessage = (row) => ({
  id: row.id || createMessageId(),
  messageId: row.id || null,
  role: row.role === 'user' ? 'user' : 'assistant',
  content: row.content || row.answer || '',
});

const GlobalAssistantPanel = ({ availability, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [suggestedLinks, setSuggestedLinks] = useState([]);
  const [requiresLogin, setRequiresLogin] = useState(false);

  const context = useMemo(() => ({
    pageType: availability.pageType,
    attemptId: availability.attemptId,
    questionId: availability.questionId,
  }), [availability.attemptId, availability.pageType, availability.questionId]);

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      if (!availability.isAuthenticated || historyLoaded) return;
      const response = await assistantApi.getHistory();

      if (!isMounted) return;
      if (response.code === 'LOGIN_REQUIRED') {
        setRequiresLogin(true);
        return;
      }
      if (Array.isArray(response.history)) {
        setMessages(response.history.map(toMessage).filter((item) => item.content));
      }
      setHistoryLoaded(true);
    };

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [availability.isAuthenticated, historyLoaded]);

  const handleSendError = (response) => {
    setIsLoading(false);

    if (response.code === 'LOGIN_REQUIRED') {
      setRequiresLogin(true);
      return true;
    }

    if (response.code) {
      setError(response.message || 'Trợ lý IELTS đang gặp lỗi.');
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: 'assistant',
          content: response.message || 'Trợ lý IELTS đang gặp lỗi.',
        },
      ]);
      return true;
    }

    return false;
  };

  const handleSend = async (message) => {
    if (!availability.isAuthenticated) {
      setRequiresLogin(true);
      return;
    }

    const assistantLocalId = createMessageId();
    let receivedDelta = false;

    setMessages((current) => [
      ...current,
      {
        id: createMessageId(),
        role: 'user',
        content: message,
      },
    ]);
    setIsLoading(true);
    setError(null);
    setSuggestedLinks([]);

    const streamed = await assistantApi.streamChat({
      message,
      context,
      onStart: () => {
        setMessages((current) => [
          ...current,
          {
            id: assistantLocalId,
            role: 'assistant',
            content: '',
            isStreaming: true,
          },
        ]);
      },
      onDelta: (delta) => {
        receivedDelta = true;
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantLocalId
              ? { ...item, content: `${item.content}${delta}` }
              : item
          )
        );
      },
      onDone: (response) => {
        setIsLoading(false);
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantLocalId
              ? {
                  ...item,
                  content: response.answer || item.content,
                  messageId: response.messageId || item.messageId,
                  isStreaming: false,
                }
              : item
          )
        );
        setSuggestedLinks(response.suggestedLinks || []);
      },
      onError: (response) => {
        handleSendError(response);
      },
    });

    if (streamed?.code && !receivedDelta) {
      const fallback = await assistantApi.sendChat({ message, context });
      if (handleSendError(fallback)) return;

      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          messageId: fallback.messageId || null,
          role: 'assistant',
          content: fallback.answer || '',
        },
      ]);
      setSuggestedLinks(fallback.suggestedLinks || []);
    }

    setIsLoading(false);
  };

  const handleRate = async (messageId, rating) => {
    setMessages((current) =>
      current.map((item) =>
        item.messageId === messageId ? { ...item, rating, ratingPending: true } : item
      )
    );

    const response = await assistantApi.rateMessage({ messageId, rating });

    if (response.code) {
      setError(response.message || 'Không thể lưu đánh giá lúc này.');
      setMessages((current) =>
        current.map((item) =>
          item.messageId === messageId ? { ...item, rating: null, ratingPending: false } : item
        )
      );
      return;
    }

    setMessages((current) =>
      current.map((item) =>
        item.messageId === messageId ? { ...item, rating, ratingPending: false } : item
      )
    );
  };

  const showLoginPrompt = requiresLogin || availability.isGuest;
  const hasStreamingMessage = messages.some((item) => item.isStreaming);

  return (
    <section className="assistant-panel" aria-label="Trợ lý IELTS">
      <header className="assistant-panel__header">
        <div>
          <span>IELTS Assistant</span>
          <strong>Global support</strong>
        </div>
        <button type="button" onClick={onClose} aria-label="Đóng trợ lý" title="Đóng">
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      {showLoginPrompt ? (
        <LoginRequiredPrompt />
      ) : (
        <>
          {error && (
            <div className="assistant-error" role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <ChatMessageList
            messages={messages}
            isLoading={isLoading && !hasStreamingMessage}
            onRate={handleRate}
          />

          {suggestedLinks.length > 0 && (
            <div className="assistant-links" aria-label="Gợi ý liên kết">
              {suggestedLinks.map((link) => (
                <a key={`${link.href}-${link.label}`} href={link.href}>
                  <span>{link.label}</span>
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              ))}
            </div>
          )}

          <ChatInputBox
            disabled={!availability.isAuthenticated || availability.isDisabled}
            isLoading={isLoading}
            onSend={handleSend}
          />
        </>
      )}
    </section>
  );
};

export default GlobalAssistantPanel;
