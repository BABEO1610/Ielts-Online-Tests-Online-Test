import { useCallback, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import useAssistantAvailability from '../hooks/useAssistantAvailability';
import AssistantDisabledNotice from './AssistantDisabledNotice';
import GlobalAssistantPanel from './GlobalAssistantPanel';
import '../globalAssistant.css';

const GlobalAssistantButton = () => {
  const availability = useAssistantAvailability(); // kiểm tra xem được hiển thị không
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false); // mẹo lúc load trang web để false tăng tốc độ tải khi user bấm vào thành true mới render lại 
  const [conversationState, setConversationState] = useState({ ownerId: null, id: null });  // lưu trữ thông tin id của người dùng sở hữu đoạn chat tránh user B dùng season của userA
  const ownerId = availability.user?.id || null;
  const conversationId = conversationState.ownerId === ownerId ? conversationState.id : null;
  // cập nhật lại id của cuộc hội thoại dùng usecallback để đảm bảo hàm lại không bị tạo lại khi mỗi lần component reder
  const handleConversationIdChange = useCallback((id) => {
    setConversationState({ ownerId, id });
  }, [ownerId]);
  // hàm này chạy khi người dùng click vào nút tròn của trợ lý nó sẽ đánh dẫu là đã từng mở
  const handleToggle = () => {
    if (!isOpen) setHasOpened(true);
    setIsOpen((value) => !value);
  };
  // ở mấy bài thi cấm chatbot thì gọi hàm này 
  if (!availability.isVisible) {
    return null;
  }

  return (
    <div className="assistant-root">
      {availability.isDisabled && availability.disabledReason ? (
        <AssistantDisabledNotice />
      ) : null}

      {hasOpened && (
        <div className="assistant-panel-host" hidden={!isOpen}>
          <GlobalAssistantPanel
            key={ownerId || 'guest'}
            availability={availability}
            conversationId={conversationId}
            onConversationIdChange={handleConversationIdChange}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}

      <button
        type="button"
        className="assistant-fab"
        onClick={handleToggle}
        aria-label="Mở trợ lý IELTS"
        title="Trợ lý IELTS"
      >
        <MessageCircle size={24} aria-hidden="true" />
      </button>
    </div>
  );
};

export default GlobalAssistantButton;
