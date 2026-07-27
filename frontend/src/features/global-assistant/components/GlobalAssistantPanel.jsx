import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ExternalLink, X } from 'lucide-react';
import assistantApi from '../services/assistantApi';
import ChatInputBox from './ChatInputBox';
import ChatMessageList from './ChatMessageList';
import LoginRequiredPrompt from './LoginRequiredPrompt';
// hàm phụ trợ tạo ra id ngẫu nhiêm cho mỗi tin nhắn ( dùng làm key khi gender tin nhắn)
const createMessageId = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};
// hàm chuẩn hóa dữ liệu khi backend trả về lịch sử chat
const toMessage = (row) => ({
  id: row.id || createMessageId(),
  messageId: row.id || null,
  role: row.role === 'user' ? 'user' : 'assistant',
  content: row.content || row.answer || '',
});
// hàm này cực hay nó đóng vai trò đọc trộm giao diện người dùng đang xem để gom ngữ cảnh( context0 gửi cho ai 
// bằng cách nó dùng document.quenrySeclectorAll để quét màn hình các thẻ có tiêu đề như h3, h4 xem có đề thi nào đang hiển thị không
// sau đó nó gom tối đa 20 tên đưa vào mảng và gửi lên sever và tư vấn cho đúng 
const collectVisibleItems = () => {
  const selectors = [
    '[data-testid="library-page"] h3',
    '[data-testid="library-page"] h4',
    '.card h3',
    '.card h4',
    'main h3',
    'main h4',
  ];
  return [...document.querySelectorAll(selectors.join(','))]
    .map((node) => node.textContent?.trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((title) => ({ title }));
};
// dùng để vẽ ra toàn bộ khung chat messaes , is loading, error, sugestedlink, linkmeta
const GlobalAssistantPanel = ({
  availability,
  conversationId,
  onConversationIdChange,
  onClose,
}) => {
  // Khởi tạo các State lưu trữ trạng thái của khung chat
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyReloadToken, setHistoryReloadToken] = useState(0);
  const [error, setError] = useState(null);
  const [suggestedLinks, setSuggestedLinks] = useState([]);
  const [linkMeta, setLinkMeta] = useState(null);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const messageListRef = useRef(null);

  const context = useMemo(() => ({
    pageType: availability.pageType,
    attemptId: availability.attemptId,
    questionId: availability.questionId,
    route: availability.route,
  }), [availability.attemptId, availability.pageType, availability.questionId, availability.route]);
  const showLoginPrompt = requiresLogin || availability.isGuest;
  // tự động gọi api khi khung chat được mở lên
  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      if (!availability.isAuthenticated || historyLoaded) return;
      const response = await assistantApi.getHistory({ conversationId });

      if (!isMounted) return;
      if (response.code === 'LOGIN_REQUIRED') {
        setRequiresLogin(true);
        return;
      }
      if (response.code) {
        setError(response.message || 'Không thể tải lịch sử hội thoại lúc này.');
        return;
      }
      if (Array.isArray(response.history)) {
        setMessages(response.history.map(toMessage).filter((item) => item.content));
      }
      if (response.conversationId) onConversationIdChange(response.conversationId);
      setError(null);
      setHistoryLoaded(true);
    };

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [
    availability.isAuthenticated,
    conversationId,
    historyLoaded,
    historyReloadToken,
    onConversationIdChange,
  ]);
  // luôn tự động cuộn xuống dưới cùng mỗi lần có tin nhắn xuất hiện
  useEffect(() => {
    if (showLoginPrompt) return undefined;
    const frameId = window.requestAnimationFrame(() => {
      const list = messageListRef.current;
      if (list) list.scrollTop = list.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [historyLoaded, isLoading, messages, showLoginPrompt, suggestedLinks.length]);
  // Xử lý khi gửi tin nhắn bị lỗi (vd: lỗi mạng, hết quota)
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

  // Xử lý sự kiện khi user bấm gửi tin nhắn
  const handleSend = async (message) => {
    if (!availability.isAuthenticated) {
      setRequiresLogin(true);
      return;
    }
    if (!historyLoaded || availability.isDisabled || isLoading) return;

    const assistantLocalId = createMessageId();

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
    setLinkMeta(null);
    const requestContext = { ...context, visibleItems: collectVisibleItems() };

    const streamed = await assistantApi.streamChat({
      message,
      context: requestContext,
      conversationId,
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
        setLinkMeta(response.linkMeta || null);
        if (response.conversationId) onConversationIdChange(response.conversationId);
      },
      onError: (response) => {
        setMessages((current) => current.filter((item) => item.id !== assistantLocalId));
        handleSendError(response);
      },
    });

    if (streamed?.code) setError(streamed.message || 'Trợ lý IELTS đang gặp lỗi.');
    setIsLoading(false);
  };

  // Xử lý sự kiện đánh giá Like/Dislike tin nhắn của trợ lý
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
              {!historyLoaded && availability.isAuthenticated && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setHistoryReloadToken((value) => value + 1);
                  }}
                >
                  Thử tải lại
                </button>
              )}
            </div>
          )}

          <ChatMessageList
            messages={messages}
            isLoading={isLoading && !hasStreamingMessage}
            onRate={handleRate}
            listRef={messageListRef}
          />

          {suggestedLinks.length > 0 && (
            <div className="assistant-links" aria-label="Gợi ý liên kết">
              {suggestedLinks.map((link) => (
                <a key={`${link.href || link.url}-${link.label}`} href={link.href || link.url}>
                  <span>{link.label}</span>
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              ))}
              {linkMeta?.hasMore && (
                <a className="assistant-links__more" href={linkMeta.allUrl || suggestedLinks[0]?.href || suggestedLinks[0]?.url || '#'}>
                  <span>Xem tất cả {linkMeta.totalMatched} kết quả</span>
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              )}
            </div>
          )}

          <ChatInputBox
            disabled={!availability.isAuthenticated || availability.isDisabled || !historyLoaded}
            isLoading={isLoading}
            onSend={handleSend}
          />
        </>
      )}
    </section>
  );
};

export default GlobalAssistantPanel;
