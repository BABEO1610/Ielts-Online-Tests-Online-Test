import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import useAssistantAvailability from '../hooks/useAssistantAvailability';
import AssistantDisabledNotice from './AssistantDisabledNotice';
import GlobalAssistantPanel from './GlobalAssistantPanel';
import '../globalAssistant.css';

const GlobalAssistantButton = () => {
  const availability = useAssistantAvailability();
  const [isOpen, setIsOpen] = useState(false);

  if (!availability.isVisible) {
    return null;
  }

  return (
    <div className="assistant-root">
      {availability.isDisabled && availability.disabledReason ? (
        <AssistantDisabledNotice />
      ) : null}

      {isOpen && (
        <GlobalAssistantPanel
          availability={availability}
          onClose={() => setIsOpen(false)}
        />
      )}

      <button
        type="button"
        className="assistant-fab"
        onClick={() => setIsOpen((value) => !value)}
        aria-label="Mở trợ lý IELTS"
        title="Trợ lý IELTS"
      >
        <MessageCircle size={24} aria-hidden="true" />
      </button>
    </div>
  );
};

export default GlobalAssistantButton;
