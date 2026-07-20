import { useCallback, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import useAssistantAvailability from '../hooks/useAssistantAvailability';
import AssistantDisabledNotice from './AssistantDisabledNotice';
import GlobalAssistantPanel from './GlobalAssistantPanel';
import '../globalAssistant.css';

const GlobalAssistantButton = () => {
  const availability = useAssistantAvailability();
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [conversationState, setConversationState] = useState({ ownerId: null, id: null });
  const ownerId = availability.user?.id || null;
  const conversationId = conversationState.ownerId === ownerId ? conversationState.id : null;
  const handleConversationIdChange = useCallback((id) => {
    setConversationState({ ownerId, id });
  }, [ownerId]);
  const handleToggle = () => {
    if (!isOpen) setHasOpened(true);
    setIsOpen((value) => !value);
  };

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
