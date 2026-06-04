import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * Component for the AI Chatbot Window.
 */
const AiChatbotWindow = ({
  sessionId,
  history,
  onStartSession,
  onSendMessage,
  onEndSession,
  isLoading,
  error
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when history changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading || isEnded) return;

    // EARS[Event]: WHEN user submits a message, THEN trigger onSendMessage callback
    onSendMessage(inputText.trim());
    setInputText('');
  };

  // Determine error states
  const errorStatus = error?.status || null;
  const isEnded = errorStatus === 409;
  const isBudgetLimit = errorStatus === 429;

  const isInputDisabled = isLoading || isEnded || isBudgetLimit;

  // EARS[State]: WHEN user has no active session, THEN show "Start Session" screen
  if (!sessionId) {
    return (
      <div className="card shadow-sm border-primary" style={{ height: '400px' }} data-testid="ai-chatbot-window-empty">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0"><i className="bi bi-robot me-2"></i>AI Tutor Chat</h5>
        </div>
        <div className="card-body d-flex flex-column align-items-center justify-content-center text-center">
          <i className="bi bi-chat-dots text-primary mb-3" style={{ fontSize: '3rem' }}></i>
          <h6 className="mb-3 text-secondary">Need help understanding this?</h6>
          <button
            className="btn btn-primary"
            onClick={onStartSession}
            disabled={isLoading}
            data-testid="start-session-button"
          >
            {isLoading ? (
              <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Starting...</>
            ) : (
              'Start Chat Session'
            )}
          </button>
          {errorStatus === 429 && (
            <div className="alert alert-danger mt-3" role="alert" data-testid="budget-error-start">
              You have exceeded your AI usage budget.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm border-primary" style={{ height: '500px' }} data-testid="ai-chatbot-window-active">
      <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0"><i className="bi bi-robot me-2"></i>AI Tutor Chat</h5>
        <button
          className="btn btn-outline-light btn-sm"
          onClick={onEndSession}
          disabled={isEnded || isLoading}
          data-testid="end-session-button"
        >
          End Session
        </button>
      </div>

      <div className="card-body overflow-auto d-flex flex-column bg-light" data-testid="chat-history">
        {history && history.length > 0 ? (
          history.map((msg, idx) => (
            <div
              key={idx}
              className={`d-flex mb-3 ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
            >
              <div
                className={`p-3 rounded-3 shadow-sm ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-white border'}`}
                style={{ maxWidth: '80%' }}
              >
                <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-muted my-auto italic">
            <p>Session started. Send a message to begin.</p>
          </div>
        )}
        {isLoading && (
          <div className="d-flex justify-content-start mb-3" data-testid="chat-loading-indicator">
            <div className="p-3 rounded-3 bg-white border text-muted">
              <span className="spinner-grow spinner-grow-sm me-1" role="status" aria-hidden="true"></span>
              <span className="spinner-grow spinner-grow-sm me-1" role="status" aria-hidden="true"></span>
              <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="card-footer bg-white">
        {/* EARS[State]: WHEN server returns 409, THEN show "Session has ended" warning */}
        {isEnded && (
          <div className="alert alert-warning py-2 px-3 mb-2 small" role="alert" data-testid="session-ended-alert">
            <i className="bi bi-exclamation-triangle-fill me-1"></i>
            This session has been ended.
          </div>
        )}

        {/* EARS[State]: WHEN server returns 429, THEN show "Budget limit reached" warning */}
        {isBudgetLimit && (
          <div className="alert alert-danger py-2 px-3 mb-2 small" role="alert" data-testid="budget-limit-alert">
            <i className="bi bi-exclamation-triangle-fill me-1"></i>
            You have exceeded your AI usage budget.
          </div>
        )}

        <form onSubmit={handleSend} className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder="Type your message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isInputDisabled}
            data-testid="chat-input"
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isInputDisabled || !inputText.trim()}
            data-testid="chat-send-button"
          >
            <i className="bi bi-send-fill"></i>
          </button>
        </form>
      </div>
    </div>
  );
};

AiChatbotWindow.propTypes = {
  sessionId: PropTypes.string,
  history: PropTypes.arrayOf(PropTypes.shape({
    role: PropTypes.oneOf(['user', 'assistant']).isRequired,
    content: PropTypes.string.isRequired
  })),
  onStartSession: PropTypes.func.isRequired,
  onSendMessage: PropTypes.func.isRequired,
  onEndSession: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  error: PropTypes.shape({
    status: PropTypes.number,
    message: PropTypes.string
  })
};

AiChatbotWindow.defaultProps = {
  sessionId: null,
  history: [],
  isLoading: false,
  error: null
};

export default AiChatbotWindow;
