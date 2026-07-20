const { validateChatPayload } = require('../../../src/api/assistant/assistant.validation');
const { ERROR_CODES } = require('../../../src/api/assistant/assistant.constants');

describe('Assistant validation', () => {
  it('accepts a valid chat payload', () => {
    const result = validateChatPayload({
      message: 'Co lesson Listening level beginner khong?',
      context: {
        pageType: 'home',
        attemptId: null,
        questionId: null,
      },
    });

    expect(result.error).toBeNull();
    expect(result.value.message).toBe('Co lesson Listening level beginner khong?');
  });

  it('accepts library page context with route and visibleItems', () => {
    const result = validateChatPayload({
      message: 'co de tam trong thu vien khong',
      context: {
        pageType: 'library',
        route: '/library',
        attemptId: null,
        questionId: null,
        visibleItems: [{ id: 'res-1', title: 'tam', type: 'audio', route: '/library' }],
      },
    });

    expect(result.error).toBeNull();
    expect(result.value.context.visibleItems[0].title).toBe('tam');
  });

  it('accepts a canonical conversationId and normalizes it for the service', () => {
    const conversationId = '7df412d8-291e-4bf3-901e-ea927ecc1a29';
    const result = validateChatPayload({
      message: 'chào bạn',
      conversationId,
      context: { pageType: 'home' },
    });

    expect(result.error).toBeNull();
    expect(result.value.sessionId).toBe(conversationId);
  });

  it('rejects a malformed conversationId', () => {
    const result = validateChatPayload({
      message: 'chào bạn',
      conversationId: 'not-a-uuid',
      context: { pageType: 'home' },
    });

    expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
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
