import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../src/services/api';
import assistantApi from '../../src/features/global-assistant/services/assistantApi';

vi.mock('../../src/services/api', () => ({
  default: {
    defaults: { baseURL: '/api/v1' },
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('Assistant API conversation continuity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('sends the canonical conversationId on the next chat request', async () => {
    const conversationId = '7df412d8-291e-4bf3-901e-ea927ecc1a29';
    api.post.mockResolvedValue({ data: { answer: 'ok', conversationId } });

    await assistantApi.sendChat({
      message: 'chào bạn',
      context: { pageType: 'home' },
      conversationId,
    });

    expect(api.post).toHaveBeenCalledWith('/assistant/chat', {
      message: 'chào bạn',
      context: { pageType: 'home' },
      conversationId,
    });
  });

  it('loads history for the same conversation when an id is available', async () => {
    const conversationId = '7df412d8-291e-4bf3-901e-ea927ecc1a29';
    api.get.mockResolvedValue({ data: { history: [], conversationId } });

    await assistantApi.getHistory({ conversationId });

    expect(api.get).toHaveBeenCalledWith('/assistant/history', {
      params: { conversationId },
    });
  });

  it('parses a final SSE frame even when the stream ends without a blank line', async () => {
    const final = {
      answer: 'Đã nhớ ngữ cảnh.',
      conversationId: '7df412d8-291e-4bf3-901e-ea927ecc1a29',
    };
    const bytes = new TextEncoder().encode(
      `event: assistant.done\ndata: ${JSON.stringify(final)}`
    );
    const read = vi.fn()
      .mockResolvedValueOnce({ value: bytes, done: false })
      .mockResolvedValueOnce({ value: undefined, done: true });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => ({ read }) },
    }));
    const onDone = vi.fn();
    const onError = vi.fn();

    const result = await assistantApi.streamChat({
      message: 'kết hợp hai cái này',
      context: { pageType: 'home' },
      onDone,
      onError,
    });

    expect(result).toEqual(final);
    expect(onDone).toHaveBeenCalledWith(final);
    expect(onError).not.toHaveBeenCalled();
  });
});
