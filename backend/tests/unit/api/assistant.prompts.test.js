const { ASSISTANT_INTENTS } = require('../../../src/api/assistant/assistant.intent');
const {
  buildSystemPrompt,
  buildUserPrompt,
} = require('../../../src/api/assistant/assistant.prompts');

describe('Assistant prompts', () => {
  it('uses IELTS and English-learning prompt for IELTS_KNOWLEDGE', () => {
    const prompt = buildSystemPrompt(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);

    expect(prompt).toContain('IELTS and English learning assistant');
    expect(prompt).toContain('recent conversation');
    expect(prompt).toContain('Writing Task 2 outline');
    expect(prompt).toContain('translation requests');
    expect(prompt).toContain('Return JSON only');
  });

  it('injects recent conversation into the user prompt', () => {
    const prompt = buildUserPrompt({
      message: 'lap cho toi dan y cua writing part 2',
      contextInjection: {
        mode: ASSISTANT_INTENTS.IELTS_KNOWLEDGE,
        sessionMemory: [
          { role: 'user', content: 'tip hoc ielts the nao' },
          { role: 'assistant', content: 'De hoc IELTS hieu qua...' },
        ],
        databaseResults: [],
      },
    });

    expect(prompt).toContain('Recent conversation:');
    expect(prompt).toContain('User: tip hoc ielts the nao');
    expect(prompt).toContain('Assistant: De hoc IELTS hieu qua');
    expect(prompt).toContain('Student question:');
  });
});
