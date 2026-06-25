const { selfCheckResponse, MISSING_DATA_MESSAGE } = require('../../../src/api/assistant/assistant.selfcheck');
const { ASSISTANT_INTENTS } = require('../../../src/api/assistant/assistant.intent');
const { ERROR_MESSAGES, ERROR_CODES } = require('../../../src/api/assistant/assistant.constants');

describe('Assistant self-check', () => {
  it('prevents FIND_TEST from claiming results when databaseResults is empty', () => {
    const result = selfCheckResponse({
      response: {
        answer: 'Có đề Reading Environment số 1.',
        suggestedLinks: [],
      },
      contextInjection: {
        mode: ASSISTANT_INTENTS.FIND_TEST,
        databaseResults: [],
      },
    });

    expect(result.answer).toBe(MISSING_DATA_MESSAGE);
    expect(result.needsMoreContext).toBe(true);
  });

  it('allows general band criteria explanations for IELTS_KNOWLEDGE', () => {
    const result = selfCheckResponse({
      response: {
        answer: 'Band 7 Writing thường cần lập trường rõ, đoạn văn logic, từ vựng linh hoạt và ngữ pháp đa số chính xác.',
        suggestedLinks: [],
      },
      contextInjection: {
        mode: ASSISTANT_INTENTS.IELTS_KNOWLEDGE,
        databaseResults: [],
      },
    });

    expect(result.answer).toContain('Band 7 Writing');
    expect(result.safety?.outOfScope).not.toBe(true);
  });

  it('blocks band score predictions for user work', () => {
    const result = selfCheckResponse({
      response: {
        answer: 'Bài essay của bạn là band 7.0.',
        suggestedLinks: [],
      },
      contextInjection: {
        mode: ASSISTANT_INTENTS.IELTS_KNOWLEDGE,
        databaseResults: [],
      },
    });

    expect(result.answer).toBe(ERROR_MESSAGES[ERROR_CODES.OUT_OF_SCOPE]);
    expect(result.safety.outOfScope).toBe(true);
    expect(result.safety.containsBandScore).toBe(true);
  });
});
