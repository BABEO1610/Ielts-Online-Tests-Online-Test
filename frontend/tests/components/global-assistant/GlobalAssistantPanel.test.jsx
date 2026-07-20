import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GlobalAssistantPanel from '../../../src/features/global-assistant/components/GlobalAssistantPanel';

const assistantApiMock = vi.hoisted(() => ({
  getHistory: vi.fn(),
  streamChat: vi.fn(),
  sendChat: vi.fn(),
  rateMessage: vi.fn(),
}));

vi.mock('../../../src/features/global-assistant/services/assistantApi', () => ({
  default: assistantApiMock,
}));

const availability = {
  isAuthenticated: true,
  isDisabled: false,
  isGuest: false,
  pageType: 'home',
  route: '/',
  attemptId: null,
  questionId: null,
};

const renderPanel = () => render(
  <GlobalAssistantPanel
    availability={availability}
    conversationId={null}
    onConversationIdChange={vi.fn()}
    onClose={vi.fn()}
  />
);

describe('GlobalAssistantPanel memory continuity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assistantApiMock.sendChat.mockResolvedValue({ answer: 'unused' });
  });

  it('keeps input disabled until the canonical conversation history is loaded', async () => {
    let resolveHistory;
    assistantApiMock.getHistory.mockReturnValue(new Promise((resolve) => {
      resolveHistory = resolve;
    }));

    renderPanel();
    expect(screen.getByPlaceholderText('Hỏi trợ lý IELTS...')).toBeDisabled();

    await act(async () => {
      resolveHistory({
        conversationId: '7df412d8-291e-4bf3-901e-ea927ecc1a29',
        history: [],
      });
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Hỏi trợ lý IELTS...')).toBeEnabled();
    });
  });

  it('does not resubmit through JSON after an ambiguous stream failure', async () => {
    assistantApiMock.getHistory.mockResolvedValue({ history: [], conversationId: null });
    assistantApiMock.streamChat.mockImplementation(async ({ onStart, onError }) => {
      onStart?.({ conversationId: 'session-1' });
      const error = { code: 'INTERNAL_ERROR', message: 'Kết nối bị gián đoạn.' };
      onError?.(error);
      return error;
    });

    renderPanel();
    const input = await screen.findByPlaceholderText('Hỏi trợ lý IELTS...');
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.change(input, { target: { value: 'kết hợp hai cái này' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }));

    await waitFor(() => expect(assistantApiMock.streamChat).toHaveBeenCalledTimes(1));
    expect(assistantApiMock.sendChat).not.toHaveBeenCalled();
    expect(screen.getByText('kết hợp hai cái này')).toBeInTheDocument();
    expect(document.querySelectorAll('.assistant-message--assistant')).toHaveLength(1);
    expect(screen.getAllByText('Kết nối bị gián đoạn.')).toHaveLength(2);
  });
});
