const { ASSISTANT_INTENTS, detectIntent } = require('../../../src/api/assistant/assistant.intent');

describe('Assistant intent router', () => {
  it('routes greeting without database lookup intent', () => {
    const intent = detectIntent({
      message: 'Chào bạn',
      context: { pageType: 'home' },
    });

    expect(intent).toBe(ASSISTANT_INTENTS.GREETING);
  });

  it('routes reading environment query to FIND_TEST', () => {
    const intent = detectIntent({
      message: 'Có đề Reading về Environment không?',
      context: { pageType: 'home' },
    });

    expect(intent).toBe(ASSISTANT_INTENTS.FIND_TEST);
  });

  it('routes lesson query to FIND_LESSON', () => {
    const intent = detectIntent({
      message: 'Có lesson Listening beginner không?',
      context: { pageType: 'lesson' },
    });

    expect(intent).toBe(ASSISTANT_INTENTS.FIND_LESSON);
  });

  it('routes review question with attempt context to POST_TEST_REVIEW', () => {
    const intent = detectIntent({
      message: 'Vì sao câu 5 đáp án là B?',
      context: { pageType: 'review', attemptId: 'attempt-1' },
    });

    expect(intent).toBe(ASSISTANT_INTENTS.POST_TEST_REVIEW);
  });

  it('routes unrelated topics to OUT_OF_SCOPE', () => {
    const intent = detectIntent({
      message: 'Giá Bitcoin hôm nay thế nào?',
      context: { pageType: 'home' },
    });

    expect(intent).toBe(ASSISTANT_INTENTS.OUT_OF_SCOPE);
  });
});
