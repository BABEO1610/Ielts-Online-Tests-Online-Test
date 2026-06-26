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

  it('routes library test listing query to FIND_TEST before navigation', () => {
    const intent = detectIntent({
      message: 'thu vien de co nhung bai nao?',
      context: { pageType: 'home' },
    });

    expect(intent).toBe(ASSISTANT_INTENTS.FIND_TEST);
  });

  it('routes library resource title query to FIND_LESSON on library page', () => {
    const intent = detectIntent({
      message: 'co de tam trong thu vien khong',
      context: { pageType: 'library' },
    });

    expect(intent).toBe(ASSISTANT_INTENTS.FIND_LESSON);
  });

  it('routes library audio resource query to FIND_LESSON', () => {
    const intent = detectIntent({
      message: 'thu vien co tai lieu audio nao',
      context: { pageType: 'library' },
    });

    expect(intent).toBe(ASSISTANT_INTENTS.FIND_LESSON);
  });

  it('routes Cambridge reading test query to FIND_TEST', () => {
    const intent = detectIntent({
      message: 'co de reading Cambridge 18 khong',
      context: { pageType: 'home' },
    });

    expect(intent).toBe(ASSISTANT_INTENTS.FIND_TEST);
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

  it('routes IELTS concept questions to IELTS_KNOWLEDGE', () => {
    const intent = detectIntent({
      message: 'Cohesion và coherence khác nhau thế nào?',
      context: { pageType: 'lesson' },
    });

    expect(intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
  });

  it('routes paraphrase requests to IELTS_KNOWLEDGE', () => {
    const intent = detectIntent({
      message: 'Paraphrase câu này: people are living longer',
      context: { pageType: 'lesson' },
    });

    expect(intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
  });

  it('routes general band criteria questions to IELTS_KNOWLEDGE', () => {
    const intent = detectIntent({
      message: 'Band 7 Writing cần gì?',
      context: { pageType: 'lesson' },
    });

    expect(intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
  });

  it('routes IELTS writing word-count questions to IELTS_KNOWLEDGE', () => {
    const intent = detectIntent({
      message: 'IELTS Writing Task 2 nen viet bao nhieu tu?',
      context: { pageType: 'lesson' },
    });

    expect(intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
  });

  it('routes grading band requests to safe grading feedback', () => {
    const intent = detectIntent({
      message: 'cham bai nay band may',
      context: { pageType: 'home' },
    });

    expect(intent).toBe(ASSISTANT_INTENTS.GRADING_REQUEST_SAFE_FEEDBACK);
  });
});
