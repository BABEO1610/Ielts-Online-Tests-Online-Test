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

  it('blocks band score claims', () => {
    const result = selfCheckResponse({
      response: {
        answer: 'Bài này khoảng band 7.0.',
        suggestedLinks: [],
      },
      contextInjection: {
        mode: ASSISTANT_INTENTS.GENERAL_STUDY_TIPS,
        databaseResults: [{ type: 'study_tip' }],
      },
    });

    expect(result.answer).toBe(ERROR_MESSAGES[ERROR_CODES.OUT_OF_SCOPE]);
    expect(result.safety.outOfScope).toBe(true);
  });
});
