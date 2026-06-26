const { ASSISTANT_INTENTS } = require('../../../src/api/assistant/assistant.intent');
const { buildSystemPrompt } = require('../../../src/api/assistant/assistant.prompts');

describe('Assistant prompts', () => {
  it('uses IELTS expert prompt for IELTS_KNOWLEDGE', () => {
    const prompt = buildSystemPrompt(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);

    expect(prompt).toContain('IELTS Expert Assistant');
    expect(prompt).toContain('Giải thích ngữ pháp');
    expect(prompt).toContain('Dự đoán band score');
    expect(prompt).toContain('Return JSON only');
  });
});
