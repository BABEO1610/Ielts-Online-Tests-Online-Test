/**
 * Traceability Matrix:
 * - T045: Chat window trong workspace. Start session, send message, end session, hiển thị lịch sử, xử lý 409 ended session, 429 budget.
 * - SPEC FR-12 to FR-16: Chatbot operations and constraints.
 * - SPEC STU-11: Chatbot UI integration.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AiChatbotWindow from '../../../../src/components/ai/AiChatbotWindow';

describe('AiChatbotWindow Component', () => {
  const mockStart = vi.fn();
  const mockSend = vi.fn();
  const mockEnd = vi.fn();

  // Mock scrollIntoView to avoid errors in JSDOM
  window.HTMLElement.prototype.scrollIntoView = vi.fn();

  it('should render "Start Session" screen when sessionId is null', () => {
    render(<AiChatbotWindow onStartSession={mockStart} onSendMessage={mockSend} onEndSession={mockEnd} />);

    expect(screen.getByTestId('ai-chatbot-window-empty')).toBeInTheDocument();
    expect(screen.getByTestId('start-session-button')).toBeInTheDocument();
    expect(screen.queryByTestId('chat-input')).not.toBeInTheDocument();
  });

  it('should call onStartSession when start button is clicked', () => {
    render(<AiChatbotWindow onStartSession={mockStart} onSendMessage={mockSend} onEndSession={mockEnd} />);

    fireEvent.click(screen.getByTestId('start-session-button'));
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('should render active chat window when sessionId exists', () => {
    render(<AiChatbotWindow sessionId="123" onStartSession={mockStart} onSendMessage={mockSend} onEndSession={mockEnd} />);

    expect(screen.getByTestId('ai-chatbot-window-active')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    expect(screen.getByTestId('end-session-button')).toBeInTheDocument();
  });

  it('should render chat history', () => {
    const history = [
      { role: 'user', content: 'Hello AI' },
      { role: 'assistant', content: 'Hello Human' }
    ];
    render(<AiChatbotWindow sessionId="123" history={history} onStartSession={mockStart} onSendMessage={mockSend} onEndSession={mockEnd} />);

    expect(screen.getByText('Hello AI')).toBeInTheDocument();
    expect(screen.getByText('Hello Human')).toBeInTheDocument();
  });

  it('should call onSendMessage when a message is submitted', () => {
    const freshMockSend = vi.fn();
    render(<AiChatbotWindow sessionId="123" onStartSession={mockStart} onSendMessage={freshMockSend} onEndSession={mockEnd} />);

    const input = screen.getByTestId('chat-input');
    const sendBtn = screen.getByTestId('chat-send-button');

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendBtn);

    expect(freshMockSend).toHaveBeenCalledWith('Test message');
  });

  it('should NOT call onSendMessage if input is empty', () => {
    const freshMockSend = vi.fn();
    render(<AiChatbotWindow sessionId="123" onStartSession={mockStart} onSendMessage={freshMockSend} onEndSession={mockEnd} />);

    const sendBtn = screen.getByTestId('chat-send-button');
    fireEvent.click(sendBtn);

    expect(freshMockSend).not.toHaveBeenCalled();
  });

  it('should render loading indicator and disable input when isLoading is true', () => {
    render(<AiChatbotWindow sessionId="123" isLoading={true} onStartSession={mockStart} onSendMessage={mockSend} onEndSession={mockEnd} />);

    expect(screen.getByTestId('chat-loading-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeDisabled();
    expect(screen.getByTestId('chat-send-button')).toBeDisabled();
  });

  it('should render 409 session ended warning and disable input', () => {
    render(<AiChatbotWindow sessionId="123" error={{ status: 409 }} onStartSession={mockStart} onSendMessage={mockSend} onEndSession={mockEnd} />);

    expect(screen.getByTestId('session-ended-alert')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeDisabled();
    expect(screen.getByTestId('end-session-button')).toBeDisabled();
  });

  it('should render 429 budget limit warning and disable input', () => {
    render(<AiChatbotWindow sessionId="123" error={{ status: 429 }} onStartSession={mockStart} onSendMessage={mockSend} onEndSession={mockEnd} />);

    expect(screen.getByTestId('budget-limit-alert')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeDisabled();
  });

  it('should call onEndSession when end button is clicked', () => {
    const mockEndSession = vi.fn();
    render(<AiChatbotWindow sessionId="123" onStartSession={mockStart} onSendMessage={mockSend} onEndSession={mockEndSession} />);

    fireEvent.click(screen.getByTestId('end-session-button'));
    expect(mockEndSession).toHaveBeenCalledTimes(1);
  });
});
