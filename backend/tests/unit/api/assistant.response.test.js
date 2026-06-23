const { normalizeAssistantResponse } = require('../../../src/api/assistant/assistant.response');
const { ASSISTANT_INTENTS } = require('../../../src/api/assistant/assistant.intent');

describe('Assistant response normalization', () => {
  it('parses JSON contract output', () => {
    const result = normalizeAssistantResponse({
      rawText: JSON.stringify({
        answer: 'Bạn có thể thử Test A.',
        suggestedLinks: [{ label: 'Test A', href: '/tests/a' }],
        usedDatabase: true,
        needsMoreContext: false,
        safety: { inventedContent: false },
      }),
      mode: ASSISTANT_INTENTS.FIND_TEST,
      fallbackAnswer: 'fallback',
    });

    expect(result.answer).toBe('Bạn có thể thử Test A.');
    expect(result.suggestedLinks).toEqual([{ label: 'Test A', href: '/tests/a' }]);
    expect(result.usedDatabase).toBe(true);
  });

  it('falls back for malformed strict-mode output', () => {
    const result = normalizeAssistantResponse({
      rawText: 'Có một đề tự bịa ở đây',
      mode: ASSISTANT_INTENTS.FIND_TEST,
      fallbackAnswer: 'Không có dữ liệu.',
    });

    expect(result.answer).toBe('Không có dữ liệu.');
    expect(result.needsMoreContext).toBe(true);
  });

  it('allows plain text for streaming output when explicitly enabled', () => {
    const result = normalizeAssistantResponse({
      rawText: 'Bạn có thể thử Test A.',
      mode: ASSISTANT_INTENTS.FIND_TEST,
      fallbackAnswer: 'Không có dữ liệu.',
      allowPlainText: true,
    });

    expect(result.answer).toBe('Bạn có thể thử Test A.');
  });
});
