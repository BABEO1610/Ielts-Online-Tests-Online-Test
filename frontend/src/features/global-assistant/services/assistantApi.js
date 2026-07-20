import api from '../../../services/api';

const DEFAULT_ERROR = {
  answer: null,
  suggestedLinks: [],
  linkMeta: null,
  grounding: null,
  safety: null,
  needsMoreContext: false,
  conversationId: null,
  code: 'INTERNAL_ERROR',
  message: 'Trợ lý IELTS đang gặp lỗi. Vui lòng thử lại sau.',
};

const normalizeAssistantError = (error) => {
  const data = error.response?.data;

  if (data?.code) {
    return {
      answer: null,
      suggestedLinks: data.suggestedLinks || [],
      linkMeta: data.linkMeta || null,
      grounding: data.grounding || null,
      safety: data.safety || null,
      needsMoreContext: Boolean(data.needsMoreContext),
      conversationId: null,
      code: data.code,
      message: data.message || DEFAULT_ERROR.message,
    };
  }

  if (data?.error?.code) {
    return {
      ...DEFAULT_ERROR,
      code: data.error.code,
      message: data.error.message || DEFAULT_ERROR.message,
    };
  }

  return {
    ...DEFAULT_ERROR,
    message: error.message || DEFAULT_ERROR.message,
  };
};

const getApiUrl = (path) => `${api.defaults.baseURL}${path}`;

const parseSsePayload = (chunk) => {
  const eventMatch = chunk.match(/^event:\s*(.+)$/m);
  const dataMatch = chunk.match(/^data:\s*(.+)$/m);

  if (!eventMatch || !dataMatch) return null;

  try {
    return {
      event: eventMatch[1].trim(),
      data: JSON.parse(dataMatch[1]),
    };
  } catch {
    return null;
  }
};

export const assistantApi = {
  sendChat: async ({ message, context, conversationId = null }) => {
    try {
      const response = await api.post('/assistant/chat', { message, context, conversationId });
      return response.data;
    } catch (error) {
      return normalizeAssistantError(error);
    }
  },

  streamChat: async ({ message, context, conversationId = null, onStart, onDelta, onDone, onError }) => {
    try {
      const response = await fetch(getApiUrl('/assistant/chat/stream'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, context, conversationId }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        const error = data?.code
          ? { answer: null, suggestedLinks: [], linkMeta: null, grounding: null, safety: null, needsMoreContext: false, conversationId: null, code: data.code, message: data.message }
          : DEFAULT_ERROR;
        onError?.(error);
        return error;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult = null;
      const handleSsePayload = (payload) => {
        if (!payload) return;
        const { event, data } = payload;
        if (event === 'assistant.start') onStart?.(data);
        if (event === 'assistant.delta') onDelta?.(data.delta || '');
        if (event === 'assistant.done') {
          finalResult = data;
          onDone?.(data);
        }
        if (event === 'assistant.error') {
          finalResult = data;
          onError?.(data);
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          buffer += decoder.decode();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() || '';

        chunks.map(parseSsePayload).forEach(handleSsePayload);
      }

      if (buffer.trim()) handleSsePayload(parseSsePayload(buffer));
      if (finalResult) return finalResult;

      const incompleteStreamError = { ...DEFAULT_ERROR };
      onError?.(incompleteStreamError);
      return incompleteStreamError;
    } catch (error) {
      const normalized = normalizeAssistantError(error);
      onError?.(normalized);
      return normalized;
    }
  },

  rateMessage: async ({ messageId, rating, reason = null }) => {
    try {
      const response = await api.post(`/assistant/messages/${messageId}/rating`, { rating, reason });
      return response.data;
    } catch (error) {
      return normalizeAssistantError(error);
    }
  },

  getHistory: async ({ conversationId = null } = {}) => {
    try {
      const response = await api.get('/assistant/history', {
        params: conversationId ? { conversationId } : undefined,
      });
      return response.data;
    } catch (error) {
      return normalizeAssistantError(error);
    }
  },
};

export default assistantApi;
