import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GlobalAssistantButton from '../../../src/features/global-assistant/components/GlobalAssistantButton';

const assistantAvailability = vi.hoisted(() => ({ current: null }));

vi.mock('../../../src/features/global-assistant/hooks/useAssistantAvailability', () => ({
  default: () => assistantAvailability.current,
}));

vi.mock('../../../src/features/global-assistant/components/GlobalAssistantPanel', async () => {
  const { useState } = await vi.importActual('react');
  const PanelStub = ({ availability, conversationId, onConversationIdChange, onClose }) => {
    const [mountedForOwner] = useState(availability.user?.id || 'guest');
    return (
      <div data-testid="assistant-panel-stub">
        <span data-testid="panel-owner">{mountedForOwner}</span>
        <span data-testid="conversation-id">{conversationId || 'none'}</span>
        <button type="button" onClick={() => onConversationIdChange('7df412d8-291e-4bf3-901e-ea927ecc1a29')}>
          set conversation
        </button>
        <button type="button" onClick={onClose}>close panel</button>
      </div>
    );
  };
  return { default: PanelStub };
});

const createAvailability = (userId = 'user-1') => ({
    isVisible: true,
    isDisabled: false,
    isAuthenticated: true,
    isGuest: false,
    user: { id: userId },
    pageType: 'home',
    route: '/',
    attemptId: null,
    questionId: null,
});

describe('GlobalAssistantButton conversation continuity', () => {
  beforeEach(() => {
    assistantAvailability.current = createAvailability();
  });

  it('keeps the conversation id when the panel closes and opens again', () => {
    render(<GlobalAssistantButton />);

    fireEvent.click(screen.getByRole('button', { name: 'Mở trợ lý IELTS' }));
    fireEvent.click(screen.getByRole('button', { name: 'set conversation' }));
    expect(screen.getByTestId('conversation-id')).toHaveTextContent(
      '7df412d8-291e-4bf3-901e-ea927ecc1a29'
    );

    fireEvent.click(screen.getByRole('button', { name: 'close panel' }));
    expect(screen.getByTestId('assistant-panel-stub')).not.toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Mở trợ lý IELTS' }));
    expect(screen.getByTestId('assistant-panel-stub')).toBeVisible();
    expect(screen.getByTestId('conversation-id')).toHaveTextContent(
      '7df412d8-291e-4bf3-901e-ea927ecc1a29'
    );
  });

  it('remounts panel-local history state when the authenticated owner changes', () => {
    const { rerender } = render(<GlobalAssistantButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Mở trợ lý IELTS' }));
    expect(screen.getByTestId('panel-owner')).toHaveTextContent('user-1');

    assistantAvailability.current = createAvailability('user-2');
    rerender(<GlobalAssistantButton />);

    expect(screen.getByTestId('panel-owner')).toHaveTextContent('user-2');
    expect(screen.getByTestId('conversation-id')).toHaveTextContent('none');
  });
});
