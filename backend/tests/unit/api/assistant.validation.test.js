const { validateChatPayload } = require('../../../src/api/assistant/assistant.validation');
const { ERROR_CODES } = require('../../../src/api/assistant/assistant.constants');

describe('Assistant validation', () => {
  it('accepts a valid chat payload', () => {
    const result = validateChatPayload({
      message: 'Có lesson Listening level beginner không?',
      context: {
        pageType: 'home',
        attemptId: null,
        questionId: null,
      },
    });

    expect(result.error).toBeNull();
    expect(result.value.message).toBe('Có lesson Listening level beginner không?');
  });

  it('rejects empty message', () => {
    const result = validateChatPayload({
      message: '   ',
      context: {
        pageType: 'home',
        attemptId: null,
        questionId: null,
      },
    });

    expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
  });

  it('rejects unsupported pageType', () => {
    const result = validateChatPayload({
      message: 'Hello',
      context: {
        pageType: 'checkout',
        attemptId: null,
        questionId: null,
      },
    });

    expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
  });
});
