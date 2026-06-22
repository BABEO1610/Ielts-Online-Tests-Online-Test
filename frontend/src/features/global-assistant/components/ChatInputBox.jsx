import { useState } from 'react';
import { Send } from 'lucide-react';

const ChatInputBox = ({ disabled, isLoading, onSend }) => {
  const [value, setValue] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const message = value.trim();
    if (!message || disabled || isLoading) return;

    onSend(message);
    setValue('');
  };

  return (
    <form className="assistant-input" onSubmit={handleSubmit}>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Hỏi trợ lý IELTS..."
        disabled={disabled || isLoading}
        rows={2}
      />
      <button
        type="submit"
        disabled={disabled || isLoading || !value.trim()}
        aria-label="Gửi câu hỏi"
        title="Gửi"
      >
        <Send size={18} aria-hidden="true" />
      </button>
    </form>
  );
};

export default ChatInputBox;
