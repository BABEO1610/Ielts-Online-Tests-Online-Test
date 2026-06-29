import { useState } from 'react';
import { Send } from 'lucide-react';

const ChatInputBox = ({ disabled, isLoading, onSend }) => {
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBusy = disabled || isLoading || isSubmitting;

  const sendCurrentMessage = async () => {
    const message = value.trim();
    if (!message || isBusy) return;

    setValue('');
    setIsSubmitting(true);
    try {
      await onSend(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendCurrentMessage();
  };

  const handleKeyDown = (event) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent?.isComposing &&
      !event.isComposing
    ) {
      event.preventDefault();
      sendCurrentMessage();
    }
  };

  return (
    <form className="assistant-input" onSubmit={handleSubmit}>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Hỏi trợ lý IELTS..."
        disabled={isBusy}
        rows={2}
      />
      <button
        type="submit"
        disabled={isBusy || !value.trim()}
        aria-label="Gửi câu hỏi"
        title="Gửi"
      >
        <Send size={18} aria-hidden="true" />
      </button>
    </form>
  );
};

export default ChatInputBox;
